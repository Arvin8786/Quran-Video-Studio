const failure=(message,details={})=>Object.assign(new Error(message),{status:502,...details});
function check(provider,result){const {response,data}=result;const error=provider==='tiktok'?data.error?.code&&data.error.code!=='ok':data.error;if(!response.ok||error)throw failure(data.error?.message||`${provider} rejected this request (${response.status}).`,{authError:response.status===401||data.error?.code===190||data.error?.code==='access_token_invalid'});return data;}
export async function getTikTokCreator(request,token){
 const data=check('tiktok',await request('https://open.tiktokapis.com/v2/post/publish/creator_info/query/',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:'{}'}));
 if(!Array.isArray(data.data?.privacy_level_options))throw failure('TikTok creator permissions were not returned.');return data.data;
}
export async function publishTikTok({request,session,input,video,mime,duration,uploadTimeoutMs}){
 const creator=await getTikTokCreator(request,session.accessToken);
 if(!creator.privacy_level_options.includes(input.tiktokPrivacy))throw failure('Choose a TikTok visibility option supported by this account before publishing.',{status:400});
 if(!Number.isFinite(duration))throw failure('The video duration could not be verified. Re-export this video.');
 if(duration>creator.max_video_post_duration_sec)throw failure(`This TikTok account allows up to ${creator.max_video_post_duration_sec} seconds. Choose a shorter Quran lesson for TikTok.`,{status:400});
 const headers={Authorization:`Bearer ${session.accessToken}`,'Content-Type':'application/json'};
 const chunkSize=Math.min(video.length,64*1024*1024),chunkCount=Math.max(1,Math.floor(video.length/chunkSize));
 const started=check('tiktok',await request('https://open.tiktokapis.com/v2/post/publish/video/init/',{method:'POST',headers,body:JSON.stringify({post_info:{title:`${input.title}\n${input.hashtags.join(' ')}`.slice(0,2200),privacy_level:input.tiktokPrivacy,disable_duet:creator.duet_disabled||input.disableDuet!==false,disable_stitch:creator.stitch_disabled||input.disableStitch!==false,disable_comment:creator.comment_disabled||input.disableComment!==false,brand_content_toggle:false,brand_organic_toggle:false},source_info:{source:'FILE_UPLOAD',video_size:video.length,chunk_size:chunkSize,total_chunk_count:chunkCount}})}));
 const {upload_url:uploadUrl,publish_id:publishId}=started.data||{};
 if(!uploadUrl?.startsWith('https://')||!publishId)throw failure('TikTok did not provide an upload session.');
 for(let index=0;index<chunkCount;index++){
  const start=index*chunkSize,end=index===chunkCount-1?video.length:Math.min(video.length,start+chunkSize),chunk=video.subarray(start,end);
  const result=await request(uploadUrl,{method:'PUT',headers:{'Content-Type':mime,'Content-Length':String(chunk.length),'Content-Range':`bytes ${start}-${end-1}/${video.length}`},body:new Uint8Array(chunk)},uploadTimeoutMs);
  if(!result.response.ok)throw failure('TikTok did not accept the video bytes. Please retry.');
 }
 const resume=async()=>{
  const data=check('tiktok',await request('https://open.tiktokapis.com/v2/post/publish/status/fetch/',{method:'POST',headers,body:JSON.stringify({publish_id:publishId})}));
  const status=data.data?.status;
  if(status==='FAILED')throw failure(`TikTok could not publish this video: ${data.data.fail_reason||'processing failed'}.`,{permanent:true});
  if(status!=='PUBLISH_COMPLETE')return {pending:true,resume,message:'TikTok is processing your uploaded video.'};
  const id=(data.data.publicaly_available_post_id||data.data.publicly_available_post_id)?.[0];
  return {id:id||publishId,idKind:id?'post':'publish',confirmed:true,delivery:input.tiktokPrivacy==='SELF_ONLY'?'private':'uploaded',postUrl:id&&session.username?`https://www.tiktok.com/@${encodeURIComponent(session.username)}/video/${encodeURIComponent(id)}`:'https://www.tiktok.com/',message:input.tiktokPrivacy==='SELF_ONLY'?'Video posted privately on TikTok.':'TikTok confirmed publication.'};
 };
 return {pending:true,resume,message:'Video uploaded. Waiting for TikTok to confirm publication.'};
}
export async function publishInstagram({request,session,input,video,mime,graphApi,uploadTimeoutMs}){
 if(input.privacy!=='public')throw failure('Instagram API publishing uses your professional account’s visibility. Choose Public to confirm posting.',{status:400});
 if(!mime.includes('mp4'))throw failure('Instagram requires an MP4 export. Use the processing service or record with Chrome/Edge.',{status:400});
 const authorization=`Bearer ${session.accessToken}`,headers={Authorization:authorization,'Content-Type':'application/json'};
 const started=check('instagram',await request(`${graphApi}/${encodeURIComponent(session.channelId)}/media`,{method:'POST',headers,body:JSON.stringify({media_type:'REELS',upload_type:'resumable',caption:`${input.title}\n\n${input.description}\n\n${input.hashtags.join(' ')}`.slice(0,2200),share_to_feed:true})}));
 if(!started.id)throw failure('Instagram did not return a media container.');
 const version=new URL(graphApi).pathname.replace(/\//g,'');const uploadUrl=`https://rupload.facebook.com/ig-api-upload/${version}/${encodeURIComponent(started.id)}`;
 const uploaded=await request(uploadUrl,{method:'POST',headers:{Authorization:`OAuth ${session.accessToken}`,offset:'0',file_size:String(video.length),'Content-Type':mime},body:new Uint8Array(video)},uploadTimeoutMs);
 check('instagram',uploaded);if(uploaded.data.success!==true)throw failure('Instagram did not confirm the video upload.');
 const resume=async()=>{
  const state=check('instagram',await request(`${graphApi}/${encodeURIComponent(started.id)}?fields=status_code,status`,{headers:{Authorization:authorization}}));
  if(['ERROR','EXPIRED'].includes(state.status_code))throw failure(state.status||'Instagram could not process this video.',{permanent:true});
  if(state.status_code!=='FINISHED')return {pending:true,resume,message:'Instagram is processing your uploaded reel.'};
  let published;
  try{published=await request(`${graphApi}/${encodeURIComponent(session.channelId)}/media_publish`,{method:'POST',headers,body:JSON.stringify({creation_id:started.id})});}catch{throw failure('Instagram may have published the reel. Check your account before trying again.',{uncertain:true});}
  const media=check('instagram',published);if(!media.id)throw failure('Instagram did not confirm publication. Check your account.',{uncertain:true});
  let postUrl='https://www.instagram.com/';try{const info=await request(`${graphApi}/${encodeURIComponent(media.id)}?fields=permalink`,{headers:{Authorization:authorization}});if(info.data.permalink?.startsWith('https://www.instagram.com/'))postUrl=info.data.permalink;}catch{}
  return {id:media.id,postUrl,confirmed:true,message:'Instagram confirmed publication.'};
 };
 return {pending:true,resume,message:'Video uploaded. Waiting for Instagram to finish processing.'};
}
