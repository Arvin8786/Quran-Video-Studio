import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';

// Entirely local fixtures: this never signs in or publishes to a real account.
const root = path.resolve(import.meta.dirname, '..');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'proease-browser-'));
const children = [];
let fixtureServer, socket;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check, message, timeout = 20000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await check()) return; await delay(100); }
  throw new Error(message);
}
async function freePort() {
  const s = http.createServer(); await new Promise(resolve => s.listen(0, '127.0.0.1', resolve));
  const port = s.address().port; await new Promise(resolve => s.close(resolve)); return port;
}
function start(command, args, options = {}) {
  const child = spawn(command, args, { cwd: root, stdio: 'ignore', detached: true, ...options });
  child.on('error', error => console.error(error.message)); children.push(child); return child;
}
try {
  for (const [name, args] of [
    ['background.mp4', ['-f', 'lavfi', '-i', 'color=c=blue:s=320x240:r=30:d=1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p']],
    ['audio.mp3', ['-f', 'lavfi', '-i', 'sine=frequency=440:duration=0.6', '-c:a', 'libmp3lame']],
    ['logo.png', ['-f', 'lavfi', '-i', 'color=c=red:s=64x64', '-frames:v', '1', '-threads', '1']],
  ]) execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args, path.join(temporary, name)]);
  const fixtureAudio = fs.readFileSync(path.join(temporary, 'audio.mp3'));
  const fixtureVideo = fs.readFileSync(path.join(temporary, 'background.mp4'));
  const fixtureImage = fs.readFileSync(path.join(temporary, 'logo.png'));
  fixtureServer = http.createServer((req, res) => {
    const audio = req.url.includes('.mp3');
    res.writeHead(200, { 'Content-Type': audio ? 'audio/mpeg' : 'video/mp4', 'Access-Control-Allow-Origin': '*' });
    res.end(audio ? fixtureAudio : fixtureVideo);
  });
  await new Promise(resolve => fixtureServer.listen(0, '127.0.0.1', resolve));
  const fixtureOrigin = `http://127.0.0.1:${fixtureServer.address().port}`;
  const port = await freePort(), debugPort = await freePort();
  const dataDir = path.join(temporary, 'data'); fs.mkdirSync(dataDir); fs.copyFileSync(path.join(temporary, 'background.mp4'), path.join(dataDir, 'default_bg.mp4'));
  start(process.execPath, ['--import', 'tsx', 'server.ts'], { env: { ...process.env, NODE_ENV: 'production', PORT: String(port), PROEASE_DATA_DIR: dataDir, STUDIO_ACCESS_KEY:'browser-fixture-key' } });
  const appUrl = `http://127.0.0.1:${port}`;
  await until(async () => { try { return (await fetch(appUrl)).ok; } catch { return false; } }, 'App did not start');
  start(process.env.CHROME_BIN || 'chromium', ['--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', `--user-data-dir=${temporary}/chrome`, `--remote-debugging-port=${debugPort}`, 'about:blank']);
  let tab;
  await until(async () => { try { tab = (await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json()).find(t => t.type === 'page'); return !!tab; } catch { return false; } }, 'Chromium did not start; set CHROME_BIN if needed');
  socket = new WebSocket(tab.webSocketDebuggerUrl); await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
  let id = 0; const pending = new Map(), errors = [], renderPayloads = [], publishRequests = [];
  let mockRender=false, holdRender=false, heldRenderId=null, holdPublish=false, heldPublishId=null, failFacebook=true, uncertainUpload=false;
  let failAudio = false, failQuran = false, audioRequests = 0;
  // Chrome invalidates interception IDs when AbortController cancels a request.
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id; pending.set(requestId, { resolve, reject }); socket.send(JSON.stringify({ id: requestId, method, params }));
  });
  const fulfill = (requestId, body, mime, status = 200) => send('Fetch.fulfillRequest', { requestId, responseCode: status,
    responseHeaders: [{ name: 'Content-Type', value: mime }, { name: 'Access-Control-Allow-Origin', value: '*' }],
    body: Buffer.from(body).toString('base64') });
  async function intercept({ requestId, request }) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/quran/')) {
      if (failQuran) return fulfill(requestId, JSON.stringify({ error: 'Fixture service unavailable' }), 'application/json', 502);
      let data;
      if (url.pathname === '/quran/chapters.json') data = [{ number: 1, englishName: 'Al-Faatiha', name: 'الفاتحة', numberOfAyahs: 7 }, { number: 50, englishName: 'Qaf', name: 'ق', numberOfAyahs: 45 }];
      else {
        const count = url.pathname.includes('/50.json') ? 45 : 7;
        data = Array.from({length:count},(_,index)=>({numberInSurah:index+1,arabic:'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',translation:`Fixture translation verse ${index+1}`,transliteration:`Fixture transliteration verse ${index+1}`}));
      }
      return fulfill(requestId, JSON.stringify(data), 'application/json');
    }
    if (request.method === 'POST' && url.pathname.startsWith('/api/publish/')) {
      const provider=url.pathname.split('/').at(-1);
      const key=Object.entries(request.headers).find(([name])=>name.toLowerCase()==='idempotency-key')?.[1];
      publishRequests.push({provider,key,...JSON.parse(request.postData)});
      if(uncertainUpload && provider==='youtube')return send('Fetch.failRequest',{requestId,errorReason:'ConnectionClosed'});
      if(holdPublish && provider==='youtube'){heldPublishId=requestId;return;}
      if(failFacebook && provider==='facebook')return fulfill(requestId,JSON.stringify({success:false,error:'Fixture quota exceeded'}),'application/json',502);
      return fulfill(requestId,JSON.stringify({success:true,postId:`fixture-${provider}`,postUrl:`https://example.com/${provider}`,message:'Video uploaded.'}),'application/json');
    }
    if (request.method === 'POST' && url.pathname === '/api/render-video') {
      const payload=JSON.parse(request.postData);renderPayloads.push(payload);
      if(holdRender){heldRenderId=requestId;return;}
      if(mockRender)return fulfill(requestId,fixtureVideo,'video/mp4');
      if(!payload.videoDataUrl)payload.videoUrl=`${fixtureOrigin}/background.mp4`;
      payload.audioUrls=payload.audioUrls.map(()=>`${fixtureOrigin}/audio.mp3`);
      return send('Fetch.continueRequest',{requestId,postData:Buffer.from(JSON.stringify(payload)).toString('base64')});
    }
    if (url.hostname === 'everyayah.com' || (url.pathname === '/api/proxy' && url.search.includes('everyayah'))) {
      audioRequests++;
      return fulfill(requestId, failAudio ? 'Unavailable' : fixtureAudio, 'audio/mpeg', failAudio ? 503 : 200);
    }
    if (url.protocol === 'https:') {
      if (url.hostname.includes('videos.pexels')) return fulfill(requestId, fixtureVideo, 'video/mp4');
      if (url.hostname.includes('images.pexels')) return fulfill(requestId, fixtureImage, 'image/png');
      if (url.hostname === 'fonts.googleapis.com') return fulfill(requestId, '', 'text/css');
      return send('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' });
    }
    return send('Fetch.continueRequest', { requestId });
  }
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) { const p = pending.get(message.id); pending.delete(message.id); message.error ? p?.reject(new Error(JSON.stringify(message.error))) : p?.resolve(message.result); }
    else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    else if (message.method === 'Fetch.requestPaused') intercept(message.params).catch(error => { if (!error.message.includes('Invalid InterceptionId')) errors.push(error.stack); });
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails)); return result.result.value;
  };
  const click = text => evaluate(`(()=>{const buttons=[...document.querySelectorAll('button')];const button=buttons.find(b=>b.getAttribute('aria-label')===${JSON.stringify(text)})||buttons.find(b=>b.textContent.trim().toLowerCase()===${JSON.stringify(text.toLowerCase())})||buttons.find(b=>b.textContent.includes(${JSON.stringify(text)}));if(!button)throw new Error('Button not found: '+${JSON.stringify(text)});if(button.disabled)throw new Error('Button disabled: '+${JSON.stringify(text)});button.scrollIntoView({block:'nearest'});button.click();})()`);
  const setInput=(label,value)=>evaluate(`(()=>{const input=document.querySelector('[aria-label='+${JSON.stringify(JSON.stringify(label))}+']');if(!input)throw new Error('Input not found');Object.getOwnPropertyDescriptor(input.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  const autoPost = value => evaluate(`(()=>{const input=document.querySelector('[aria-label="Automatically auto-post after export"]');if(input.checked!==${value})input.click();return input.checked;})()`);
  async function capture(name){await evaluate('window.scrollTo(0,0)');const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('/tmp/'+name,Buffer.from(shot.data,'base64'));}
  const textContains = text => evaluate(`(document.body?.innerText || '').includes(${JSON.stringify(text)})`);
  await send('Runtime.enable'); await send('Page.enable'); await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: temporary });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `sessionStorage.setItem('proease_service_key','browser-fixture-key');localStorage.setItem('proease_autopost_on_finish','false');localStorage.setItem('proease_social_sessions_v3','{}');localStorage.setItem('proease_published_history_v1','null');` });
  await send('Page.navigate', { url: appUrl });
  await until(() => textContains('Ready: THE REALITY OF DEATH'), 'Initial lesson did not load');
  await evaluate(`(()=>{const input=document.querySelector('[aria-label="Render engine"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(input,'service');input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.export-action')).backgroundColor"),'rgb(36, 78, 61)');
  assert.equal(await evaluate("[...document.querySelectorAll('.channel-row small')].every(node=>node.textContent==='Not connected')"),true);
  await capture('proease-studio-desktop.png');
  await evaluate("window.postMessage({type:'OAUTH_AUTH_SUCCESS',provider:'youtube',session:{accountName:'Forged account'}},location.origin)");
  await delay(100);assert.equal(await textContains('Forged account'),false);
  await setInput('Search lessons','no-matching-lesson');await until(()=>textContains('No lessons match'), 'Lesson search did not filter');await setInput('Search lessons','');
  await click('Preview Recitation');await until(()=>textContains('Playing THE REALITY OF DEATH'),'Recitation did not preview');await click('Stop');
  await click('Nature Loop');const audioBefore=audioRequests;await click('Preview Nature Loop');await until(()=>textContains('Previewing Nature Loop'),'Nature preview did not start');assert.equal(audioRequests,audioBefore);await click('Stop');
  await click('P.T.P Reflection');await click('Preview Short');await until(()=>textContains('Previewing Reflection Short'),'Reflection did not preview');await click('Stop');assert.equal(await evaluate('window.speechSynthesis.speaking'),false);
  failQuran=true;await click('Full Surahs');await until(()=>textContains('Failed to load Quran texts'),'Service failure did not show an error');
  failQuran=false;await click('Try again');await until(()=>textContains('Ready: Al-Faatiha'),'Retry did not recover the text service');
  await click('Quran Lessons');await until(()=>textContains('Ready: THE REALITY OF DEATH'),'Lesson did not recover');
  failAudio=true;await evaluate("(()=>{const select=document.querySelector('[aria-label=\"Reciter\"]');select.value='ar.alafasy';select.dispatchEvent(new Event('change',{bubbles:true}));})()");
  await until(()=>textContains('Ready: THE REALITY OF DEATH'),'Reciter did not change');await click('Preview Recitation');await until(()=>textContains('Could not load recitation audio'),'Failed audio left playback stuck');failAudio=false;
  await click('Social Accounts');await click('Connect account');await click('Verify & connect');await until(()=>textContains('Enter a valid OAuth access token'),'Empty token accepted');assert.equal(fs.existsSync(path.join(dataDir,'social_sessions.json')),false);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await until(()=>evaluate("!document.querySelector('[role=dialog]')"),'Escape did not close dialog');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await evaluate('window.scrollTo(0,0)');await delay(100);assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'),true,'Mobile page overflows');await capture('proease-studio-mobile.png');
  await click('Open navigation');await click('Publishing history');await until(()=>textContains('Your next story starts here.'),'Empty history did not load');await click('Create a video');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await click('P.T.P Reflection');await click('Scenery');await click('Upload');
  async function upload(selector,name){const {root}=await send('DOM.getDocument');const {nodeId}=await send('DOM.querySelector',{nodeId:root.nodeId,selector});assert.ok(nodeId,selector);await send('DOM.setFileInputFiles',{nodeId,files:[path.join(temporary,name)]});}
  await upload('#customVideoUpload','background.mp4');await click('Style');await upload('#logoUploadInput','logo.png');await delay(200);await click('Content');
  await click('Export video');await until(()=>textContains('1080p MP4 Video ready'),'Real MP4 export did not complete',90000);
  await until(()=>fs.readdirSync(temporary).some(name=>name.includes('PathToPeace')&&name.endsWith('.mp4')),'MP4 download missing');
  const downloaded=fs.readdirSync(temporary).find(name=>name.includes('PathToPeace')&&name.endsWith('.mp4'));
  const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-of','json',path.join(temporary,downloaded)]));assert.equal(probe.streams[0].width,1080);assert.equal(probe.streams[0].height,1920);assert.equal(probe.streams[1].codec_name,'aac');
  assert.ok(renderPayloads.at(-1).overlays[0].startsWith('data:image/png;base64,'));
  await click('Preview Short');await click('Stop');assert.equal(await evaluate("!!document.querySelector('a[download]')"),true,'Preview removed completed download');
  console.log('Browser previews, mobile layout, dialogs and a real 1080p MP4 export passed.');

  // Fake accounts exist only in this isolated server; every publish request is intercepted above.
  const account=id=>({id,name:id==='youtube'?'YouTube & Shorts':'Facebook Page',channelId:id+'-fixture',connected:true,verified:true,autoPost:true,privacy:'public',accountName:'Review fixture',handle:'@fixture',accessToken:'fixture-token-not-real',totalPosts:0});
  fs.writeFileSync(path.join(dataDir,'social_sessions.json'),JSON.stringify({youtube:account('youtube'),facebook:account('facebook')}));
  await send('Page.navigate',{url:appUrl});await until(()=>evaluate("document.querySelectorAll('.channel-row input[type=checkbox]').length===2"),'Fixture accounts did not connect');
  await evaluate(`(()=>{const input=document.querySelector('[aria-label="Render engine"]');input.value='service';input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  mockRender=true;await click('P.T.P Reflection');await autoPost(true);holdRender=true;await click('Export video');await until(()=>Promise.resolve(!!heldRenderId),'Render did not reach fixture');
  await autoPost(false);assert.equal(await evaluate("document.querySelector('[aria-label=\"Automatically auto-post after export\"]').checked"),false);
  await fulfill(heldRenderId,fixtureVideo,'video/mp4');heldRenderId=null;holdRender=false;
  await until(()=>textContains('1080p MP4 Video ready'),'Fixture export did not complete');await delay(1100);assert.equal(publishRequests.length,0,'Turning off Auto-Post during rendering did not stop publishing');
  const assetTitle=await evaluate("document.querySelector('[aria-label=\"Publication title\"]').value");
  await click('Nature Loop');assert.equal(await evaluate("document.querySelector('[aria-label=\"Publication title\"]').value"),assetTitle,'Changing mode changed a completed video’s captions');
  await evaluate("Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});Object.defineProperty(navigator,'share',{configurable:true,value:async payload=>{window.__sharedFile={title:payload.title,name:payload.files[0].name};}})");
  await click('Share video file');assert.equal(await evaluate('window.__sharedFile.title'),assetTitle);assert.ok((await evaluate('window.__sharedFile.name')).includes('PathToPeace_Reflection'));
  holdPublish=true;await click('Publish video');await until(()=>Promise.resolve(!!heldPublishId),'Publish did not start');
  assert.ok(publishRequests[0].videoFileName.includes('PathToPeace_Reflection'));assert.equal(publishRequests[0].title,assetTitle);assert.ok(publishRequests[0].key);assert.equal(Buffer.from(publishRequests[0].videoDataUrl.split(',')[1],'base64').compare(fixtureVideo),0);
  await click('Minimize uploads');await until(()=>evaluate("!document.querySelector('[role=dialog]')"),'Upload dialog did not minimize');await click('View upload progress');
  await fulfill(heldPublishId,JSON.stringify({success:true,postId:'fixture-youtube',postUrl:'https://example.com/youtube',message:'Video uploaded.'}),'application/json');heldPublishId=null;holdPublish=false;
  await until(()=>textContains('Fixture quota exceeded'),'Platform error not shown');await until(()=>evaluate("[...document.querySelectorAll('button')].some(button=>button.textContent==='Done')"),'Publishing did not finish');await click('Done');
  failFacebook=false;await click('Publish video');await until(()=>evaluate("[...document.querySelectorAll('button')].some(button=>button.textContent==='Done')"),'Retry did not finish');await click('Done');
  assert.equal(publishRequests.filter(request=>request.provider==='youtube').length,1,'Retry duplicated successful YouTube upload');
  const facebook=publishRequests.filter(request=>request.provider==='facebook');assert.equal(facebook.length,2);assert.equal(facebook[0].key,facebook[1].key);
  await click('Publishing history');await until(()=>evaluate("document.querySelectorAll('.history-row').length===2"),'Confirmed publishing history is incorrect');await click('Video studio');
  await until(()=>evaluate("document.querySelector('canvas')?.getContext('2d').getImageData(1,1,1,1).data[3]===255"),'Preview did not recover after returning from history');
  uncertainUpload=true;await click('Export video');await until(()=>textContains('1080p MP4 Video ready'),'Second fixture export did not complete');await click('Publish video');
  await until(()=>textContains('The upload could not be confirmed'),'Network ambiguity not shown');await until(()=>evaluate("[...document.querySelectorAll('button')].some(button=>button.textContent==='Done')"),'Ambiguous upload did not finish');await click('Done');
  assert.equal(await evaluate("[...document.querySelectorAll('button')].find(button=>button.textContent==='Publish video').disabled"),true,'Unconfirmed uploads must not be blindly retried');
  assert.deepEqual(errors,[],'Uncaught browser errors');
  console.log('Publishing browser checks passed: frozen metadata, Auto-Post cancellation, exact bytes, idempotency keys, partial-failure retry, minimization, history and ambiguous outcomes. No real social requests were sent.');

} finally {
  socket?.close();
  fixtureServer?.closeAllConnections(); fixtureServer?.close();
  for (const child of children.reverse()) { try { process.kill(-child.pid, 'SIGTERM'); } catch {} }
  await delay(250); fs.rmSync(temporary, { recursive: true, force: true });
}
