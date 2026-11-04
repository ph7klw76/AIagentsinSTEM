"""One-time authoring revision based on measured quiet intervals; media uncut."""
import pathlib,json,datetime
R=pathlib.Path(__file__).resolve().parents[1];f=R/'course.config.json';c=json.loads(f.read_text());e=R/'evidence/authoring-timing-deltas.json'
if e.exists():raise RuntimeError('This one-time authoring revision was already applied')
proposals=json.loads((R/'.local/checkpoint-silence.json').read_text());changes=[]
for l,p in zip(c['lessons'],proposals):
 old=l['question']['time'];quiet=p['quietCandidate']
 if quiet:l['question']['time']=quiet['time']
 l['question']['frame']=round(l['question']['time']*30)
 changes.append({'lesson':l['id'],'draftQuestionSeconds':old,'finalQuestionSeconds':l['question']['time'],'deltaSeconds':l['question']['time']-old,'measuredQuietInterval':quiet,'mediaFrameDelta':0,'mediaDurationDeltaSeconds':0})
c['lessons'][0]['chapters'][1]['time']=153.73333333333332;c['lessons'][0]['question']['review']=153.73333333333332
c['lessons'][1]['chapters'][1]={'time':183.63333333333333,'label':'Install the scientific tools'};c['lessons'][1]['chapters'][2]['time']=441.53333333333336;c['lessons'][1]['question']['review']=441.53333333333336
c['lessons'][3]['question']['review']=78.8
c['lessons'][6]['chapters'][1]['time']=57.43333333333333;c['lessons'][6]['question']['review']=57.43333333333333
l=c['lessons'][8];l['chapters'][3]={'time':277.53333333333336,'label':'Monitor with uncertainty'};l['question']['review']=277.53333333333336
l['outcome']='Separate a lost monitoring connection from simulation failure and request evidence about the current job state.'
l['question']['prompt']='The monitoring connection to an HPC simulation drops. What can you conclude?'
l['question']['answers']=[{'text':'The current state is unknown; retain the last verified progress and inspect scheduler and simulation outputs.','correct':True,'feedback':'Correct. A lost monitoring connection limits what is known about the current job; it does not establish a physical or numerical failure.'},{'text':'The molecular system is definitely unstable.','correct':False,'feedback':'A connection failure is an operational observation. Molecular instability requires evidence from the trajectory and simulator outputs.'},{'text':'The simulation has definitely completed successfully.','correct':False,'feedback':'A lost connection cannot confirm completion. Obtain a current scheduler status and inspect the expected output files.'}]
f.write_text(json.dumps(c,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
e.write_text(json.dumps({'timestamp':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'new authoring schedule revised before publication','priorPublishedQuizSchedule':None,'reason':'Place new questions in measured quiet intervals; align remediation with acoustic source section starts. Q07 now tests the monitoring uncertainty actually discussed in its video.','mediaTotalFrames':sum(l['frames']for l in c['lessons']),'mediaRetimingChanges':0,'changes':changes},indent=2)+'\n')
print([(x['lesson'],x['finalQuestionSeconds'],x['deltaSeconds'])for x in changes])
