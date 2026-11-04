import {test,expect}from'@playwright/test';import fs from'node:fs/promises';import {exerciseLesson}from'./learning-path.mjs';
const cfg=JSON.parse(await fs.readFile('course.config.json','utf8'));
function adapter(page,logs){return{playwright:page,url:async()=>page.url(),getAXState:async()=>{const text=await page.locator('body').innerText();await page.waitForTimeout(300);return text},screenshot:o=>page.screenshot(o),dev:{logs:async()=>logs}}}
function diagnostics(page){const logs=[];page.on('pageerror',e=>logs.push({level:'error',message:e.name==='AbortError'?`AbortError: ${e.message}`:String(e),timestamp:new Date().toISOString(),url:page.url()}));page.on('console',e=>{if(e.type()==='error')logs.push({level:'error',message:e.text(),timestamp:new Date().toISOString(),url:e.location().url||page.url()})});page.on('response',r=>{if(r.status()>=400)logs.push({level:'error',message:`HTTP ${r.status()}`,timestamp:new Date().toISOString(),url:r.url()})});return logs}
// This exact optional YouTube telemetry denial was reproduced with successful
// streaming. Retain it separately; every other script/resource error fails.
const isVendorPressure=e=>e.message==='Permissions policy violation: compute-pressure is not allowed in this document.'&&/^https:\/\/www\.youtube\.com\/s\/player\/[^/]+\/player_embed\.vflset\//.test(e.url);
for(const l of cfg.lessons){
 if(process.env.COURSE_REAL_STREAM==='1')for(const context of ['embedded','standalone'])test(`real YouTube streaming ${context} ${l.id}`,async({page},info)=>{
  const logs=diagnostics(page);await page.goto(context==='embedded'?'/AIagentsinSTEM/':`/AIagentsinSTEM/exports/lesson-${l.id}.html`);
  const result=await exerciseLesson(adapter(page,logs),l,{context,edition:'youtube',viewport:info.project.name,runner:'playwright',outputDir:info.outputPath('learning-path')});result.environment={kind:'real YouTube streaming, isolated local browser',browser:await page.context().browser().version(),viewport:page.viewportSize()};await fs.writeFile(info.outputPath('evidence.json'),JSON.stringify(result,null,2));expect(result.status,JSON.stringify(result,null,2)).toBe('pass');
 });
 for(const context of ['embedded','standalone'])test(`native fixture ${context} ${l.id}: pause feedback review retry Summary`,async({page},info)=>{
  const logs=diagnostics(page);
  await page.goto(context==='embedded'?'/__preview/index.html':`/__preview/exports/lesson-${l.id}.html`);
  const result=await exerciseLesson(adapter(page,logs),l,{context,edition:'local',viewport:info.project.name,runner:'playwright',outputDir:info.outputPath('learning-path')});
  result.environment={kind:process.env.CI?'CI synthetic native-MP4 fixture, NOT lecture/YouTube playback evidence':'Finished local v03 lecture MP4, isolated ignored preview; NOT YouTube availability evidence',browser:await page.context().browser().version(),viewport:page.viewportSize()};
  await fs.writeFile(info.outputPath('evidence.json'),JSON.stringify(result,null,2));expect(result.status,JSON.stringify(result,null,2)).toBe('pass');
 });
 test(`YouTube startup-only ${l.id}: configured source geometry and scripts`,async({page},info)=>{
  const logs=diagnostics(page);await page.goto('/AIagentsinSTEM/');await page.locator(`[data-lesson="${l.id}"]`).click();
  const frame=page.frameLocator('#lesson-frame');
  await expect(frame.locator('iframe[id^="h5p-youtube-"]')).toHaveAttribute('src',new RegExp(`/embed/${l.youtubeId}`),{timeout:60000});
  await expect(frame.getByRole('button',{name:'Play (k)',exact:true})).toBeVisible({timeout:60000});
  const rect=await frame.locator('iframe[id^="h5p-youtube-"]').boundingBox();expect(rect.width).toBeGreaterThan(200);expect(rect.height).toBeGreaterThan(100);
  const inner=page.frames().find(f=>f.url().includes(`/exports/lesson-${l.id}.html`));
  await inner.waitForFunction(()=>window.H5P?.instances?.[0]?.video?.isLoaded?.(),{}, {timeout:60000,polling:250});
  await page.getByRole('button',{name:'Return to checkpoint',exact:true}).click();
  await expect(page.locator('#lesson-frame')).toHaveAttribute('src',`exports/lesson-${l.id}.html`);
  expect(logs.filter(e=>!isVendorPressure(e))).toEqual([]);
  await fs.writeFile(info.outputPath('startup-only.json'),JSON.stringify({context:'embedded',edition:'original supplied YouTube',scope:'startup-only; streaming not asserted on hosted CI',sourceId:l.youtubeId,url:page.url(),viewport:info.project.name,geometry:rect,errors:logs,vendorPressureDiagnostics:logs.filter(isVendorPressure),timestamp:new Date().toISOString()},null,2));
 });
 test(`standalone independent practice ${l.id}`,async({page},info)=>{
  const logs=diagnostics(page);await page.goto(`/AIagentsinSTEM/exports/lesson-${l.id}-practice.html`);const correct=l.question.answers.find(a=>a.correct).text;
  const wrong=page.getByRole('radio').filter({hasNotText:correct}).first(),wrongText=await wrong.innerText(),distractor=l.question.answers.find(a=>!a.correct&&wrongText.includes(a.text));
  await wrong.check();await page.getByRole('button',{name:/^Check the answers/}).click();
  await expect(page.getByText(distractor.feedback,{exact:true})).toBeVisible();
  // A zero-width progress fill is intentionally hidden at zero; verify the
  // visible numeric score and its accessible label, rather than the fill box.
  await expect(page.locator('.h5p-joubelui-score-numeric')).toBeVisible();await expect(page.locator('.h5p-joubelui-score-numeric')).toHaveText('0/1');await expect(page.locator('.h5p-joubelui-score-bar-progress')).toHaveText('You got 0 out of 1 points');
  await page.getByRole('button',{name:/Retry the task/}).click();
  await page.getByRole('radio',{name:correct}).check();await page.getByRole('button',{name:/^Check the answers/}).click();await expect(page.locator('.h5p-joubelui-score-numeric')).toHaveText('1/1');expect(logs).toEqual([]);
  await fs.writeFile(info.outputPath('practice.json'),JSON.stringify({timestamp:new Date().toISOString(),url:page.url(),context:'standalone independent practice',viewport:info.project.name,status:'pass',wrongAnswer:distractor.text,specificFeedback:distractor.feedback,wrongScore:'0/1',retryScore:'1/1',errors:logs},null,2));
 });
}
test('JupyterLite: fresh kernel, all cells, scientific results and three plots',async({page},info)=>{
 test.skip(info.project.name!=='desktop','Desktop browser kernel execution; phone layouts tested in lesson cases');test.setTimeout(240000);
 const logs=diagnostics(page),runtimeRequests=[];page.on('response',r=>{if(/pyodide(?:\.mjs|\.js|\.asm\.wasm|-lock\.json)/.test(r.url()))runtimeRequests.push({url:r.url(),status:r.status()})});await page.goto('/AIagentsinSTEM/lite/lab/index.html?path=stem-evidence.ipynb');
 await page.getByRole('button',{name:'Python (Pyodide)',exact:true}).waitFor({state:'visible',timeout:90000});
 await page.getByRole('menuitem',{name:'Run',exact:true}).click();await page.getByRole('menuitem',{name:'Run All Cells',exact:true}).click();
 const chooser=page.getByRole('dialog');if(await chooser.count()&&await chooser.isVisible()){
  const select=chooser.locator('select');if(await select.count())await select.selectOption({label:'Python (Pyodide)'});await chooser.getByRole('button',{name:'Select',exact:true}).click();
 }
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('.jp-OutputArea-output')).some(e=>e.textContent.includes('LAB_COMPLETE:')),{}, {timeout:180000,polling:250});
 const outputs=await page.locator('.jp-OutputArea-output').allTextContents();const text=outputs.join('\n');
 expect(text).toContain('BAR_END_UM 11.904761904761905');expect(text).toContain("'bandwidth_pass': False");expect(text).toContain("'nonzero_fraction': 0.1");expect(text).not.toContain('Traceback');
 const images=page.locator('.jp-OutputArea-output img');await expect(images).toHaveCount(3);for(const i of await images.all())expect(await i.evaluate(e=>e.naturalWidth)).toBeGreaterThan(300);
 expect(logs).toEqual([]);await fs.writeFile(info.outputPath('pyodide.json'),JSON.stringify({status:'pass',url:page.url(),context:'fresh hosted-build browser Pyodide',environment:{browser:await page.context().browser().version(),runtimeRequests},outputs,plots:3,errors:logs,timestamp:new Date().toISOString()},null,2));
});

if(process.env.COURSE_REAL_STREAM==='1')test('real chapter queue: same player, visible playback and reset',async({page},info)=>{
 const logs=diagnostics(page),l=cfg.lessons[1];let held;
 await page.route('**/exports/lesson-02.html',route=>{held=route});
 await page.goto('/AIagentsinSTEM/',{waitUntil:'domcontentloaded'});
 await page.locator('[data-lesson="02"]').click();
 await page.locator('#chapters button').nth(1).click();
 await expect(page.locator('#player-status')).toHaveText('Chapter queued while the video loads.');
 await expect.poll(()=>!!held).toBe(true);await held.continue();await page.unroute('**/exports/lesson-02.html');
 await expect(page.locator('#player-status')).toContainText('Ready at ');
 const frame=page.frameLocator('#lesson-frame'),before=await page.locator('#lesson-frame').getAttribute('src');
 await frame.getByRole('button',{name:'Play (k)',exact:true}).press('Enter');
 const video=frame.frameLocator('iframe[id^="h5p-youtube-"]').locator('video');
 await expect.poll(()=>video.evaluate(v=>v.currentTime),{timeout:20000}).toBeGreaterThan(l.chapters[1].time);
 const a=await video.evaluate(v=>({time:v.currentTime,width:v.videoWidth}));await page.waitForTimeout(600);const b=await video.evaluate(v=>({time:v.currentTime,width:v.videoWidth}));
 expect(b.time).toBeGreaterThan(a.time+.25);expect(b.width).toBeGreaterThan(300);
 await frame.getByRole('button',{name:'Pause (k)',exact:true}).press('Enter');
 const exit=frame.getByRole('button',{name:'Exit Fullscreen',exact:true});if(await exit.count()&&await exit.isVisible())await exit.press('Enter');
 await page.getByRole('button',{name:'Reset lesson',exact:true}).click();
 await expect.poll(()=>video.evaluate(v=>v.currentTime)).toBeLessThan(1);
 expect(await page.locator('#lesson-frame').getAttribute('src')).toBe(before);
 await fs.writeFile(info.outputPath('chapter-queue.json'),JSON.stringify({timestamp:new Date().toISOString(),url:page.url(),viewport:info.project.name,status:'pass',context:'embedded',sourceId:l.youtubeId,queuedBeforeReady:true,requestedChapter:l.chapters[1],advancingFrames:[a,b],sameFrameSource:before,resetTime:await video.evaluate(v=>v.currentTime),errors:logs},null,2));
 expect(logs).toEqual([]);
});
