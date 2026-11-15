const {test}=require('node:test');
const assert=require('node:assert/strict');
const modulePromise=import('../src/publication.js');
test('A completed video keeps an independent caption snapshot and account target',async()=>{
 const {createVideoAsset,publicationTarget}=await modulePromise;
 const metadata={title:'Original title',description:'Original description',hashtags:['#Original']};
 const file={name:'original.mp4',size:4};const asset=createVideoAsset(file,metadata,'reflection','9:16');
 metadata.title='Another mode';metadata.hashtags.push('#Changed');
 assert.equal(asset.metadata.title,'Original title');assert.deepEqual(asset.metadata.hashtags,['#Original']);assert.equal(asset.file,file);
 assert.notEqual(publicationTarget({id:'youtube',channelId:'first'}),publicationTarget({id:'youtube',channelId:'second'}));
});
test('Malformed publishing responses are reviewable errors instead of success or crashes',async()=>{
 const {publishingRequest}=await modulePromise;const original=global.fetch;
 global.localStorage={getItem:()=>null};global.sessionStorage={getItem:()=>null};global.location={origin:'https://studio.example',hostname:'studio.example'};
 try{for(const response of [()=>Response.json(null),()=>Response.json({success:'true'}),()=>new Response('<html>Bad gateway</html>',{status:502})]){
  global.fetch=async()=>response();const {data}=await publishingRequest('/api/publish/youtube',{});assert.equal(data.success,false);assert.equal(data.uncertain,true);
 }}finally{global.fetch=original;}
});
