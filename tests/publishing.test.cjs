const {test} = require('node:test');
const assert = require('node:assert/strict');
const service = import('../server/publishing.js');

async function harness(options = {}) {
  const store = {sessions:{youtube:{id:'youtube',name:'YouTube',channelId:'channel123',connected:true,verified:true,autoPost:true,accessToken:'access-token-original',totalPosts:0},facebook:{id:'facebook',name:'Facebook',channelId:'page123',connected:true,verified:true,autoPost:true,accessToken:'page-token-original',totalPosts:0}},calls:[],history:[]};
  const {createPublisher}=await service;
  const publish=createPublisher({
    readSessions:()=>structuredClone(store.sessions),
    writeSessions:sessions=>{if(options.failSessions)throw new Error('Disk full');store.sessions=structuredClone(sessions);},
    writeHistory:entry=>{if(options.failHistory)throw new Error('Disk full');store.history.push(entry);},
    fetchImpl:async(url,request)=>{store.calls.push({url,request});return options.fetch?options.fetch(url,request,store):request.method==='POST'&&url.includes('youtube')?new Response('',{headers:{location:'https://upload.example/video'}}):Response.json({id:'confirmed-video-id'});},
    ...(options.configuration||{}),
  });
  const body={title:'A meaningful moment',description:'Description',hashtags:['#Quran'],privacy:'public',videoDataUrl:'data:video/mp4;base64,AQIDBA==',videoFileName:'video.mp4'};
  return {store,body,publish:(provider='youtube',changes={},key='test-operation')=>publish(provider,{...body,...changes},key),raw:publish};
}

test('YouTube uses every required resumable header and uploads the exact video bytes',async()=>{
  const h=await harness();const result=await h.publish();
  assert.equal(result.body.success,true);
  const [start,upload]=h.store.calls;
  assert.equal(start.request.headers.Authorization,'Bearer access-token-original');
  assert.equal(start.request.headers['X-Upload-Content-Length'],'4');
  assert.equal(start.request.headers['X-Upload-Content-Type'],'video/mp4');
  assert.equal(upload.request.headers.Authorization,'Bearer access-token-original');
  assert.equal(upload.request.headers['Content-Length'],'4');
  assert.deepEqual([...upload.request.body],[1,2,3,4]);
  assert.ok(start.request.signal);assert.ok(upload.request.signal);
  assert.equal(h.store.history.length,1);assert.equal(h.store.sessions.youtube.totalPosts,1);
});
test('Quota rejection does not disconnect an account or count as a post',async()=>{
  const h=await harness({fetch:()=>Response.json({error:{message:'Quota exceeded'}},{status:403})});
  const result=await h.publish();assert.equal(result.body.success,false);assert.equal(result.body.authError,false);
  assert.match(result.body.error,/Quota/);assert.equal(h.store.sessions.youtube.connected,true);assert.equal(h.store.history.length,0);
});
test('Expired credentials at either upload stage and Facebook code 190 require reconnection',async()=>{
  for(const scenario of ['initial','upload','facebook']){
    const h=await harness({fetch:(url,request)=>scenario==='upload'&&request.method==='POST'?new Response('',{headers:{location:'https://upload.example/video'}}):Response.json({error:{code:scenario==='facebook'?190:401,message:'Token expired'}},{status:scenario==='facebook'?400:401})});
    const provider=scenario==='facebook'?'facebook':'youtube', result=await h.publish(provider);
    assert.equal(result.body.authError,true);assert.equal(h.store.sessions[provider].connected,false);assert.equal(h.store.sessions[provider].verified,false);assert.equal(h.store.history.length,0);
  }
});
test('Facebook uploads a multipart video and accurately reports draft visibility',async()=>{
  const h=await harness({fetch:(_url,request)=>{
    assert.equal(request.body.get('source').size,4);assert.equal(request.body.get('source').type,'video/mp4');
    assert.equal(request.body.get('published'),'false');return Response.json({id:'facebook123'});
  }});
  const result=await h.publish('facebook',{privacy:'private'});assert.equal(result.body.success,true);assert.equal(result.body.delivery,'draft');assert.match(result.body.message,/draft/);assert.equal(h.store.history.length,1);
});
test('Post-upload disk errors remain confirmed success and retries cannot create another post',async()=>{
  const h=await harness({failSessions:true,failHistory:true});
  const first=await h.publish(), second=await h.publish();
  assert.equal(first.body.success,true);assert.equal(first.body.postId,'confirmed-video-id');assert.match(first.body.warning,/statistics.*history/);
  assert.equal(second.body.postId,first.body.postId);assert.equal(h.store.calls.length,2);
});
test('Upload completion preserves a concurrent disconnect and another account’s preferences',async()=>{
  const h=await harness({fetch:(_url,request,store)=>{
    if(request.method==='POST')return new Response('',{headers:{location:'https://upload.example/video'}});
    store.sessions.youtube.connected=false;store.sessions.youtube.accessToken='';store.sessions.facebook.autoPost=false;
    return Response.json({id:'confirmed-video-id'});
  }});
  const result=await h.publish();assert.equal(result.body.success,true);assert.equal(h.store.sessions.youtube.connected,false);assert.equal(h.store.sessions.youtube.accessToken,'');assert.equal(h.store.sessions.facebook.autoPost,false);
});
test('Concurrent requests for one operation share one upload; a changed caption cannot reuse it',async()=>{
  let release;const waiting=new Promise(resolve=>release=resolve);
  const h=await harness({fetch:async(_url,request)=>{if(request.method==='POST')return new Response('',{headers:{location:'https://upload.example/video'}});await waiting;return Response.json({id:'one-video'});}});
  const first=h.publish(),second=h.publish();await new Promise(resolve=>setImmediate(resolve));release();
  assert.equal((await first).body.postId,'one-video');assert.equal((await second).body.postId,'one-video');assert.equal(h.store.calls.length,2);
  assert.equal((await h.publish('youtube',{title:'Another title'})).status,409);assert.equal(h.store.calls.length,2);
});
test('Control requests have bounded timeouts and do not leave uploads pending',async()=>{
  const h=await harness({configuration:{requestTimeoutMs:5},fetch:(_url,request)=>new Promise((resolve,reject)=>request.signal.addEventListener('abort',()=>reject(new Error('Aborted')),{once:true}))});
  const result=await h.publish();assert.equal(result.status,504);assert.equal(result.body.success,false);assert.equal(result.body.uncertain,false);assert.equal(h.store.history.length,0);
});
test('A lost YouTube upload response is reconciled against the same upload session',async()=>{
  const h=await harness({configuration:{uploadTimeoutMs:5},fetch:(_url,request)=>{
    if(request.method==='POST')return new Response('',{headers:{location:'https://upload.example/video'}});
    if(request.headers['Content-Range']){assert.equal(request.headers.Authorization,'Bearer access-token-original');assert.equal(request.headers['Content-Range'],'bytes */4');return Response.json({id:'already-uploaded'});}
    return new Promise((resolve,reject)=>request.signal.addEventListener('abort',()=>reject(new Error('Aborted')),{once:true}));
  }});
  assert.equal((await h.publish()).body.postId,'already-uploaded');assert.equal(h.store.calls.length,3);assert.equal(h.store.history.length,1);
});
test('Unconfirmed Facebook uploads are marked for review and are not blindly repeated',async()=>{
  const h=await harness({configuration:{uploadTimeoutMs:5},fetch:(_url,request)=>new Promise((resolve,reject)=>request.signal.addEventListener('abort',()=>reject(new Error('Aborted')),{once:true}))});
  const first=await h.publish('facebook'),retry=await h.publish('facebook');
  assert.equal(first.body.uncertain,true);assert.equal(retry.body.uncertain,true);assert.equal(h.store.calls.length,1);assert.equal(h.store.history.length,0);
});
test('Token refresh uses the renewed token without overwriting a disconnected account',async()=>{
  for(const disconnect of [false,true]){
    const h=await harness({configuration:{googleClientId:'client',googleClientSecret:'secret'},fetch:(url,request,store)=>{
      if(url.includes('oauth2')){if(disconnect){store.sessions.youtube.connected=false;store.sessions.youtube.accessToken='';}return Response.json({access_token:'renewed',expires_in:3600});}
      assert.equal(request.headers.Authorization,'Bearer renewed');return request.method==='POST'?new Response('',{headers:{location:'https://upload.example/video'}}):Response.json({id:'renewed-token-video'});
    }});
    h.store.sessions.youtube.refreshToken='refresh-token';h.store.sessions.youtube.expiresAt=0;
    const result=await h.publish();assert.equal(result.status,disconnect?409:200);assert.equal(h.store.sessions.youtube.connected,!disconnect);assert.equal(h.store.calls.length,disconnect?1:3);
  }
});
test('Invalid inputs, absent media, disconnected sessions and unsupported providers never reach a platform',async()=>{
  const h=await harness({fetch:()=>{throw new Error('Unexpected network call');}});
  for(const changes of [{title:null},{hashtags:'bad'},{hashtags:[{}]},{privacy:'bad'},{videoDataUrl:undefined}])assert.equal((await h.publish('youtube',changes)).status,400);
  assert.equal((await h.raw('youtube',null)).status,400);
  for(const provider of ['tiktok','instagram'])assert.equal((await h.publish(provider)).status,401);
  assert.equal((await h.publish('unknown')).status,400);
  h.store.sessions.youtube.connected=false;assert.equal((await h.publish()).status,401);assert.equal(h.store.calls.length,0);
});

test('An unavailable upload-status check remains uncertain and cannot cause a duplicate retry',async()=>{
  const h=await harness({fetch:(_url,request)=>{
    if(request.method==='POST')return new Response('',{headers:{location:'https://upload.example/video'}});
    if(request.headers['Content-Range'])return Response.json({error:{message:'Unavailable'}},{status:503});
    throw new Error('Connection lost after sending the video');
  }});
  assert.equal((await h.publish()).body.uncertain,true);assert.equal((await h.publish()).body.uncertain,true);assert.equal(h.store.calls.length,3);assert.equal(h.store.history.length,0);
});
test('Malformed platform IDs are never counted as a confirmed upload',async()=>{
  const h=await harness({fetch:()=>Response.json({id:{malformed:true}})});
  const result=await h.publish('facebook');assert.equal(result.body.success,false);assert.equal(result.body.uncertain,true);assert.equal(h.store.history.length,0);
});
