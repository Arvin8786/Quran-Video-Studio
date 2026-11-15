const {test}=require('node:test');
const assert=require('node:assert/strict');
async function request({key='private-fixture-key',production=true,origin='https://owner.github.io',token='',method='GET',path='/api/auth/status'}={}){
 const {studioAccess}=await import('../server/access.js');let status=200,body,next=false;const headers={};
 const middleware=studioAccess({key,allowedOrigins:['https://owner.github.io'],production});
 middleware({method,path,protocol:'https',get:name=>({'Origin':origin,'host':'service.example','Authorization':token&&`Bearer ${token}`})[name]}, {status:value=>{status=value;return{json:value=>{body=value;}};},json:value=>{body=value;},setHeader:(name,value)=>{headers[name]=value;},sendStatus:value=>{status=value;}},()=>{next=true;});
 return{status,body,headers,next};
}
test('Cross-origin Pages requests need the correct private studio key',async()=>{
 assert.equal((await request()).status,401);assert.equal((await request({token:'wrong'})).status,401);
 const allowed=await request({token:'private-fixture-key'});assert.equal(allowed.next,true);assert.equal(allowed.headers['Access-Control-Allow-Origin'],'https://owner.github.io');
 assert.equal((await request({token:'private-fixture-key',origin:'https://other.example'})).status,403);
});
test('CORS preflight works without a key; production APIs cannot start unprotected',async()=>{
 assert.equal((await request({method:'OPTIONS'})).status,204);assert.equal((await request({key:''})).status,503);
 const health=await request({path:'/api/health'});assert.equal(health.body.status,'ok');assert.equal(health.body.requiresKey,true);assert.doesNotMatch(JSON.stringify(health.body),/private-fixture/);
 assert.equal((await request({key:'',production:false,origin:undefined})).next,true);
});
