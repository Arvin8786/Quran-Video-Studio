const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
test('All 114 bundled Surahs contain the complete, aligned 6236 verses',()=>{
 const base=path.resolve(__dirname,'../public/quran');const chapters=JSON.parse(fs.readFileSync(path.join(base,'chapters.json')));assert.equal(chapters.length,114);let count=0;
 for(const [index,chapter] of chapters.entries()){
  assert.equal(chapter.number,index+1);const verses=JSON.parse(fs.readFileSync(path.join(base,`${chapter.number}.json`)));assert.equal(verses.length,chapter.numberOfAyahs);
  verses.forEach((verse,i)=>{assert.equal(verse.numberInSurah,i+1);for(const key of ['arabic','translation','transliteration'])assert.ok(typeof verse[key]==='string'&&verse[key].length>0);});count+=verses.length;
 }
 assert.equal(count,6236);assert.match(fs.readFileSync(path.join(base,'ATTRIBUTION.md'),'utf8'),/quranenc.com/);assert.ok(fs.statSync(path.join(base,'LICENSE.txt')).size>1000);
});
