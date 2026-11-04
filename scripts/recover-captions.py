"""Recover existing canonical captions by matching audio, never guessed timestamps.

Matches three independent speech windows of each existing production clip to
each chapter. Only accepts an unchanged clock with strong normalized correlation.
Uncovered speech remains an explicit review item.
"""
import pathlib, json, subprocess, os, re, hashlib
os.environ.update(OMP_NUM_THREADS='2',OPENBLAS_NUM_THREADS='2',MKL_NUM_THREADS='2')
import numpy as np
from scipy.signal import fftconvolve
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=ROOT/'.local'/'caption-recovery';OUT.mkdir(parents=True,exist_ok=True)
FF=os.environ.get('FFMPEG',r'C:\Users\Woon\anaconda3\Library\bin\ffmpeg.exe');RATE=1000
sources=json.loads((ROOT/'.local/media-audit/sources.json').read_text())
def audio(p):
 return np.frombuffer(subprocess.check_output([FF,'-v','error','-i',str(p),'-vn','-ar',str(RATE),'-ac','1','-f','f32le','-']),dtype=np.float32).copy()
chapters=[audio(s['sourcePath']) for s in sources]
bases=[pathlib.Path(r'C:\Users\Woon\Videos'),ROOT.parent]
clips=[]
for b in bases:
 for f in b.glob('YouTube*/*.mp4'):
  srts=list(f.parent.glob('*.srt'))
  if not srts:continue
  if f.stem.startswith('Gmsh_CalculiX_Workflow'):continue # superseded by Professional
  clips.append((f,srts[0]))
for key in ['110159','110941','130515']:
 d=pathlib.Path(r'C:\Users\Woon\AppData\Local\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Local\LectureVoice\deepseek2\recordings')/key/'pro-01/delivery'
 for f in d.glob('*.mp4'):
  srts=list(d.glob('*.srt'))
  if srts:clips.append((f,srts[0]))
d=ROOT.parent/'Ubuntu-FEM-Installation-2026-11-02'
clips.append((d/'Ubuntu_FEM_Installation_1080p30.mp4',d/'Ubuntu_FEM_Install.srt'))
for index,dname in [(5,'YouTube-2026-11-04-150551'),(7,'YouTube-2026-11-04-135645')]:
 d=pathlib.Path(r'C:\Users\Woon\Videos')/dname
 clips.append((pathlib.Path(sources[index]['sourcePath']),next(d.glob('*.srt'))))
def peak(x,template):
 y=template.astype(np.float64);y-=y.mean();n=len(y)
 dot=fftconvolve(x,y[::-1],mode='valid'); sums=np.r_[0,np.cumsum(x,dtype=np.float64)];sq=np.r_[0,np.cumsum(x*x,dtype=np.float64)]
 var=np.maximum(sq[n:]-sq[:-n]-(sums[n:]-sums[:-n])**2/n,1e-12)
 scores=dot/np.sqrt(var*np.sum(y*y));i=int(np.argmax(scores));return i/RATE,float(scores[i])
matches=[]
for f,srt in clips:
 y=audio(f);duration=len(y)/RATE
 # Select speech-containing windows by energy within each third.
 times=[]
 for a,b in [(2,duration/3-5),(duration/3,2*duration/3-5),(2*duration/3,duration-6)]:
  candidates=np.arange(max(0,a),max(a+1,b),1)
  times.append(float(max(candidates,key=lambda t:np.std(y[int(t*RATE):int((t+5)*RATE)]))))
 for ci,x in enumerate(chapters):
  peaks=[peak(x,y[int(t*RATE):int((t+5)*RATE)]) for t in times]
  offsets=[p[0]-t for p,t in zip(peaks,times)];spread=max(offsets)-min(offsets)
  if min(p[1] for p in peaks)>.72 and spread<.065:
   m={'clip':str(f),'srt':str(srt),'chapter':ci,'offset':float(np.median(offsets)),'maxClockDifferenceSeconds':spread,'probes':[{'sourceTime':t,'chapterTime':p[0],'correlation':p[1]}for t,p in zip(times,peaks)]};matches.append(m);print(ci+1,f.stem,round(m['offset'],3),round(min(p[1]for p in peaks),3),flush=True)
def seconds(t):
 h,m,s=t.replace(',','.').split(':');return int(h)*3600+int(m)*60+float(s)
def parse(p):
 text=pathlib.Path(p).read_text(encoding='utf-8-sig');out=[]
 for block in re.split(r'\n\s*\n',text.strip()):
  lines=block.splitlines();ti=next((i for i,l in enumerate(lines)if '-->'in l),None)
  if ti is None:continue
  a,b=lines[ti].split('-->');out.append({'start':seconds(a.strip()),'end':seconds(b.strip()),'text':'\n'.join(lines[ti+1:])})
 return out
result=[]
for ci,s in enumerate(sources):
 cues=[]
 for m in matches:
  if m['chapter']==ci:
   for c in parse(m['srt']):cues.append({**c,'start':c['start']+m['offset'],'end':c['end']+m['offset'],'origin':pathlib.Path(m['srt']).name})
 cues.sort(key=lambda c:c['start']);duration=float(s['probe']['streams'][0]['duration']);coverage=sum(c['end']-c['start']for c in cues)/duration
 result.append({'chapter':ci,'filename':s['filename'],'duration':duration,'captionTimeCoverage':coverage,'cues':cues,'status':'audio-matched canonical captions; uncovered speech requires review'})
(OUT/'matches.json').write_text(json.dumps(matches,indent=2));(OUT/'captions.json').write_text(json.dumps(result,indent=2))
print('COVERAGE',[(r['chapter']+1,round(r['captionTimeCoverage'],3))for r in result],flush=True)
