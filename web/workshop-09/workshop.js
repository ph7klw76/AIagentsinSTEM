const video=document.getElementById('video');
let player,ready=false,pending=null;
const status=document.getElementById('status');
function seek(t){if(!ready){pending=t;status.textContent='Chapter queued while YouTube loads.';return;}player.seekTo(t,true);player.pauseVideo();status.textContent='Chapter selected. Press Play to continue.';video.scrollIntoView({behavior:'smooth',block:'center'});}
window.onYouTubeIframeAPIReady=()=>{player=new YT.Player('video',{events:{onReady:()=>{ready=true;status.textContent='Player ready. Press Play to begin.';if(pending!==null){seek(pending);pending=null;}},onError:()=>{status.textContent='YouTube playback is unavailable here. Use Watch on YouTube or download the video below.';}}});};
document.querySelectorAll('[data-time]').forEach(b=>b.addEventListener('click',()=>seek(Number(b.dataset.time))));
const sdk=document.createElement('script');sdk.src='https://www.youtube.com/iframe_api';sdk.onerror=()=>{status.textContent='Use Watch on YouTube or download the video below.';};document.head.append(sdk);
const quiz=document.getElementById('quiz'),feedback=document.getElementById('feedback');
quiz.addEventListener('submit',e=>{e.preventDefault();const d=new FormData(quiz);const result=[d.get('q1')==='a',d.get('q2')==='b',d.get('q3')==='a'];feedback.textContent=`${result.filter(Boolean).length}/3 correct. `+result.map((ok,i)=>`${i+1}: ${ok?'Correct.':'Review this explanation.'} `+['Test a reference case after connecting the tools.','Completion alone does not validate the physical model.','A skill preserves a procedure; future results still need checks.'][i]).join(' ');});
quiz.addEventListener('reset',()=>{feedback.textContent='';});
document.getElementById('save').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([document.getElementById('reflection').value],{type:'text/plain'}));const a=document.createElement('a');a.href=url;a.download='workshop-09-notes.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
