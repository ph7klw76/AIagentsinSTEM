"""Verify final decoded frames and unchanged audio/video clock against masters."""
import pathlib,subprocess,json,os,hashlib,datetime
os.environ.update(OMP_NUM_THREADS='2',OPENBLAS_NUM_THREADS='2',MKL_NUM_THREADS='2')
import numpy as np
from scipy.signal import correlate,correlation_lags
R=pathlib.Path(__file__).resolve().parents[1];FF=os.environ.get('FFMPEG',r'C:\Users\Woon\anaconda3\Library\bin\ffmpeg.exe')
cfg=json.loads((R/'course.config.json').read_text());srcs=json.loads((R/'.local/media-audit/sources.json').read_text());reports=[]
def audio(f,t):return np.frombuffer(subprocess.check_output([FF,'-v','error','-ss',str(t),'-i',str(f),'-t','3','-vn','-ar','16000','-ac','1','-f','f32le','-']),dtype=np.float32).copy()
def picture(f,t):return subprocess.check_output([FF,'-v','error','-ss',str(t),'-i',str(f),'-map','0:v:0','-an','-frames:v','1','-pix_fmt','rgb24','-f','hash','-hash','sha256','-']).decode().strip()
for l,s in zip(cfg['lessons'],srcs):
 d=R/f'.local/upload-kit/lesson-{l["id"]}';mp4=d/f'AIagentsSTEM_{l["id"]}_1080p30_v03.mp4';wav=d/f'AIagentsSTEM_{l["id"]}_narration_48k24.wav'
 cues=json.loads((R/f'content/captions/lesson-{l["id"]}.json').read_text());anchors=[max(0,cues[int((len(cues)-1)*p)]['start']-.25)for p in [.1,.5,.85]];alignment=[]
 for t in anchors:
  a,b=audio(wav,t),audio(mp4,t);n=min(len(a),len(b));a=a[:n]-a[:n].mean();b=b[:n]-b[:n].mean();assert np.std(a)>.001
  cc=correlate(b,a,method='fft');lags=correlation_lags(len(b),len(a));mask=np.abs(lags)<=1600;imax=np.argmax(cc[mask]);lag=int(lags[mask][imax]);similarity=float(cc[mask][imax]/np.sqrt(np.sum(a*a)*np.sum(b*b)))
  assert abs(lag/16)<=5 and similarity>.98,(l['id'],t,lag,similarity)
  alignment.append({'timeSeconds':t,'lagMs':lag/16,'normalizedCorrelation':similarity,'sampleRate':16000})
 images=[]
 for label,t in [('opening',8),('review',l['question']['review']),('checkpoint',l['question']['time']),('closing',l['frames']/30-8)]:
  original,final=picture(s['sourcePath'],t),picture(mp4,t);assert original==final,(l['id'],label)
  images.append({'event':label,'timeSeconds':t,'decodedRgbSha256':final.split('=')[-1],'matchesOriginal':True})
 p=subprocess.run([FF,'-v','error','-xerror','-progress','pipe:1','-i',str(mp4),'-map','0:v:0','-map','0:a:0','-f','null','-'],capture_output=True,text=True)
 assert p.returncode==0 and not p.stderr.strip(),p.stderr
 frames=[int(line.split('=')[1])for line in p.stdout.splitlines()if line.startswith('frame=')];assert frames[-1]==l['frames']
 with pathlib.Path(s['sourcePath']).open('rb')as h:assert hashlib.file_digest(h,'sha256').hexdigest()==s['sha256']
 r={'lesson':l['id'],'status':'pass','finalFile':mp4.name,'sourceSha256':s['sha256'],'decodedFrames':frames[-1],'fullAudioVideoDecode':'pass; no errors','audioAlignment':alignment,'criticalVisualEvents':images,'originalUnchanged':True,'mediaTimeDeltaSeconds':0,'newQuestions':{'id':l['question']['id'],'time':l['question']['time'],'review':l['question']['review'],'previousSchedule':None,'delta':None,'note':'Newly authored checkpoint; no previous H5P schedule existed in the empty repository.'}}
 reports.append(r);(R/'evidence/media-synchronization.json').write_text(json.dumps({'timestamp':datetime.datetime.now(datetime.timezone.utc).isoformat(),'context':'finished local v03 editions, not YouTube streaming','method':'independent decoded AAC/WAV correlation; exact RGB checks at four events; full decode frame counter','results':reports},indent=2)+'\n');print('SYNC_PASS',l['id'],frames[-1],[x['lagMs']for x in alignment],flush=True)
