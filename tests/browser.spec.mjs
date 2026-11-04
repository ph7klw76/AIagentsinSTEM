import {test,expect}from'@playwright/test';import fs from'node:fs/promises';import {exerciseLesson}from'./learning-path.mjs';
const cfg=JSON.parse(await fs.readFile('course.config.json','utf8'));
function adapter(page,logs){return{playwright:page,url:async()=>page.url(),getAXState:async()=>{const text=await page.locator('body').innerText();await page.waitForTimeout(300);return text},screenshot:o=>page.screenshot(o),dev:{logs:async()=>logs}}}
function diagnostics(page){const logs=[];page.on('pageerror',e=>logs.push({level:'error',message:e.name==='AbortError'?`AbortError: ${e.message}`:String(e),timestamp:new Date().toISOString(),url:page.url()}));page.on('console',e=>{if(e.type()==='error')logs.push({level:'error',message:e.text(),timestamp:new Date().toISOString(),url:e.location().url||page.url()})});page.on('response',r=>{if(r.status()>=400)logs.push({level:'error',message:`HTTP ${r.status()}`,timestamp:new Date().toISOString(),url:r.url()})});return logs}
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
  expect(logs).toEqual([]);
  await fs.writeFile(info.outputPath('startup-only.json'),JSON.stringify({context:'embedded',edition:'original supplied YouTube',scope:'startup-only; streaming not asserted on hosted CI',sourceId:l.youtubeId,url:page.url(),viewport:info.project.name,geometry:rect,errors:logs,timestamp:new Date().toISOString()},null,2));
 });
 test(`standalone independent practice ${l.id}`,async({page})=>{
  const logs=diagnostics(page);await page.goto(`/AIagentsinSTEM/exports/lesson-${l.id}-practice.html`);const correct=l.question.answers.find(a=>a.correct).text;
  await page.getByRole('radio').filter({hasNotText:correct}).first().check();await page.getByRole('button',{name:/^Check the answers/}).click();
  await expect(page.getByText('You got 0 out of 1 points',{exact:true})).toBeVisible();await page.getByRole('button',{name:/Retry the task/}).click();
  await page.getByRole('radio',{name:correct}).check();await page.getByRole('button',{name:/^Check the answers/}).click();await expect(page.getByText('You got 1 out of 1 points',{exact:true})).toBeVisible();expect(logs).toEqual([]);
 });
}
test('JupyterLite: fresh kernel, all cells, scientific results and three plots',async({page},info)=>{
 test.skip(info.project.name!=='desktop','Desktop browser kernel execution; phone layouts tested in lesson cases');test.setTimeout(240000);
 const logs=diagnostics(page);await page.goto('/AIagentsinSTEM/lite/lab/index.html?path=stem-evidence.ipynb');
 await page.getByRole('button',{name:'Python (Pyodide)',exact:true}).waitFor({state:'visible',timeout:90000});
 await page.getByRole('menuitem',{name:'Run',exact:true}).click();await page.getByRole('menuitem',{name:'Run All Cells',exact:true}).click();
 const chooser=page.getByRole('dialog');if(await chooser.count()&&await chooser.isVisible()){
  const select=chooser.locator('select');if(await select.count())await select.selectOption({label:'Python (Pyodide)'});await chooser.getByRole('button',{name:'Select',exact:true}).click();
 }
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('.jp-OutputArea-output')).some(e=>e.textContent.includes('LAB_COMPLETE:')),{}, {timeout:180000,polling:250});
 const outputs=await page.locator('.jp-OutputArea-output').allTextContents();const text=outputs.join('\n');
 expect(text).toContain('BAR_END_UM 11.904761904761905');expect(text).toContain("'bandwidth_pass': False");expect(text).toContain("'nonzero_fraction': 0.1");expect(text).not.toContain('Traceback');
 const images=page.locator('.jp-OutputArea-output img');await expect(images).toHaveCount(3);for(const i of await images.all())expect(await i.evaluate(e=>e.naturalWidth)).toBeGreaterThan(300);
 expect(logs).toEqual([]);await fs.writeFile(info.outputPath('pyodide.json'),JSON.stringify({status:'pass',url:page.url(),context:'fresh hosted-build browser Pyodide',outputs,plots:3,errors:logs,timestamp:new Date().toISOString()},null,2));
});
