import pathlib,json,subprocess,re,os
R=pathlib.Path(__file__).resolve().parents[1];c=json.loads((R/'course.config.json').read_text());FF=os.environ.get('FFMPEG',r'C:\Users\Woon\anaconda3\Library\bin\ffmpeg.exe');out=[]
for l in c['lessons']:
 q=l['question']['time'];window=20 if l['id']=='05a'else 10;minimum=.35 if l['id']=='05a'else .65;f=R/f'.local/upload-kit/lesson-{l["id"]}/AIagentsSTEM_{l["id"]}_1080p30_v02.mp4'
 p=subprocess.run([FF,'-hide_banner','-ss',str(q-window),'-i',str(f),'-t',str(window*2),'-vn','-af',f'silencedetect=noise=-35dB:d={minimum}','-f','null','-'],capture_output=True,text=True)
 starts=[float(x)for x in re.findall(r'silence_start: ([0-9.]+)',p.stderr)];ends=[float(x)for x in re.findall(r'silence_end: ([0-9.]+)',p.stderr)]
 candidates=[]
 for a in starts:
  b=next((b for b in ends if b>a),None)
  if b is not None and b-a>=minimum and a>0:
   target=round((q-window+a+.12)*30)/30;candidates.append({'time':target,'silenceStart':q-window+a,'silenceEnd':q-window+b,'deltaFromDraft':target-q})
 nearest=min(candidates,key=lambda x:abs(x['deltaFromDraft']))if candidates else None
 out.append({'lesson':l['id'],'draftTime':q,'quietCandidate':nearest})
print(json.dumps(out,indent=2));(R/'.local/checkpoint-silence.json').write_text(json.dumps(out,indent=2)+'\n')
