"""Ignored synthetic CI media. This is never a course fallback or upload master."""
import pathlib,json,subprocess,os
R=pathlib.Path(__file__).resolve().parents[1];FF=os.environ.get('FFMPEG','ffmpeg');c=json.loads((R/'course.config.json').read_text())
for l in c['lessons']:
 d=R/f'.local/upload-kit/lesson-{l["id"]}';d.mkdir(parents=True,exist_ok=True);f=d/f'AIagentsSTEM_{l["id"]}_1080p30_v03.mp4'
 if f.exists():raise RuntimeError('Refusing to replace existing media. Run CI fixtures only in a fresh checkout.')
 subprocess.run([FF,'-v','error','-f','lavfi','-i','color=c=0x123543:s=320x180:r=30','-f','lavfi','-i','anullsrc=r=48000:cl=mono','-frames:v',str(l['frames']),'-t',str(l['frames']/30),'-c:v','libx264','-preset','ultrafast','-crf','40','-threads','2','-pix_fmt','yuv420p','-c:a','aac','-movflags','+faststart',str(f)],check=True)
 (d/'CI_SYNTHETIC_FIXTURE.json').write_text(json.dumps({'kind':'synthetic CI color/silence fixture','frames':l['frames'],'notLecturePlaybackEvidence':True}))
 print('CI_FIXTURE',l['id'],flush=True)
