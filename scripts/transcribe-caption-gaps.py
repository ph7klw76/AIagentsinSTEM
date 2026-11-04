"""Offline ASR only for speech not covered by recovered canonical captions."""
import pathlib,json,subprocess,os
os.environ.update(HF_HUB_OFFLINE='1',TRANSFORMERS_OFFLINE='1',HF_HUB_DISABLE_TELEMETRY='1',OMP_NUM_THREADS='2',MKL_NUM_THREADS='2')
from faster_whisper import WhisperModel
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[1]
sources=json.loads((ROOT/'.local/media-audit/sources.json').read_text())
rows=json.loads((ROOT/'.local/caption-recovery/captions.json').read_text())
model=WhisperModel(str(ROOT.parent/'voice-studio/models/whisper-small-en'),device='cpu',compute_type='int8',cpu_threads=2,local_files_only=True)
FF=r'C:\Users\Woon\anaconda3\Library\bin\ffmpeg.exe'
for row in rows:
 gaps=[];last=0
 for c in row['cues']:
  if c['start']-last>5:gaps.append((last,c['start']))
  last=max(last,c['end'])
 if row['duration']-last>5:gaps.append((last,row['duration']))
 for gi,(a,b) in enumerate(gaps):
  fn=ROOT/'.local/caption-recovery'/f'gap-{row["chapter"]+1:02}-{gi}.wav'
  subprocess.run([FF,'-v','error','-ss',str(a),'-i',sources[row['chapter']]['sourcePath'],'-t',str(b-a),'-ar','16000','-ac','1','-y',str(fn)],check=True)
  samples=np.frombuffer(subprocess.check_output([FF,'-v','error','-i',str(fn),'-ar','16000','-ac','1','-f','f32le','-']),dtype=np.float32).copy()
  segments,info=model.transcribe(samples,language='en',beam_size=5,word_timestamps=True,vad_filter=False,condition_on_previous_text=False,initial_prompt='Scientific computing: Gmsh, CalculiX, OpenCode, ORCA, KiCad, ngspice, GROMACS, SKILL.md, MCP, bilayer.')
  cues=[]
  for s in segments:
   words=s.words or [];group=[]
   for w in words:
    group.append(w)
    if len(group)>=8 or w.word.strip().endswith(('.', '?','!')):
     cues.append({'start':a+group[0].start,'end':a+group[-1].end,'text':''.join(x.word for x in group).strip(),'origin':'offline-whisper-small-en; review required'});group=[]
   if group:cues.append({'start':a+group[0].start,'end':a+group[-1].end,'text':''.join(x.word for x in group).strip(),'origin':'offline-whisper-small-en; review required'})
  row['cues']+=cues
  print(row['chapter']+1,round(a,2),round(b,2),' '.join(c['text']for c in cues),flush=True)
 row['cues'].sort(key=lambda c:c['start'])
 (ROOT/'.local/caption-recovery/with-asr-gaps.json').write_text(json.dumps(rows,indent=2),encoding='utf8')
