import json,pathlib,re
R=pathlib.Path(__file__).resolve().parents[1]
rows=json.loads((R/'.local/caption-recovery/with-asr-gaps.json').read_text())
config=json.loads((R/'course.config.json').read_text());out=R/'content/captions';out.mkdir(parents=True,exist_ok=True)
corrections={'DeepSig':'DeepSeek','The working look':'The working loop','The references for the host focus supporting knowledge.':'The references folder holds focused supporting knowledge.','The access folder':'The assets folder','OCCAR':'ORCA','500 PS':'500 ps','the connect interface':'the Konnect interface','open do':'Ubuntu','open code':'OpenCode','deep seek':'DeepSeek','before proceed.':'before proceeding.'}
def stamp(t,sep=','):
 ms=max(0,round(t*1000));h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000);return f'{h:02}:{m:02}:{s:02}{sep}{ms:03}'
report=[]
for l,r in zip(config['lessons'],rows):
 cues=[];asr=0;adjustments=[]
 for raw in r['cues']:
  c=dict(raw);c['start']=max(0,c['start']);c['end']=min(l['frames']/30,c['end'])
  if c['end']<=c['start']:continue
  if 'whisper' in c['origin']:
   asr+=1
   for a,b in corrections.items():
    if a in c['text']:c['text']=c['text'].replace(a,b);adjustments.append({'from':a,'to':b})
  # Transitions can overlap source tails. Clip a cue only at the next observed cue start.
  if cues and cues[-1]['end']>c['start']:
   cues[-1]['end']=c['start'];adjustments.append({'boundary':'trim previous cue to next observed start','time':c['start']})
  cues.append(c)
 cues=[c for c in cues if c['end']-c['start']>=.05]
 for ext,sep in [('srt',','),('vtt','.')]:
  text=('WEBVTT\n\n'if ext=='vtt'else'')+'\n\n'.join(f'{i}\n{stamp(c["start"],sep)} --> {stamp(c["end"],sep)}\n{c["text"]}'for i,c in enumerate(cues,1))+'\n'
  (out/f'lesson-{l["id"]}.{ext}').write_text(text,encoding='utf8')
 (out/f'lesson-{l["id"]}.json').write_text(json.dumps(cues,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 report.append({'lesson':l['id'],'cues':len(cues),'canonicalAudioMatchedCues':len(cues)-asr,'asrGapCues':asr,'textCorrections':adjustments,'method':'canonical existing captions with three-window acoustic clock matching; offline Whisper small.en for uncovered speech','timing':'acoustic; no evenly distributed word estimates','perceptualListeningReview':'not performed; ASR gap wording remains a targeted review item'})
(R/'evidence').mkdir(exist_ok=True)
(R/'evidence/caption-provenance.json').write_text(json.dumps(report,indent=2)+'\n')
print([(x['lesson'],x['cues'],x['asrGapCues'])for x in report])
