import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';

// Real MediaRecorder and static build. External recitation bytes are local fixtures.
// No social credentials or live publication requests are used.
const root=path.resolve(import.meta.dirname,'..');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'quran-pages-'));
const prefix='/Quran-Video-Studio/';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let server,service,chrome,socket;
async function until(check,message,timeout=20000){const end=Date.now()+timeout;while(Date.now()<end){if(await check())return;await delay(100);}throw new Error(message);}
async function listen(server){await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return `http://127.0.0.1:${server.address().port}`;}
try{
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','sine=frequency=440:duration=0.6','-c:a','libmp3lame',path.join(temporary,'audio.mp3')]);
 const audio=fs.readFileSync(path.join(temporary,'audio.mp3'));
 const apiRequests=[];
 server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.includes('/api/'))apiRequests.push(url.pathname);
  if(!url.pathname.startsWith(prefix)){res.writeHead(404);res.end();return;}
  const name=decodeURIComponent(url.pathname.slice(prefix.length))||'index.html';
  const file=path.resolve(root,'dist',name);
  if(!file.startsWith(path.join(root,'dist')+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.txt':'text/plain'}[path.extname(file)]||'application/octet-stream';
  res.writeHead(200,{'Content-Type':mime});fs.createReadStream(file).pipe(res);
 });
 const origin=await listen(server);
 const probe=http.createServer();const debugOrigin=await listen(probe);const debugPort=new URL(debugOrigin).port;await new Promise(resolve=>probe.close(resolve));
 chrome=spawn(process.env.CHROME_BIN||'chromium',['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required',`--user-data-dir=${temporary}/chrome`,`--remote-debugging-port=${debugPort}`,'about:blank'],{stdio:'ignore',detached:true});
 let tab;await until(async()=>{try{tab=(await(await fetch(`${debugOrigin}/json/list`)).json()).find(item=>item.type==='page');return !!tab;}catch{return false;}},'Chromium did not start');
 socket=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
 let id=0;const pending=new Map(),errors=[],audioUrls=new Set(),googleRequests=[];
 const send=(method,params={})=>new Promise((resolve,reject)=>{const messageId=++id;pending.set(messageId,{resolve,reject});socket.send(JSON.stringify({id:messageId,method,params}));});
 const fulfill=(requestId,body,mime)=>send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:mime},{name:'Access-Control-Allow-Origin',value:'*'}],body:Buffer.from(body).toString('base64')});
 socket.addEventListener('message',event=>{
  const message=JSON.parse(event.data);
  if(message.id){const call=pending.get(message.id);pending.delete(message.id);message.error?call?.reject(new Error(JSON.stringify(message.error))):call?.resolve(message.result);}
  else if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);
  else if(message.method==='Fetch.requestPaused'){
   const {requestId,request}=message.params;const url=new URL(request.url);let response;const header=name=>Object.entries(request.headers||{}).find(([key])=>key.toLowerCase()===name)?.[1];
   if(request.method==='OPTIONS'&&['www.googleapis.com'].includes(url.hostname)){response=send('Fetch.fulfillRequest',{requestId,responseCode:204,responseHeaders:[{name:'Access-Control-Allow-Origin',value:'*'},{name:'Access-Control-Allow-Methods',value:'GET, POST, PUT'},{name:'Access-Control-Allow-Headers',value:'authorization, content-type, x-upload-content-type, x-upload-content-length'}],body:''});}
   else if(url.hostname==='accounts.google.com'&&url.pathname==='/gsi/client'){googleRequests.push('signin-library');response=fulfill(requestId,"window.google={accounts:{oauth2:{initTokenClient:o=>({requestAccessToken:()=>setTimeout(()=>o.callback({access_token:'fixture-google-token',expires_in:3600}),20)}),hasGrantedAllScopes:()=>true,revoke:(t,c)=>c&&c()}}};",'application/javascript');}
   else if(url.hostname==='www.googleapis.com'&&url.pathname==='/youtube/v3/channels'){googleRequests.push('channel:'+header('authorization'));response=fulfill(requestId,JSON.stringify({items:[{id:'UC-fixture',snippet:{title:'Fixture Channel',customUrl:'@fixture'}}]}),'application/json');}
   else if(url.hostname==='www.googleapis.com'&&url.pathname==='/upload/youtube/v3/videos'&&url.searchParams.get('uploadType')==='resumable'){googleRequests.push('start:'+header('x-upload-content-length'));response=send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Access-Control-Allow-Origin',value:'*'},{name:'Access-Control-Expose-Headers',value:'Location'},{name:'Location',value:'https://www.googleapis.com/upload/youtube/v3/videos?upload_id=fixture'}],body:''});}
   else if(url.hostname==='www.googleapis.com'&&url.searchParams.get('upload_id')==='fixture'){googleRequests.push('upload:'+request.method);response=fulfill(requestId,JSON.stringify({id:'fixture-video',status:{privacyStatus:'public'}}),'application/json');}
   else if(url.hostname==='everyayah.com'){audioUrls.add(url.pathname);response=fulfill(requestId,audio,'audio/mpeg');}
   else if(url.hostname==='fonts.googleapis.com')response=fulfill(requestId,'','text/css');
   else if(url.protocol==='https:')response=send('Fetch.failRequest',{requestId,errorReason:'BlockedByClient'});
   else response=send('Fetch.continueRequest',{requestId});
   response.catch(error=>{if(!error.message.includes('Invalid InterceptionId'))errors.push(error.message);});
  }
 });
 const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value;};
 const click=label=>evaluate(`(()=>{const buttons=[...document.querySelectorAll('button')];const button=buttons.find(b=>b.getAttribute('aria-label')===${JSON.stringify(label)})||buttons.find(b=>b.textContent.trim()===${JSON.stringify(label)})||buttons.find(b=>b.textContent.includes(${JSON.stringify(label)}));if(!button)throw new Error('Missing button: '+${JSON.stringify(label)});if(button.disabled)throw new Error('Disabled button: '+${JSON.stringify(label)});button.click();})()`);
 const contains=text=>evaluate(`(document.body?.innerText||'').includes(${JSON.stringify(text)})`);
 const setInput=(label,value)=>evaluate(`(()=>{const input=document.querySelector('[aria-label="'+${JSON.stringify(label)}+'"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
 await send('Runtime.enable');await send('Page.enable');await send('Fetch.enable',{patterns:[{urlPattern:'*'}]});
 await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:temporary});
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:origin+prefix});
 await until(()=>contains('Ready: THE REALITY OF DEATH'),'Bundled lesson did not load from project path');
 assert.equal(await evaluate("document.querySelector('[aria-label=\"Render engine\"]').value"),'browser');
 await click('Connect');await until(()=>contains('Post to YouTube straight from this page'),'YouTube did not offer direct sign-in without a server');
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
 await click('Publishing service settings');await until(()=>contains('Set up your publishing server'),'Service setup did not open');
 await setInput('Service URL','https://arvin8786.github.io/auth/callback');await click('Save connection');await until(()=>contains('This is a GitHub Pages address'),'A Pages callback was accepted as the publishing service');
 assert.equal(await evaluate("document.querySelector('a[href*=\"render.com/deploy\"]')?.textContent.includes('Deploy on Render')"),true);
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
 await click('Full Surahs');await until(()=>contains('Ready: Al-Fatihah'),'Complete Surah did not load');
 assert.equal(await evaluate("document.querySelector('[aria-label=\"Choose a Surah\"]').options.length"),115);
 assert.equal(await contains('7 verses'),true);
 await evaluate("window.__recordedVerses=[];new MutationObserver(()=>{const match=document.querySelector('.render-overlay strong')?.textContent.match(/Recording verse (\\d+) of 7/);if(match&&!window.__recordedVerses.includes(Number(match[1])))window.__recordedVerses.push(Number(match[1]));}).observe(document.body,{childList:true,subtree:true,characterData:true});");
 await click('Export video');await until(()=>contains('Full video ready'),'Full recording did not finish',45000);
 await until(()=>fs.readdirSync(temporary).some(name=>name.includes('_Full_1080p.')&&!name.endsWith('.crdownload')),'Complete video was not downloaded');
 const file=fs.readdirSync(temporary).find(name=>name.includes('_Full_1080p.')&&!name.endsWith('.crdownload'));
 const media=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',path.join(temporary,file)]));
 const video=media.streams.find(stream=>stream.codec_type==='video'),sound=media.streams.find(stream=>stream.codec_type==='audio');
 assert.equal(video.width,1920);assert.equal(video.height,1080);assert.ok(sound,'Recitation audio is missing');
 assert.ok(Number(media.format.duration)>=4.15,`Full seven-verse audio was cut short: ${media.format.duration}s`);
 assert.deepEqual(await evaluate('window.__recordedVerses'),[1,2,3,4,5,6,7]);
 assert.equal(audioUrls.size>=7,true);assert.deepEqual(apiRequests,[],'The static build tried to use a nonexistent Pages API');
 assert.equal(await evaluate("!!document.querySelector('[aria-label=\"Download full video\"]')"),true);
 // Publish to YouTube from the static page, with no server, through Google's browser sign-in.
 await click('Connect');await until(()=>contains('Post to YouTube straight from this page'),'YouTube sign-in did not open');
 await setInput('Google OAuth client ID','fixture-client.apps.googleusercontent.com');await click('Sign in with Google');
 await until(()=>contains('YouTube connected: Fixture Channel'),'Direct YouTube sign-in did not connect');
 await click('Publish video');await until(()=>contains('Uploaded to YouTube'),'Direct YouTube upload did not finish');
 assert.deepEqual(googleRequests.filter(item=>!item.startsWith('signin')),['channel:Bearer fixture-google-token',`start:${fs.statSync(path.join(temporary,file)).size}`,'upload:PUT']);
 await click('Done');assert.deepEqual(apiRequests,[],'Direct YouTube publishing used a server API');
 const screenshot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('/tmp/quran-pages-desktop.png',Buffer.from(screenshot.data,'base64'));
 // A cancelled recording must never expose a new, incomplete download.
 await click('Export video');await until(()=>contains('Recording verse'),'Second recording did not start');await click('Cancel export');
 await until(()=>contains('Video processing cancelled.'),'Recording cancellation did not settle');
 assert.equal(await evaluate("!!document.querySelector('[aria-label=\"Download full video\"]')"),false);
 assert.equal(fs.readdirSync(temporary).filter(name=>name.includes('_Full_1080p.')).length,1);
 // Connect a separate local service through the same cross-origin interface used on Pages.
 let serviceCalls=0;
 service=http.createServer((req,res)=>{
  res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  assert.equal(req.headers.authorization,'Bearer fixture-studio-key');serviceCalls++;
  res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({sessions:{},configuredProviders:{},callbackUrl:'https://service.example/auth/callback'}));
 });
 const serviceOrigin=await listen(service);
 await click('Publishing service settings');await setInput('Service URL','https://service.example/invalid-path');await click('Save connection');await until(()=>contains('Enter an HTTPS service origin'),'Invalid service URL was accepted');
 await setInput('Service URL',serviceOrigin);await setInput('Studio access key','fixture-studio-key');await click('Save connection');await until(()=>contains('Publishing service connected.'),'Configured publishing service did not connect');assert.equal(serviceCalls,1);
 assert.equal(await evaluate("sessionStorage.getItem('proease_service_key')"),'fixture-studio-key');
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await delay(150);
 assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'Static mobile interface overflows');
 assert.deepEqual(errors,[],'Uncaught browser errors');
 console.log(`GitHub Pages checks passed: 114 bundled Surahs, all seven recorded verses, ${Number(media.format.duration).toFixed(2)}s complete ${path.extname(file)} video/audio, cancellation, cross-origin service/key setup and mobile layout.`);
}finally{
 socket?.close();server?.closeAllConnections();server?.close();service?.closeAllConnections();service?.close();if(chrome)try{process.kill(-chrome.pid,'SIGTERM');}catch{}
 await delay(250);fs.rmSync(temporary,{recursive:true,force:true});
}
