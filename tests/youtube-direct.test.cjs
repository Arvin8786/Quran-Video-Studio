const {test}=require('node:test');
const assert=require('node:assert/strict');
const storage=()=>{const values=new Map();return{getItem:key=>values.has(key)?values.get(key):null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};};
function setup({channels={items:[{id:'UC-fixture',snippet:{title:'Quran Channel',customUrl:'@quran'}}]},uploadStatus=200,video={id:'video-1',status:{privacyStatus:'public'}}}={}){
 const calls={fetch:[],put:null,consents:[]};
 global.localStorage=storage();global.sessionStorage=storage();
 global.google={accounts:{oauth2:{initTokenClient:options=>({requestAccessToken:({prompt})=>{calls.consents.push(prompt);options.callback({access_token:'token-'+calls.consents.length,expires_in:3600});}}),hasGrantedAllScopes:()=>true,revoke:()=>{}}}};
 global.fetch=async(url,options={})=>{calls.fetch.push({url,options});
  if(url.includes('/channels'))return Response.json(channels);
  if(url.includes('uploadType=resumable'))return new Response('',{status:200,headers:{Location:'https://www.googleapis.com/upload/youtube/v3/videos?upload_id=abc'}});
  throw new Error('Unexpected '+url);};
 global.XMLHttpRequest=class{constructor(){this.upload={};this.headers={};}open(method,url){this.method=method;this.url=url;}setRequestHeader(name,value){this.headers[name]=value;}
  send(body){calls.put={method:this.method,url:this.url,body,headers:this.headers};this.upload.onprogress?.({lengthComputable:true,loaded:5,total:10});this.status=uploadStatus;this.responseText=JSON.stringify(uploadStatus===200?video:{error:{message:'Upload rejected'}});this.onload();}};
 return calls;
}
const module_=import('../src/youtube-direct.js');
const file={size:10,type:'video/mp4'},metadata={title:'Surah Al-Fatihah',description:'Recitation',hashtags:['#Quran','#Recitation']};

test('Only a real Google OAuth client ID is accepted',async()=>{
 const yt=await module_;setup();
 assert.throws(()=>yt.saveGoogleClientId('AIzaSy-an-api-key'),/apps\.googleusercontent\.com/);
 assert.equal(yt.saveGoogleClientId(' 123-abc.apps.googleusercontent.com '),'123-abc.apps.googleusercontent.com');
 assert.equal(yt.googleClientId(),'123-abc.apps.googleusercontent.com');
});

test('Connecting saves the YouTube channel; a Google account without a channel is refused',async()=>{
 const yt=await module_;let calls=setup();yt.saveGoogleClientId('123-abc.apps.googleusercontent.com');
 const profile=await yt.connectYoutube('unlisted');
 assert.equal(profile.channelId,'UC-fixture');assert.equal(profile.privacy,'unlisted');assert.deepEqual(calls.consents,['consent']);
 assert.equal(yt.youtubeProfile().accountName,'Quran Channel');
 calls=setup({channels:{items:[]}});yt.saveGoogleClientId('123-abc.apps.googleusercontent.com');
 await assert.rejects(yt.connectYoutube(),/no YouTube channel/);assert.equal(yt.youtubeProfile(),null);
});

test('Uploads send the complete file with metadata and reuse the sign-in for an hour',async()=>{
 const yt=await module_;const calls=setup();yt.saveGoogleClientId('123-abc.apps.googleusercontent.com');
 await yt.connectYoutube();const progress=[];
 const result=await yt.uploadToYoutube({file,metadata,privacy:'public',onProgress:value=>progress.push(value)});
 assert.equal(result.id,'video-1');assert.match(result.postUrl,/studio\.youtube\.com\/video\/video-1/);
 const start=calls.fetch.find(call=>call.url.includes('resumable'));const body=JSON.parse(start.options.body);
 assert.equal(start.options.headers.Authorization,'Bearer token-1');assert.equal(start.options.headers['X-Upload-Content-Length'],'10');
 assert.equal(body.snippet.title,'Surah Al-Fatihah');assert.deepEqual(body.snippet.tags,['Quran','Recitation']);assert.equal(body.status.privacyStatus,'public');
 assert.equal(calls.put.method,'PUT');assert.equal(calls.put.body,file);assert.deepEqual(progress,[50]);assert.deepEqual(calls.consents,['consent']);
});

test('A video YouTube kept private says so, and rejected uploads fail without claiming success',async()=>{
 const yt=await module_;setup({video:{id:'video-2',status:{privacyStatus:'private'}}});yt.saveGoogleClientId('123-abc.apps.googleusercontent.com');
 assert.match((await yt.uploadToYoutube({file,metadata,privacy:'public'})).message,/kept it private.*YouTube Studio/);
 setup({uploadStatus:403});yt.saveGoogleClientId('123-abc.apps.googleusercontent.com');
 await assert.rejects(yt.uploadToYoutube({file,metadata}),/Upload rejected/);
});

test('Disconnecting forgets the channel and sign-in on this device',async()=>{
 const yt=await module_;setup();yt.saveGoogleClientId('123-abc.apps.googleusercontent.com');await yt.connectYoutube();
 yt.disconnectYoutube();assert.equal(yt.youtubeProfile(),null);assert.equal(sessionStorage.getItem('proease_youtube_token'),null);
});
