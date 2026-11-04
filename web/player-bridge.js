// Supported same-origin parent messaging; native H5P APIs own playback and scoring.
(() => {
 'use strict';
 const embedded=window.parent!==window;
 if(embedded)document.documentElement.classList.add('embedded');
 let player,ready=false,pending=null,lastSize=0;
 const status=document.getElementById('player-status');
 function send(kind,payload={}){if(embedded)parent.postMessage({channel:'stem-h5p-v1',lesson:LESSON.id,kind,...payload},location.origin)}
 function resize(){const content=document.querySelector('.h5p-content');const h=Math.ceil(content?.getBoundingClientRect().height||0)+2;if(h>100&&h!==lastSize){lastSize=h;send('resize',{height:h})}}
 function seek(time){
  if(!Number.isFinite(time)||time<0||time>LESSON.duration)return;
  if(!ready){pending=time;status.textContent='Chapter queued while the video loads.';return}
  player.seek(time);player.pause();status.textContent=`Ready at ${time.toFixed(1)} seconds. Press Play to continue.`;send('seeked',{time});
 }
 addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==parent)return;
  const d=event.data;if(!d||d.channel!=='stem-h5p-v1'||d.lesson!==LESSON.id)return;
  if(d.kind==='seek')seek(d.time);
  if(d.kind==='reset'&&ready){player.pause();player.resetTask();seek(0)}
 });
 document.querySelectorAll('[data-seek]').forEach(b=>b.addEventListener('click',()=>seek(Number(b.dataset.seek))));
 document.querySelector('[data-reset]')?.addEventListener('click',()=>{if(ready){player.pause();player.resetTask();seek(0)}});
 new ResizeObserver(resize).observe(document.body);
 const started=Date.now();
 const timer=setInterval(()=>{
  player=window.H5P?.instances?.[0];
  if(player?.video?.isLoaded?.()){
   clearInterval(timer);ready=true;status.textContent='Ready. Press Play to begin.';send('ready',{youtubeId:LESSON.youtubeId,localPreview:LESSON.localPreview});
   player.on('resize',resize);player.video.on('stateChange',()=>{resize();send('state',{time:player.video.getCurrentTime()})});
   if(pending!==null){const t=pending;pending=null;seek(t)}resize();
  }else if(Date.now()-started>60000){clearInterval(timer);status.textContent='Video did not become ready. Try reloading or open YouTube; independent practice is available.';send('error',{message:'Video readiness timeout'})}
 },250);
 document.addEventListener('fullscreenchange',()=>{player?.trigger('resize');resize();send('fullscreen',{active:!!document.fullscreenElement})});
})();
