import fs from 'node:fs/promises';

export async function readMedia(root,edition){
 const target=edition==='local'?root.locator('video'):root.frameLocator('iframe[id^="h5p-youtube-"]').locator('video');
 return target.evaluate(v=>({time:v.currentTime,paused:v.paused,width:v.videoWidth,readyState:v.readyState,duration:v.duration}));
}
async function questionReady(tab,root,correct){
 for(let poll=0;poll<60;poll++){
  const radio=root.getByRole('radio',{name:correct});
  if(await radio.count()&&await radio.first().isVisible())return {polls:poll+1};
  const launcher=root.getByRole('button',{name:'Multiple Choice',exact:true});
  if(await launcher.count()&&await launcher.isVisible())await launcher.press('Enter');
  await tab.playwright.waitForTimeout(250);
 }
 throw Error('Question did not appear after crossing its timestamp');
}
async function reviewReady(tab,root,lesson,edition){
 let value;
 for(let poll=0;poll<24;poll++){
  value=await readMedia(root,edition);
  if(Math.abs(value.time-lesson.question.review)<3&&value.readyState>=2)return {...value,polls:poll+1};
  await tab.playwright.waitForTimeout(250);
 }
 throw Error(`Review seek did not settle: ${JSON.stringify(value)}`);
}
export async function exerciseLesson(tab,lesson,{context='embedded',edition='youtube',viewport='desktop',outputDir='.local/browser-qa',runner='cua'}={}){
 const r={lesson:lesson.id,context,edition,viewport,started:new Date().toISOString(),checks:{},events:[]};
 const root=context==='embedded'?tab.playwright.frameLocator('#lesson-frame'):tab.playwright;
 const correct=lesson.question.answers.find(a=>a.correct).text;
 const mark=name=>r.events.push({name,time:new Date().toISOString()});
 const jump=()=>tab.playwright.getByRole('button',{name:'Return to checkpoint',exact:true}).click();
 const visible=(locator,ms)=>locator.waitFor(runner==='playwright'?{state:'visible',timeout:ms}:{state:'visible',timeoutMs:ms});
 try{
  if(context==='embedded')await tab.playwright.locator(`[data-lesson="${lesson.id}"]`).click();
  r.url=await tab.url();
  await visible(root.getByRole('button',{name:'Play (k)',exact:true}),30000);
  await jump();mark('checkpoint-seek-requested');
  await root.getByRole('button',{name:'Play (k)',exact:true}).press('Enter');mark('play-before-question');
  r.checks.questionReady=await questionReady(tab,root,correct);
  await visible(root.getByRole('button',{name:'Play (k)',exact:true}),5000);
  await tab.getAXState({emit:false});
  const paused=await readMedia(root,edition);
  if(Math.abs(paused.time-lesson.question.time)>.6||!paused.paused||paused.readyState<2)throw Error(`Timed pause failed: ${JSON.stringify(paused)}`);
  r.checks.timedPause=paused;
  const wrong=root.getByRole('radio').filter({hasNotText:correct}).first();
  const wrongText=await wrong.innerText();const answer=lesson.question.answers.find(a=>!a.correct&&wrongText.includes(a.text));
  if(!answer)throw Error('Cannot identify the selected distractor');
  await wrong.check();await root.getByRole('button',{name:/^Check the answers/}).press('Enter');
  await visible(root.getByText(answer.feedback,{exact:true}),5000);
  r.checks.wrongFeedback={answer:answer.text,feedback:answer.feedback};
  const second=await readMedia(root,edition);
  if(Math.abs(second.time-paused.time)>.08||!second.paused)throw Error('Pause was not stable');
  r.checks.stablePause=second;mark('review-click');
  await root.getByRole('button',{name:/Review the explanation/}).press('Enter');await tab.getAXState({emit:false});
  r.checks.reviewSeek=await reviewReady(tab,root,lesson,edition);
  await jump();await root.getByRole('button',{name:'Play (k)',exact:true}).press('Enter');
  r.checks.retryReady=await questionReady(tab,root,correct);
  await root.getByRole('radio',{name:correct}).check();await root.getByRole('button',{name:/^Check the answers/}).press('Enter');
  await visible(root.getByText('You got 1 out of 1 points',{exact:true}),5000);
  r.checks.retryScore='1/1';
  await fs.mkdir(outputDir,{recursive:true});
  r.screenshot=`${edition}-${viewport}-${context}-${lesson.id}-correct.png`;
  await fs.writeFile(`${outputDir}/${r.screenshot}`,await tab.screenshot({fullPage:false}));
  mark('correct-adaptivity-continue');await root.getByRole('button',{name:/Continue with video/}).press('Enter');
  await tab.playwright.waitForTimeout(1000);mark('summary-seek');
  await tab.playwright.getByRole('button',{name:'Final summary',exact:true}).click();
  await root.getByRole('button',{name:'Play (k)',exact:true}).press('Enter');
  await visible(root.locator('.h5p-interaction.h5p-end-summary'),15000);
  await root.locator('.h5p-interaction.h5p-end-summary').press('Enter');
  await visible(root.getByRole('radio',{name:correct,exact:true}),5000);
  await root.getByRole('radio',{name:correct,exact:true}).check();
  const summary2='Preserve inputs, versions, assumptions and outputs so another scientist can check the claim.';
  await visible(root.getByRole('radio',{name:summary2,exact:true}),5000);
  await root.getByRole('radio',{name:summary2,exact:true}).check();
  await visible(root.getByRole('button',{name:/Continue$/}),5000);
  await visible(root.getByText('You got 2 out of 2 points',{exact:true}),5000);
  r.checks.summary={statements:2,score:'2/2'};
  await root.getByRole('button',{name:/Continue$/}).press('Enter');await tab.getAXState({emit:false});
  r.checks.summary.continuation=true;
  r.checks.contentGeometry=await root.locator('body').evaluate(e=>({width:e.ownerDocument.documentElement.clientWidth,scrollWidth:e.ownerDocument.documentElement.scrollWidth,height:e.getBoundingClientRect().height}));
  if(r.checks.contentGeometry.scrollWidth>r.checks.contentGeometry.width+2)throw Error('H5P content overflows horizontally');
  if(edition==='youtube'){
   r.checks.sourceFrames=await root.locator('iframe').evaluateAll(es=>es.map(e=>({src:e.src,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})));
   if(!r.checks.sourceFrames.some(f=>f.src.includes(lesson.youtubeId)&&f.width>200&&f.height>100))throw Error('Wrong embedded source or invalid video geometry');
  }
  r.status='pass';
 }catch(error){r.status='fail';r.error=String(error);await fs.mkdir(outputDir,{recursive:true});r.screenshot=`${edition}-${viewport}-${context}-${lesson.id}-failure.png`;await fs.writeFile(`${outputDir}/${r.screenshot}`,await tab.screenshot({fullPage:false}));}
 r.completed=new Date().toISOString();
 r.logs=(await tab.dev.logs({levels:['error','warn'],limit:100})).filter(x=>x.timestamp>=r.started);
 const known='AbortError: The play() request was interrupted by a call to pause(). https://goo.gl/LdLk22';
 const start=r.events.find(e=>e.name==='correct-adaptivity-continue')?.time,end=r.events.find(e=>e.name==='summary-seek')?.time;
 const observed=r.logs.filter(x=>edition==='local'&&x.message===known&&start&&end&&x.timestamp>=start&&x.timestamp<=end);
 const unexpected=r.logs.filter(x=>!observed.includes(x));
 if(observed.length>1||unexpected.length){r.status='fail';r.diagnosticsFailure={unexpected,observedAbortCount:observed.length};}
 if(observed.length)r.nativeAbortObservation={count:observed.length,type:'AbortError',message:known,phase:'correct-answer native adaptivity continuation, before next external seek',interpretation:'observed nonfatal in this bounded phase only; playback, pause, seek, retry and Summary assertions retained'};
 await fs.writeFile(`${outputDir}/${edition}-${viewport}-${context}-${lesson.id}.json`,JSON.stringify(r,null,2)+'\n');
 return r;
}
