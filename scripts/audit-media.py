"""Read-only local media inventory; saves source hashes, probes and contact sheets."""
import json, pathlib, os, subprocess, hashlib
from PIL import Image, ImageDraw
ROOT=pathlib.Path(__file__).resolve().parents[1]
SOURCE=pathlib.Path(os.environ.get('COURSE_MEDIA_SOURCE',r'C:\Users\Woon\Videos'))
FFPROBE=os.environ.get('FFPROBE',r'C:\Users\Woon\anaconda3\Library\bin\ffprobe.exe')
FFMPEG=os.environ.get('FFMPEG',r'C:\Users\Woon\anaconda3\Library\bin\ffmpeg.exe')
NAMES=['Chapter1.mp4','Chapter2.mp4','Chapter3.mp4','Chapter4.mp4','Chapter5-orca.mp4','Chapter5-Oraca Demo.mp4','Chapter6-kidcad.mp4','Chapter 5-kidcard demostration.mp4','Chapter7.mp4','Chapter8-case study.mp4']
out=ROOT/'.local'/'media-audit';out.mkdir(parents=True,exist_ok=True)
report=[]
for i,name in enumerate(NAMES):
 f=SOURCE/name
 probe=json.loads(subprocess.check_output([FFPROBE,'-v','error','-show_streams','-show_format','-of','json',str(f)]))
 v=next(s for s in probe['streams'] if s['codec_type']=='video'); duration=float(v['duration'])
 row={'order':i,'filename':name,'sourcePath':str(f),'sha256':hashlib.file_digest(f.open('rb'),'sha256').hexdigest(),'probe':probe}
 report.append(row)
 sheet=Image.new('RGB',(1200,245),(15,22,33)); draw=ImageDraw.Draw(sheet)
 for j,t in enumerate([8,duration/2,duration-15]):
  fn=out/f'{i+1:02}-{j}.jpg'
  subprocess.run([FFMPEG,'-hide_banner','-loglevel','error','-ss',str(t),'-i',str(f),'-frames:v','1','-vf','scale=400:-1','-y',str(fn)],check=True)
  sheet.paste(Image.open(fn),(j*400,20));draw.text((j*400+5,3),f'{name} @ {t:.2f}s',fill='white')
 sheet.save(out/f'{i+1:02}-contact.jpg')
 print(i+1,name,duration,v['nb_frames'],flush=True)
(out/'sources.json').write_text(json.dumps(report,indent=2),encoding='utf8')
