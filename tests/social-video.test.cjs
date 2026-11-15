const {test}=require('node:test');
const assert=require('node:assert/strict');
async function harness(provider,respond){
 const {createPublisher}=await import('../server/publishing.js');
 const store={sessions:{[provider]:{id:provider,channelId:provider==='instagram'?'ig123':'open123',connected:true,verified:true,accessToken:'fixture-access',totalPosts:0}},calls:[],history:[]};
 const publish=createPublisher({readSessions:()=>structuredClone(store.sessions),writeSessions:value=>{store.sessions=structuredClone(value);},writeHistory:entry=>store.history.push(entry),prepareVideo:async(buffer,mime)=>({buffer,mime,duration:10}),fetchImpl:async(url,request)=>{store.calls.push({url,request});return respond(url,request,store);}});
 const body={title:'A lesson',description:'Description',hashtags:['#Quran'],privacy:'public',tiktokPrivacy:'SELF_ONLY',videoDataUrl:'data:video/mp4;base64,AQIDBA==',disableDuet:true,disableStitch:true,disableComment:false};
 return{store,body,publish:(changes={})=>publish(provider,{...body,...changes},'fixture-operation'),status:id=>publish.getStatus(id)};
}
const creator=()=>Response.json({data:{privacy_level_options:['SELF_ONLY','PUBLIC_TO_EVERYONE'],max_video_post_duration_sec:60,duet_disabled:true},error:{code:'ok'}});
test('TikTok uploads exact bytes with explicit privacy and counts only confirmed publication',async()=>{
 let checks=0;
 const h=await harness('tiktok',(url,request)=>{
  if(url.includes('creator_info'))return creator();
  if(url.includes('video/init')){const data=JSON.parse(request.body);assert.equal(data.post_info.privacy_level,'SELF_ONLY');assert.equal(data.post_info.disable_duet,true);assert.equal(data.post_info.disable_comment,false);assert.equal(data.source_info.total_chunk_count,1);return Response.json({data:{publish_id:'publish123',upload_url:'https://upload.example/tiktok'},error:{code:'ok'}});}
  if(url.includes('upload.example')){assert.equal(request.headers['Content-Range'],'bytes 0-3/4');assert.equal(request.headers['Content-Length'],'4');assert.deepEqual([...request.body],[1,2,3,4]);return new Response('',{status:201});}
  if(url.includes('status/fetch'))return Response.json({data:{status:++checks===1?'PROCESSING_UPLOAD':'PUBLISH_COMPLETE'},error:{code:'ok'}});
  throw new Error('Unexpected request');
 });
 const initial=await h.publish();assert.equal(initial.status,202);assert.equal(initial.body.pending,true);assert.equal(h.store.history.length,0);assert.equal(h.store.sessions.tiktok.totalPosts,0);
 assert.equal((await h.status(initial.body.operationId)).body.pending,true);
 const completed=await h.status(initial.body.operationId);assert.equal(completed.body.success,true);assert.equal(completed.body.delivery,'private');assert.equal(h.store.history.length,1);assert.equal(h.store.sessions.tiktok.totalPosts,1);
 assert.equal((await h.publish()).body.postId,'publish123');assert.equal((await h.status(initial.body.operationId)).body.postId,'publish123');assert.equal(h.store.history.length,1);assert.equal(checks,2);
});
test('TikTok refuses absent visibility and videos exceeding creator limits before initializing upload',async()=>{
 const h=await harness('tiktok',()=>creator());
 assert.equal((await h.publish({tiktokPrivacy:''})).status,400);assert.equal(h.store.calls.length,1);
 const long=await harness('tiktok',()=>Response.json({data:{privacy_level_options:['SELF_ONLY'],max_video_post_duration_sec:5},error:{code:'ok'}}));
 assert.match((await long.publish()).body.error,/up to 5 seconds/);assert.equal(long.store.calls.length,1);
});
test('Instagram resumable upload waits for processing before publishing exactly once',async()=>{
 let checks=0,publishes=0;
 const h=await harness('instagram',(url,request)=>{
  if(url.endsWith('/ig123/media')){const data=JSON.parse(request.body);assert.equal(data.media_type,'REELS');assert.equal(data.upload_type,'resumable');return Response.json({id:'container123'});}
  if(url.includes('rupload.facebook.com')){assert.equal(request.headers.Authorization,'OAuth fixture-access');assert.equal(request.headers.file_size,'4');assert.equal(request.headers.offset,'0');assert.deepEqual([...request.body],[1,2,3,4]);return Response.json({success:true});}
  if(url.includes('/container123?'))return Response.json({status_code:++checks===1?'IN_PROGRESS':'FINISHED'});
  if(url.endsWith('/ig123/media_publish')){publishes++;assert.equal(JSON.parse(request.body).creation_id,'container123');return Response.json({id:'reel123'});}
  if(url.includes('/reel123?'))return Response.json({permalink:'https://www.instagram.com/reel/example/'});
  throw new Error('Unexpected request');
 });
 const first=await h.publish();assert.equal(first.status,202);assert.equal(h.store.history.length,0);
 assert.equal((await h.status(first.body.operationId)).body.pending,true);assert.equal(publishes,0);
 const done=await h.status(first.body.operationId);assert.equal(done.body.postId,'reel123');assert.equal(done.body.postUrl,'https://www.instagram.com/reel/example/');assert.equal(h.store.sessions.instagram.totalPosts,1);
 await h.status(first.body.operationId);await h.publish();assert.equal(publishes,1);assert.equal(h.store.history.length,1);
});
test('A temporary platform status failure can be retried without uploading the video again',async()=>{
 let checks=0;
 const h=await harness('tiktok',url=>url.includes('creator_info')?creator():url.includes('video/init')?Response.json({data:{publish_id:'p',upload_url:'https://upload.example/tiktok'},error:{code:'ok'}}):url.includes('upload.example')?new Response('',{status:201}):++checks===1?Response.json({error:{code:'internal_error',message:'Temporary failure'}},{status:500}):Response.json({data:{status:'PUBLISH_COMPLETE'},error:{code:'ok'}}));
 const initial=await h.publish();const failure=await h.status(initial.body.operationId);assert.equal(failure.body.pending,true);assert.equal(failure.body.success,false);
 assert.equal((await h.status(initial.body.operationId)).body.success,true);assert.equal(h.store.calls.filter(call=>call.url.includes('video/init')).length,1);assert.equal(h.store.history.length,1);
});
test('An expired Instagram token during processing requires reconnection and never counts a post',async()=>{
 const h=await harness('instagram',url=>url.endsWith('/ig123/media')?Response.json({id:'container123'}):url.includes('rupload')?Response.json({success:true}):Response.json({error:{code:190,message:'Token expired'}},{status:400}));
 const initial=await h.publish();const result=await h.status(initial.body.operationId);assert.equal(result.body.authError,true);assert.equal(h.store.sessions.instagram.connected,false);assert.equal(h.store.history.length,0);
});
test('Losing the final Instagram publication response requires review instead of creating another reel',async()=>{
 let publishes=0;
 const h=await harness('instagram',url=>{
  if(url.endsWith('/ig123/media'))return Response.json({id:'container123'});
  if(url.includes('rupload'))return Response.json({success:true});
  if(url.includes('/container123?'))return Response.json({status_code:'FINISHED'});
  if(url.endsWith('media_publish')){publishes++;throw new Error('Connection closed');}
 });
 const initial=await h.publish();assert.equal((await h.status(initial.body.operationId)).body.uncertain,true);assert.equal((await h.publish()).body.uncertain,true);assert.equal(publishes,1);assert.equal(h.store.history.length,0);
});
