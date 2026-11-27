const {test}=require('node:test');
const assert=require('node:assert/strict');
const service=import('../src/service.js');
test('A GitHub Pages address or OAuth callback cannot be mistaken for a publishing server',async()=>{
 const {normalizeServiceUrl}=await service;
 for(const url of ['https://arvin8786.github.io/auth/callback','https://arvin8786.github.io/Quran-Video-Studio/','https://arvin8786.github.io'])assert.throws(()=>normalizeServiceUrl(url),/GitHub Pages/);
 assert.throws(()=>normalizeServiceUrl('https://studio.example/auth/callback'),/without \/auth\/callback/);
 assert.equal(normalizeServiceUrl(' https://studio.example/ '),'https://studio.example');
 assert.equal(normalizeServiceUrl('http://localhost:3000'),'http://localhost:3000');
 for(const url of ['http://remote.example','https://user:password@studio.example','https://studio.example/?token=example','invalid'])assert.throws(()=>normalizeServiceUrl(url));
});
test('Invalid service input never changes a previously valid connection or its key',async()=>{
 const {saveServiceConfig,serviceConfig}=await service;
 const storage=initial=>{const values=new Map(Object.entries(initial));return{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};};
 global.localStorage=storage({proease_service_url:'https://studio.example'});global.sessionStorage=storage({proease_service_key:'fixture-key'});global.location={hostname:'owner.github.io',origin:'https://owner.github.io'};
 assert.throws(()=>saveServiceConfig('https://owner.github.io/auth/callback','replacement'),/GitHub Pages/);
 assert.equal(serviceConfig().base,'https://studio.example');assert.equal(serviceConfig().key,'fixture-key');
 localStorage.setItem('proease_service_url','https://owner.github.io');assert.equal(serviceConfig().base,'');
});
test('A remembered access key survives closing the app; an unremembered one does not',async()=>{
 const {saveServiceConfig,serviceConfig}=await service;
 const storage=()=>{const values=new Map();return{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};};
 global.localStorage=storage();global.sessionStorage=storage();global.location={hostname:'owner.github.io',origin:'https://owner.github.io'};global.window={dispatchEvent(){}};
 saveServiceConfig('https://studio.example','device-key',true);
 global.sessionStorage=storage();
 assert.equal(serviceConfig().key,'device-key');assert.equal(serviceConfig().remember,true);
 saveServiceConfig('https://studio.example','tab-key',false);
 assert.equal(sessionStorage.getItem('proease_service_key'),'tab-key');
 global.sessionStorage=storage();
 assert.equal(serviceConfig().key,'');
});
