import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),root=path.dirname(require.resolve('quran-json/package.json')),out=new URL('../public/quran/',import.meta.url);
const english=JSON.parse(fs.readFileSync(path.join(root,'dist/quran_en.json'),'utf8')),roman=JSON.parse(fs.readFileSync(path.join(root,'dist/quran_transliteration.json'),'utf8'));
fs.mkdirSync(out,{recursive:true});
const chapters=[];let count=0;
for(let index=0;index<english.length;index++){
 const chapter=english[index],translit=roman[index];if(chapter.id!==translit.id||chapter.verses.length!==translit.verses.length)throw new Error('Quran datasets do not align');
 chapters.push({number:chapter.id,name:chapter.name,englishName:chapter.transliteration,translation:chapter.translation,numberOfAyahs:chapter.total_verses});
 const verses=chapter.verses.map((verse,i)=>{if(verse.id!==translit.verses[i].id)throw new Error('Verse IDs do not align');return{numberInSurah:verse.id,arabic:verse.text,translation:verse.translation,transliteration:translit.verses[i].transliteration};});count+=verses.length;
 fs.writeFileSync(new URL(`${chapter.id}.json`,out),JSON.stringify(verses));
}
if(chapters.length!==114||count!==6236)throw new Error('Quran dataset is incomplete');
fs.writeFileSync(new URL('chapters.json',out),JSON.stringify(chapters));
fs.copyFileSync(path.join(root,'LICENSE.txt'),new URL('LICENSE.txt',out));
fs.writeFileSync(new URL('ATTRIBUTION.md',out),'Quran JSON 3.1.2, Risan Bagja Pradana — https://github.com/risan/quran-json\nText and English translation: The Noble Quran Encyclopedia — https://quranenc.com/\nTransliteration: Tanzil — https://tanzil.net/trans/en.transliteration\n\nUpstream license is preserved in LICENSE.txt. Changes: English/transliteration datasets combined and split by Surah. Verse wording is unchanged.\n');
console.log(`Prepared ${chapters.length} Surahs and ${count} verses with upstream attribution.`);
