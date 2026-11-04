"""Timing-preserving local remux and measured narration master. No upload.

Picture is stream-copied from the user's chapter master. No image generation,
voice synthesis or new lip inference is performed. PCM is derived from the best
available complete chapter track (AAC), not a recovered studio recording.
"""
import pathlib,json,subprocess,os,hashlib,datetime,math,csv
ROOT=pathlib.Path(__file__).resolve().parents[1]
FF=os.environ.get('FFMPEG',r'C:\Users\Woon\anaconda3\Library\bin\ffmpeg.exe');FP=os.environ.get('FFPROBE',str(pathlib.Path(FF).with_name('ffprobe.exe')))
config=json.loads((ROOT/'course.config.json').read_text());sources=json.loads((ROOT/'.local/media-audit/sources.json').read_text())
OUT=ROOT/'.local/upload-kit';OUT.mkdir(parents=True,exist_ok=True)
def run(args,log):
 p=subprocess.run([FF,'-hide_banner',*map(str,args)],capture_output=True,text=True,encoding='utf8',errors='replace');log.write_text(p.stdout+p.stderr,encoding='utf8')
 if p.returncode:raise RuntimeError(p.stderr[-2000:])
 return p.stderr
def measure(f,log):
 text=run(['-i',f,'-vn','-af','loudnorm=I=-16:TP=-2:LRA=11:print_format=json','-f','null','-'],log)
 return json.loads(text[text.rfind('{'):text.rfind('}')+1])
def hashfile(f):
 with f.open('rb')as h:return hashlib.file_digest(h,'sha256').hexdigest()
reports=[]
for lesson,source in zip(config['lessons'],sources):
 d=OUT/f'lesson-{lesson["id"]}';d.mkdir(exist_ok=True);src=pathlib.Path(source['sourcePath']);duration=lesson['frames']/30
 mp4=d/f'AIagentsSTEM_{lesson["id"]}_1080p30_v03.mp4';wav=d/f'AIagentsSTEM_{lesson["id"]}_narration_48k24.wav'
 before=measure(src,d/'source-loudness.log')
 # Gain is bounded by true-peak headroom. No dynamic time processing.
 gain=min(-16-float(before['input_i']),-2.0-float(before['input_tp']))
 if not wav.exists():run(['-i',src,'-vn','-af',f'volume={gain:.6f}dB,apad,atrim=duration={duration:.9f}','-ar','48000','-c:a','pcm_s24le',wav],d/'wav-master.log')
 chapters=lesson['chapters'];metadata=';FFMETADATA1\ntitle='+lesson['title']+'\n'
 for i,ch in enumerate(chapters):metadata+=f'\n[CHAPTER]\nTIMEBASE=1/1000\nSTART={round(ch["time"]*1000)}\nEND={round((chapters[i+1]["time"] if i+1<len(chapters)else duration)*1000)}\ntitle={ch["label"]}\n'
 (d/'chapters.ffmeta').write_text(metadata,encoding='utf8')
 if not mp4.exists():run(['-i',src,'-i',wav,'-i',d/'chapters.ffmeta','-map','0:v:0','-map','1:a:0','-map_metadata','2','-map_chapters','2','-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000','-t',f'{duration:.9f}','-movflags','+faststart',mp4],d/'delivery-mux-v03.log')
 after=measure(mp4,d/'aac-loudness.log')
 probe=json.loads(subprocess.check_output([FP,'-v','error','-show_format','-show_streams','-show_chapters','-of','json',str(mp4)]));v=next(s for s in probe['streams']if s['codec_type']=='video');a=next(s for s in probe['streams']if s['codec_type']=='audio')
 assert v['width']==1920 and v['height']==1080 and v['avg_frame_rate']=='30/1' and v['codec_name']=='h264' and a['codec_name']=='aac' and a['sample_rate']=='48000'
 assert int(v['nb_frames'])==lesson['frames']
 assert float(after['input_tp'])<=-1.0
 # Full decode fails on any decoding error, and captures decoded frame count.
 decode_log=run(['-v','error','-xerror','-i',mp4,'-map','0:v:0','-map','0:a:0','-f','null','-'],d/'full-decode-v03.log')
 assert not decode_log.strip(),decode_log
 # Exact final packet/picture samples at critical events, after mux.
 for label,t in [('opening',8),('review',lesson['question']['review']),('checkpoint',lesson['question']['time']),('closing',duration-8)]:
  if not (d/f'{label}-v03.jpg').exists():run(['-v','error','-ss',str(t),'-i',mp4,'-frames:v','1','-vf','scale=960:-1',d/f'{label}-v03.jpg'],d/f'{label}-frame-v03.log')
 if not (d/'thumbnail.jpg').exists():run(['-v','error','-ss','8','-i',mp4,'-frames:v','1','-vf','scale=1280:720',d/'thumbnail.jpg'],d/'thumbnail.log')
 import shutil
 for ext in ['srt','vtt']:shutil.copy2(ROOT/f'content/captions/lesson-{lesson["id"]}.{ext}',d/f'AIagentsSTEM_{lesson["id"]}.{ext}')
 def tc(t):s=int(t);return f'{s//60:02}:{s%60:02}'
 (d/'youtube-description.txt').write_text(lesson['title']+'\n\n'+lesson['outcome']+'\n\nCourse: https://ph7klw76.github.io/AIagentsinSTEM/\n\nCHAPTERS\n'+'\n'.join(tc(c['time'])+' '+c['label']for c in chapters)+'\n\nOriginal/rollback URL: https://youtu.be/'+lesson['originalYoutubeId']+'\n\nThis local edition preserves the original picture and timing, with a measured audio gain and downloadable captions. Narration in the existing production uses locally synthesized own-voice material; recorded demonstrations retain their source speech. No new voice or lip synthesis was performed for this edition. Scientific examples retain the limits stated in the video.\n\nUpload as a NEW YouTube video. Do not replace an ID in course.config.json until the actual new URL and playback are verified. Captions with ASR gap provenance need targeted wording/listening review before channel publication.\n',encoding='utf8')
 with (d/'youtube-quiz.csv').open('w',newline='',encoding='utf8')as h:
  w=csv.writer(h);w.writerow(['id','seconds','review_seconds','question','correct_answer','wrong_answer','feedback']);q=lesson['question'];w.writerow([q['id'],q['time'],q['review'],q['prompt'],q['answers'][0]['text'],q['answers'][1]['text'],q['answers'][1]['feedback']])
 r={'lesson':lesson['id'],'sourceFile':src.name,'sourceSha256':source['sha256'],'outputFile':mp4.name,'sha256':hashfile(mp4),'wavSha256':hashfile(wav),'durationSeconds':duration,'frames':v['nb_frames'],'fps':v['avg_frame_rate'],'dimensions':[v['width'],v['height']],'videoCodec':v['codec_name'],'audioCodec':a['codec_name'],'audioSampleRate':a['sample_rate'],'channels':a['channels'],'sourceLoudnessLUFS':before['input_i'],'gainDb':gain,'encodedLoudnessLUFS':after['input_i'],'encodedTruePeakDBTP':after['input_tp'],'colorTags':{k:v.get(k,'untagged')for k in ['color_range','color_space','color_primaries','color_transfer']},'fullDecode':'pass','picture':'stream-copy; no new render or visual edits','narrationMaster':'48 kHz 24-bit PCM from complete chapter AAC; source compression remains','chapters':probe['chapters'],'timestampChangesSeconds':0,'newYoutubeUrl':None,'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
 (d/'media-report.json').write_text(json.dumps(r,indent=2)+'\n');reports.append(r)
 (OUT/'media-reports.json').write_text(json.dumps(reports,indent=2)+'\n')
 print('VERIFIED',lesson['id'],duration,after['input_i'],'LUFS',after['input_tp'],'dBTP',flush=True)
