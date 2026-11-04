const config=await fetch('course.config.json').then(r=>{if(!r.ok)throw new Error('Course configuration unavailable');return r.json()});
const $=id=>document.getElementById(id);
const frame=$('lesson-frame'),status=$('player-status');
let active=0,ready=false,pending=null;
const time=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
const lesson=()=>config.lessons[active];
function send(kind,payload={}){frame.contentWindow?.postMessage({channel:'stem-h5p-v1',lesson:lesson().id,kind,...payload},location.origin)}
function seek(t){if(!ready){pending=t;status.textContent='Chapter queued while the video loads.'}else send('seek',{time:t})}
function load(index){
 active=index;ready=false;pending=null;const l=lesson();
 $('lesson-number').textContent=`LESSON ${l.order} / ${config.lessons.length}`;
 $('lesson-duration').textContent=time(l.frames/30);
 $('lesson-title').textContent=l.title;$('lesson-outcome').textContent=l.outcome;
 status.textContent='Loading the interactive player…';
 $('chapters').replaceChildren(...l.chapters.map(c=>{const b=document.createElement('button');b.type='button';b.textContent=`${time(c.time)} ${c.label}`;b.addEventListener('click',()=>seek(c.time));return b}));
 frame.title=`${l.order}. ${l.title} — native H5P interactive video`;
 frame.style.height='';frame.src=`exports/lesson-${l.id}.html`;
 for(const [id,href]of Object.entries({'youtube-link':`https://youtu.be/${l.youtubeId}`,'srt-link':`captions/lesson-${l.id}.srt`,'vtt-link':`captions/lesson-${l.id}.vtt`,'practice-link':`exports/lesson-${l.id}-practice.html`,'h5p-download':`downloads/lesson-${l.id}.h5p`,'html-download':`exports/lesson-${l.id}.html`,'practice-download':`downloads/lesson-${l.id}-practice.h5p`}))$(id).href=href;
 $('previous').disabled=index===0;$('next').disabled=index===config.lessons.length-1;
 document.querySelectorAll('[data-lesson]').forEach((b,i)=>b.setAttribute('aria-current',String(i===index)));
 history.replaceState(null,'',`#lesson-${l.id}`);
}
for(const [i,l]of config.lessons.entries()){
 const item=document.createElement('li'),b=document.createElement('button'),n=document.createElement('span'),title=document.createElement('span');
 b.type='button';b.dataset.lesson=l.id;n.className='num';n.textContent=l.order;title.textContent=l.title;b.append(n,title);b.addEventListener('click',()=>load(i));item.append(b);$('lesson-list').append(item);
}
addEventListener('message',e=>{
 if(e.origin!==location.origin||e.source!==frame.contentWindow)return;
 const d=e.data;if(!d||d.channel!=='stem-h5p-v1'||d.lesson!==lesson().id)return;
 if(d.kind==='ready'){ready=true;status.textContent='Player ready. Press Play to begin.';if(d.youtubeId!==lesson().youtubeId){ready=false;status.textContent='Video source mismatch. Please reload.';return}if(pending!==null){const t=pending;pending=null;send('seek',{time:t})}}
 if(d.kind==='resize'&&Number.isFinite(d.height)&&d.height>100&&d.height<6000)frame.style.height=`${d.height}px`;
 if(d.kind==='seeked')status.textContent=`Ready at ${time(d.time)}. Press Play to continue.`;
 if(d.kind==='error')status.textContent='Video is unavailable. Reload, open the direct YouTube link, or use independent practice.';
});
$('checkpoint').addEventListener('click',()=>seek(lesson().question.time-2));
$('summary').addEventListener('click',()=>seek(lesson().frames/30-5));
$('reset').addEventListener('click',()=>send('reset'));
$('previous').addEventListener('click',()=>load(Math.max(0,active-1)));
$('next').addEventListener('click',()=>load(Math.min(config.lessons.length-1,active+1)));
const fromHash=config.lessons.findIndex(l=>`#lesson-${l.id}`===location.hash);load(fromHash<0?0:fromHash);
