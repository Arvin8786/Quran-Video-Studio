// Script to generate the comprehensive 365 Days of Awareness Shorts Dataset
const fs = require('fs');
const path = require('path');

const SEED_THEMES = [
  // 1. Opening & Faith (Days 1 - 45)
  {
    category: 'faith',
    bg: 'animated',
    video: 'animated-lanterns',
    style: 'goldGlow',
    verses: [
      { surah: 1, name: 'Al-Faatiha', start: 1, end: 7, title: 'THE OPENING OF GRACE', quote: 'In the name of Allah, the Entirely Merciful, the Especially Merciful. Guide us to the straight path.' },
      { surah: 2, name: 'Al-Baqarah', start: 255, end: 255, title: 'AYAT AL-KURSI • THE THRONE', quote: 'Allah - there is no deity except Him, the Ever-Living, the Sustainer of all existence.' },
      { surah: 2, name: 'Al-Baqarah', start: 285, end: 286, title: 'FAITH & SUPPLICATION', quote: 'The Messenger has believed in what was revealed to him from his Lord, and so have the believers.' },
      { surah: 3, name: 'Aal-i-Imraan', start: 18, end: 19, title: 'THE TESTIMONY OF ONENESS', quote: 'Allah witnesses that there is no deity except Him, and so do the angels and those of knowledge.' },
      { surah: 3, name: 'Aal-i-Imraan', start: 190, end: 191, title: 'CONTEMPLATION OF CREATION', quote: 'Indeed, in the creation of the heavens and the earth and the alternation of night and day are signs for those of understanding.' },
      { surah: 6, name: 'Al-An\'aam', start: 102, end: 103, title: 'THE ALL-ENCOMPASSING LORD', quote: 'That is Allah, your Lord; there is no deity except Him, the Creator of all things, so worship Him.' },
      { surah: 10, name: 'Yunus', start: 62, end: 64, title: 'THE ALLIES OF ALLAH', quote: 'Unquestionably, the allies of Allah - there will be no fear concerning them, nor will they grieve.' },
      { surah: 11, name: 'Hud', start: 6, end: 6, title: 'EVERY CREATURE IS SUSTAINED', quote: 'And there is no creature on earth but that upon Allah is its provision, and He knows its dwelling.' },
      { surah: 14, name: 'Ibrahim', start: 32, end: 34, title: 'COUNTLESS BLESSINGS', quote: 'And if you should count the favor of Allah, you could not enumerate them. Indeed, mankind is unjust and ungrateful.' },
      { surah: 16, name: 'An-Nahl', start: 125, end: 128, title: 'CALLING TO THE WAY OF WISDOM', quote: 'Invite to the way of your Lord with wisdom and good instruction, and argue with them in a way that is best.' },
      { surah: 20, name: 'Taa-Haa', start: 1, end: 8, title: 'NO DISTRESS IN REVELATION', quote: 'We did not send down the Quran that you be distressed, but only as a reminder for those who fear.' },
      { surah: 24, name: 'An-Noor', start: 35, end: 35, title: 'ALLAH IS THE LIGHT', quote: 'Allah is the Light of the heavens and the earth. The example of His light is like a niche within which is a lamp.' },
      { surah: 28, name: 'Al-Qasas', start: 88, end: 88, title: 'EVERYTHING PERISHES EXCEPT HIS FACE', quote: 'Everything will be destroyed except His Face. His is the judgement, and to Him you will be returned.' },
      { surah: 30, name: 'Ar-Room', start: 21, end: 25, title: 'SIGNS OF LOVE & TRANQUILITY', quote: 'And of His signs is that He created for you from yourselves mates that you may find tranquility in them.' },
      { surah: 31, name: 'Luqman', start: 17, end: 19, title: 'COUNSEL OF WISDOM', quote: 'O my son, establish prayer, enjoin what is right, forbid what is wrong, and be patient over what befalls you.' },
      { surah: 35, name: 'Faatir', start: 15, end: 15, title: 'ALLAH IS FREE OF ALL NEED', quote: 'O mankind, you are those in need of Allah, while Allah is the Free of need, the Praiseworthy.' },
      { surah: 39, name: 'Az-Zumar', start: 38, end: 38, title: 'SUFFICIENT IS ALLAH', quote: 'Say, Sufficient for me is Allah; upon Him rely the relyers.' },
      { surah: 40, name: 'Ghafir', start: 60, end: 60, title: 'CALL UPON ME', quote: 'And your Lord says, Call upon Me; I will respond to you.' },
      { surah: 50, name: 'Qaf', start: 16, end: 16, title: 'CLOSER THAN THE JUGULAR VEIN', quote: 'And We are closer to him than his jugular vein.' },
      { surah: 57, name: 'Al-Hadid', start: 1, end: 6, title: 'THE FIRST AND THE LAST', quote: 'He is the First and the Last, the Ascendant and the Intimate, and He is, of all things, Knowing.' },
      { surah: 59, name: 'Al-Hashr', start: 22, end: 24, title: 'THE EXALTED NAMES OF ALLAH', quote: 'He is Allah, other than whom there is no deity, the Sovereign, the Pure, the Perfection, the Bestower of Faith.' },
      { surah: 112, name: 'Al-Ikhlaas', start: 1, end: 4, title: 'THE PURITY OF FAITH', quote: 'Say, He is Allah, [who is] One, Allah, the Eternal Refuge. He neither begets nor is born, nor is there to Him any equivalent.' }
    ]
  },

  // 2. Divine Mercy & Forgiveness (Days 46 - 90)
  {
    category: 'mercy',
    bg: 'animated',
    video: 'animated-aurora',
    style: 'emeraldGold',
    verses: [
      { surah: 39, name: 'Az-Zumar', start: 53, end: 54, title: 'DO NOT DESPAIR OF MERCY', quote: 'Say, O My servants who have transgressed against themselves, do not despair of the mercy of Allah. Indeed, Allah forgives all sins.' },
      { surah: 7, name: 'Al-A\'raaf', start: 156, end: 156, title: 'MY MERCY EMBRACES ALL THINGS', quote: 'My mercy encompasses all things. So I will decree it especially for those who fear Me and give zakah.' },
      { surah: 4, name: 'An-Nisaa', start: 110, end: 110, title: 'SEEKING FORGIVENESS', quote: 'And whoever does a wrong or wrongs himself but then seeks forgiveness of Allah will find Allah Forgiving and Merciful.' },
      { surah: 15, name: 'Al-Hijr', start: 49, end: 50, title: 'INFORM MY SERVANTS', quote: 'Inform My servants that it is I who am the Forgiving, the Merciful.' },
      { surah: 25, name: 'Al-Furqaan', start: 70, end: 71, title: 'TRANSFORMING SINS INTO GOOD DEEDS', quote: 'Except for those who repent, believe and do righteous work. For them Allah will replace their evil deeds with good.' },
      { surah: 42, name: 'Ash-Shura', start: 25, end: 26, title: 'HE ACCEPTS REPENTANCE', quote: 'And it is He who accepts repentance from His servants and pardons misdeeds, and He knows what you do.' },
      { surah: 3, name: 'Aal-i-Imraan', start: 133, end: 136, title: 'HASTEN TO FORGIVENESS', quote: 'And hasten to forgiveness from your Lord and a garden as wide as the heavens and earth, prepared for the righteous.' },
      { surah: 12, name: 'Yusuf', start: 87, end: 87, title: 'NEVER DESPAIR OF ALLAH\'S RELIEF', quote: 'And do not despair of relief from Allah. Indeed, no one despairs of relief from Allah except the disbelieving people.' },
      { surah: 85, name: 'Al-Burooj', start: 14, end: 14, title: 'THE FORGIVING, THE LOVING', quote: 'And He is the Forgiving, the Affectionate.' },
      { surah: 40, name: 'Ghafir', start: 7, end: 7, title: 'ANGELS PRAYING FOR YOU', quote: 'Our Lord, You have encompassed all things in mercy and knowledge, so forgive those who have repented and followed Your way.' }
    ]
  },

  // 3. Patience & Relief (Days 91 - 145)
  {
    category: 'patience',
    bg: 'animated',
    video: 'animated-dunes',
    style: 'sunsetAmber',
    verses: [
      { surah: 94, name: 'Ash-Sharh', start: 1, end: 8, title: 'WITH HARDSHIP COMES EASE', quote: 'For indeed, with hardship comes ease. Indeed, with hardship comes ease.' },
      { surah: 2, name: 'Al-Baqarah', start: 153, end: 153, title: 'SEEK HELP IN PATIENCE & PRAYER', quote: 'O you who have believed, seek help through patience and prayer. Indeed, Allah is with the patient.' },
      { surah: 2, name: 'Al-Baqarah', start: 155, end: 157, title: 'TRIAL & GOOD TIDINGS', quote: 'And We will surely test you with something of fear and hunger and a loss of wealth and lives and fruits, but give good tidings to the patient.' },
      { surah: 2, name: 'Al-Baqarah', start: 286, end: 286, title: 'NO SOUL BURDENED BEYOND CAPACITY', quote: 'Allah does not burden a soul beyond that it can bear. It will have what it earned, and it will bear what it gained.' },
      { surah: 3, name: 'Aal-i-Imraan', start: 200, end: 200, title: 'PERSEVERE IN ENDURANCE', quote: 'O you who have believed, persevere and endure and remain stationed and fear Allah that you may be successful.' },
      { surah: 12, name: 'Yusuf', start: 90, end: 90, title: 'PATIENCE BRINGS REWARD', quote: 'Indeed, he who fears Allah and is patient, then indeed, Allah does not allow to be lost the reward of those who do good.' },
      { surah: 13, name: 'Ar-Ra\'d', start: 22, end: 24, title: 'PEACE UPON YOU FOR YOUR PATIENCE', quote: 'Peace be upon you for what you patiently endured. And excellent is the final home.' },
      { surah: 21, name: 'Al-Anbiyaa', start: 83, end: 84, title: 'THE DU\'A OF AYYUB', quote: 'And Ayyub, when he called to his Lord, Adversity has touched me, and You are the Most Merciful of the merciful.' },
      { surah: 21, name: 'Al-Anbiyaa', start: 87, end: 88, title: 'THE SUPPLICATION OF YUNUS', quote: 'There is no deity except You; exalted are You. Indeed, I have been of the wrongdoers. So We responded to him.' },
      { surah: 65, name: 'At-Talaaq', start: 2, end: 3, title: 'A WAY OUT OF EVERY TRIAL', quote: 'And whoever fears Allah - He will make for him a way out, and will provide for him from where he does not expect.' },
      { surah: 103, name: 'Al-Asr', start: 1, end: 3, title: 'THE CRUCIBLE OF TIME', quote: 'By time, indeed, mankind is in loss, except for those who have believed and done righteous deeds and advised each other to truth and patience.' }
    ]
  },

  // 4. Gratitude & Peace (Days 146 - 195)
  {
    category: 'gratitude',
    bg: 'animated',
    video: 'animated-ghibli',
    style: 'emeraldGold',
    verses: [
      { surah: 13, name: 'Ar-Ra\'d', start: 28, end: 28, title: 'HEARTS FIND REST IN REMEMBRANCE', quote: 'Verily, in the remembrance of Allah do hearts find rest and peace.' },
      { surah: 14, name: 'Ibrahim', start: 7, end: 7, title: 'IF YOU ARE GRATEFUL, I WILL INCREASE YOU', quote: 'And when your Lord proclaimed, If you are grateful, I will surely increase you in favor.' },
      { surah: 16, name: 'An-Nahl', start: 18, end: 18, title: 'INFINITE FAVORS OF ALLAH', quote: 'And if you should count the favors of Allah, you could not enumerate them. Indeed, Allah is Forgiving and Merciful.' },
      { surah: 2, name: 'Al-Baqarah', start: 152, end: 152, title: 'REMEMBER ME, I WILL REMEMBER YOU', quote: 'So remember Me; I will remember you. And be grateful to Me and do not deny Me.' },
      { surah: 31, name: 'Luqman', start: 12, end: 12, title: 'GRATITUDE BENEFITS THE SOUL', quote: 'And whoever is grateful is grateful for [the benefit of] himself. And whoever denies - then indeed, Allah is Free of need and Praiseworthy.' },
      { surah: 93, name: 'Ad-Dhuhaa', start: 1, end: 8, title: 'YOUR LORD HAS NOT FORSAKEN YOU', quote: 'Your Lord has not taken leave of you, nor has He detested. And the Hereafter is better for you than the first [life].' },
      { surah: 108, name: 'Al-Kawthar', start: 1, end: 3, title: 'THE ABUNDANCE OF GOODNESS', quote: 'Indeed, We have granted you, [O Muhammad], al-Kawthar [Abundance]. So pray to your Lord and sacrifice.' },
      { surah: 55, name: 'Ar-Rahmaan', start: 1, end: 13, title: 'WHICH OF HIS FAVORS WILL YOU DENY', quote: 'The Entirely Merciful, taught the Quran, created man. So which of the favors of your Lord would you deny?' }
    ]
  },

  // 5. The Reality of Death & The Hereafter (Days 196 - 245)
  {
    category: 'hereafter',
    bg: 'sea',
    video: 'https://videos.pexels.com/video-files/5668625/5668625-hd_1366_720_30fps.mp4',
    style: 'whiteHalo',
    verses: [
      { surah: 50, name: 'Qaf', start: 19, end: 22, title: 'THE STUPOR OF DEATH', quote: 'And the stupor of death will come in truth: That is what you were trying to escape!' },
      { surah: 21, name: 'Al-Anbiyaa', start: 34, end: 35, title: 'EVERY SOUL WILL TASTE DEATH', quote: 'Every soul will taste death. And We test you with evil and with good as trial; and to Us you will be returned.' },
      { surah: 3, name: 'Aal-i-Imraan', start: 185, end: 185, title: 'THIS WORLD IS ENJOYMENT OF DELUSION', quote: 'Every soul will taste death, and you will only be given your full compensation on the Day of Resurrection.' },
      { surah: 29, name: 'Al-Ankaboot', start: 57, end: 57, title: 'TO US YOU SHALL RETURN', quote: 'Every soul will taste death. Then to Us will you be returned.' },
      { surah: 63, name: 'Al-Munaafiqoon', start: 9, end: 11, title: 'BEFORE DEATH ARRIVES', quote: 'And spend [in the way of Allah] from what We have provided you before death approaches one of you.' },
      { surah: 67, name: 'Al-Mulk', start: 1, end: 2, title: 'HE CREATED DEATH AND LIFE TO TEST YOU', quote: 'Blessed is He in whose hand is dominion. He who created death and life to test you as to which of you is best in deed.' },
      { surah: 102, name: 'At-Takaathur', start: 1, end: 8, title: 'COMPETITION DIVERTS YOU', quote: 'Competition in [worldly] increase diverts you until you visit the graveyards. No! You are going to know.' },
      { surah: 81, name: 'At-Takwir', start: 1, end: 6, title: 'WHEN THE SUN IS ROLLED UP', quote: 'When the sun is rolled up, and when the stars fall dispersing, and when the mountains pass away...' },
      { surah: 82, name: 'Al-Infitaar', start: 1, end: 5, title: 'WHEN THE SKY BREAKS APART', quote: 'When the sky breaks apart, and when the stars fall, a soul will know what it has put forth and kept back.' },
      { surah: 99, name: 'Az-Zalzala', start: 1, end: 8, title: 'THE FINAL EARTHQUAKE', quote: 'When the earth is shaken with its earthquake, and the earth unloads its burdens... whoever does an atom\'s weight of good will see it.' }
    ]
  },

  // 6. Signs of Allah in Nature & Cosmos (Days 246 - 295)
  {
    category: 'creation',
    bg: 'animated',
    video: 'animated-cosmic',
    style: 'goldGlow',
    verses: [
      { surah: 2, name: 'Al-Baqarah', start: 164, end: 164, title: 'SIGNS IN THE HEAVENS AND EARTH', quote: 'Indeed, in the creation of the heavens and earth, and the alternation of night and day, are signs for a people who use reason.' },
      { surah: 36, name: 'Yaseen', start: 36, end: 40, title: 'THE SUN & MOON IN ORBIT', quote: 'Exalted is He who created all pairs - from what the earth grows and from themselves and from that which they do not know.' },
      { surah: 21, name: 'Al-Anbiyaa', start: 30, end: 33, title: 'FROM WATER WE MADE EVERY LIVING THING', quote: 'And We made from water every living thing. Then will they not believe?' },
      { surah: 13, name: 'Ar-Ra\'d', start: 2, end: 4, title: 'HEAVENS WITHOUT PILLARS', quote: 'It is Allah who erected the heavens without pillars that you can see; then He established Himself above the Throne.' },
      { surah: 16, name: 'An-Nahl', start: 10, end: 14, title: 'HE SENDS DOWN RAIN', quote: 'It is He who sends down rain from the sky; from it is drink and from it is foliage in which you pasture.' },
      { surah: 24, name: 'An-Noor', start: 41, end: 44, title: 'BIRDS PRAISING IN FLIGHT', quote: 'Do you not see that Allah is exalted by whomever is within the heavens and the earth and the birds with wings outspread?' },
      { surah: 30, name: 'Ar-Room', start: 20, end: 25, title: 'LANGUAGES & COLORS ARE SIGNS', quote: 'And of His signs is the creation of the heavens and the earth and the diversity of your languages and your colors.' },
      { surah: 41, name: 'Fussilat', start: 53, end: 53, title: 'SIGNS ON THE HORIZONS & WITHIN', quote: 'We will show them Our signs in the horizons and within themselves until it becomes clear to them that it is the truth.' },
      { surah: 51, name: 'Adh-Dhaariyaat', start: 20, end: 23, title: 'SIGNS ON EARTH FOR THE CERTAIN', quote: 'And on the earth are signs for the certain [in faith], and in yourselves. Then will you not see?' },
      { surah: 78, name: 'An-Naba', start: 6, end: 16, title: 'MOUNTAINS AS PEGS', quote: 'Have We not made the earth a resting place? And the mountains as stakes? And We created you in pairs.' },
      { surah: 88, name: 'Al-Ghaashiya', start: 17, end: 20, title: 'DO THEY NOT LOOK AT THE SKY', quote: 'Do they not look at the camels - how they are created? And at the sky - how it is raised?' }
    ]
  },

  // 7. Character, Integrity & Kindness (Days 296 - 335)
  {
    category: 'character',
    bg: 'animated',
    video: 'animated-sakura',
    style: 'emeraldGold',
    verses: [
      { surah: 25, name: 'Al-Furqaan', start: 63, end: 67, title: 'THE SERVANTS OF THE MERCIFUL', quote: 'And the servants of the Most Merciful are those who walk upon the earth easily, and when the ignorant address them, they say words of peace.' },
      { surah: 17, name: 'Al-Israa', start: 23, end: 24, title: 'KINDNESS TO PARENTS', quote: 'And your Lord has decreed that you not worship except Him, and to parents, good treatment.' },
      { surah: 17, name: 'Al-Israa', start: 37, end: 37, title: 'WALK NOT UPON THE EARTH WITH ARROGANCE', quote: 'And do not walk upon the earth arrogantly. Indeed, you will never tear the earth [apart], and you will never reach the mountains in height.' },
      { surah: 41, name: 'Fussilat', start: 34, end: 35, title: 'REPEL EVIL WITH WHAT IS BETTER', quote: 'Repel [evil] by that which is better; and thereupon, the one whom between you and him is enmity [will become] as though he was a devoted friend.' },
      { surah: 49, name: 'Al-Hujuraat', start: 11, end: 13, title: 'NOBLEST IS THE MOST PIOUS', quote: 'Indeed, the most noble of you in the sight of Allah is the most righteous of you. Indeed, Allah is Knowing and Acquainted.' },
      { surah: 2, name: 'Al-Baqarah', start: 263, end: 263, title: 'A KIND WORD IS BETTER THAN CHARITY', quote: 'A kind word and forgiveness is better than charity followed by injury. And Allah is Free of need and Forbearing.' },
      { surah: 3, name: 'Aal-i-Imraan', start: 159, end: 159, title: 'GENTLENESS IN LEADERSHIP', quote: 'So by mercy from Allah, you were lenient with them. And if you had been rude and harsh in heart, they would have disbanded from about you.' },
      { surah: 4, name: 'An-Nisaa', start: 135, end: 135, title: 'STAND FIRMLY FOR JUSTICE', quote: 'O you who have believed, be persistently standing firm in justice, witnesses for Allah, even if it be against yourselves.' },
      { surah: 90, name: 'Al-Balad', start: 11, end: 18, title: 'THE STEEP ASCENT OF COMPASSION', quote: 'Feeding on a day of severe hunger an orphan of near relationship or a needy person in misery.' },
      { surah: 107, name: 'Al-Maa\'oon', start: 1, end: 7, title: 'SMALL ACTS OF KINDNESS', quote: 'Have you seen the one who denies the Recompense? That is the one who repulses the orphan and does not encourage the feeding of the poor.' }
    ]
  },

  // 8. Jannah & Eternal Peace (Days 336 - 365)
  {
    category: 'hereafter',
    bg: 'animated',
    video: 'animated-particles',
    style: 'goldGlow',
    verses: [
      { surah: 55, name: 'Ar-Rahmaan', start: 46, end: 50, title: 'THE GARDENS OF JANNAH', quote: 'And for him who feared the standing before his Lord, there are two gardens - So which of the favors of your Lord would you deny?' },
      { surah: 18, name: 'Al-Kahf', start: 107, end: 108, title: 'GARDENS OF PARADISE AS HOSPITALITY', quote: 'Indeed, those who have believed and done righteous deeds - they will have the Gardens of Paradise as a lodging.' },
      { surah: 36, name: 'Yaseen', start: 55, end: 58, title: 'PEACE! A WORD FROM A MERCIFUL LORD', quote: 'Peace! A word from a Merciful Lord. Indeed, the companions of Paradise, that Day, will be in cheerful amusement.' },
      { surah: 39, name: 'Az-Zumar', start: 73, end: 75, title: 'GREETED WITH PEACE AT THE GATES OF JANNAH', quote: 'Peace be upon you; you have become pure; so enter it to abide eternally therein.' },
      { surah: 56, name: 'Al-Waaqia', start: 10, end: 26, title: 'THE FOREMOST IN FAITH', quote: 'And the forerunners, the forerunners - Those are the ones brought near to Allah in the Gardens of Pleasure.' },
      { surah: 76, name: 'Al-Insaan', start: 12, end: 22, title: 'REWARD OF PATIENCE IN PARADISE', quote: 'And will reward them for what they patiently endured with a garden [in Paradise] and silk [garments].' },
      { surah: 83, name: 'Al-Mutaffifin', start: 22, end: 28, title: 'THE RIGHTEOUS ARE IN DELIGHT', quote: 'Indeed, the righteous will be in pleasure, on adorned couches, observing.' },
      { surah: 88, name: 'Al-Ghaashiya', start: 8, end: 16, title: 'JOYFUL FACES IN AN ELEVATED GARDEN', quote: 'Faces, that Day, will be joyful, pleased with their effort, in an elevated garden.' },
      { surah: 89, name: 'Al-Fajr', start: 27, end: 30, title: 'O TRANQUIL SOUL, RETURN TO YOUR LORD', quote: 'O soul at peace, return to your Lord, well-pleased and pleasing to Him. Enter among My servants and enter My Paradise.' },
      { surah: 110, name: 'An-Nasr', start: 1, end: 3, title: 'DAY 365 • THE DIVINE VICTORY & PRAISE', quote: 'When the victory of Allah has come and the conquest, and you see the people entering into the religion of Allah in multitudes, then exalt with praise of your Lord and ask forgiveness of Him. Indeed, He is ever Accepting of repentance.' }
    ]
  }
];

// Expand to exactly 365 days
const all365 = [];
let dayCounter = 1;

// Collect all unique verse definitions
const flatVerses = [];
SEED_THEMES.forEach(theme => {
  theme.verses.forEach(v => {
    flatVerses.push({
      ...v,
      category: theme.category,
      bg: theme.bg,
      video: theme.video,
      style: theme.style
    });
  });
});

console.log(`Found ${flatVerses.length} base seed verses. Generating 365 distinct daily entries...`);

// Fill 365 days
for (let d = 1; d <= 365; d++) {
  const seed = flatVerses[(d - 1) % flatVerses.length];
  // Calculate day-specific title and metadata
  const dayKey = `day-${d}`;
  const dayTitle = `DAY ${d} • ${seed.title.replace(/^DAY \d+ • /, '')}`;
  const bannerText = `DAY ${d}/365 · ${seed.title.replace(/^DAY \d+ • /, '').substring(0, 36)}`;

  // Alternate backgrounds nicely so everyday feels fresh (animated, sea, forest, river, sky)
  const bgCycle = ['animated-lanterns', 'animated-dunes', 'animated-sakura', 'animated-cosmic', 'animated-particles', 'animated-ghibli', 'animated-aurora', 'animated-oasis', 'sea-deep', 'forest-sunrays', 'river-mountain', 'clouds-ocean'];
  const assignedVideo = seed.video && seed.video.startsWith('animated') ? bgCycle[(d - 1) % bgCycle.length] : seed.video;

  all365.push({
    day: d,
    key: dayKey,
    title: dayTitle,
    bannerText: bannerText,
    surahNumber: seed.surah,
    surahName: seed.name,
    startAyah: seed.start,
    endAyah: seed.end,
    category: seed.category,
    themeStyle: seed.style || 'goldGlow',
    backgroundCategory: assignedVideo.startsWith('animated') ? 'animated' : 'sea',
    videoUrl: assignedVideo,
    quote: seed.quote
  });
}

// Special touches for Day 1 and Day 365
all365[0].title = 'DAY 1 • THE OPENING OF GRACE';
all365[0].bannerText = 'DAY 1/365 · THE OPENING OF GRACE';
all365[364].title = 'DAY 365 • THE DIVINE VICTORY';
all365[364].bannerText = 'DAY 365/365 · THE DIVINE VICTORY';

const fileContent = `// 365 Days of Daily Quran Awareness Shorts (Curated for Daily Social Media Posting)
export const AWARENESS_365_DAYS = ${JSON.stringify(all365, null, 2)};

export const AWARENESS_CATEGORIES = [
  { id: 'all', label: 'All 365 Days', icon: '📅' },
  { id: 'faith', label: 'Faith & Tawheed', icon: '✨' },
  { id: 'mercy', label: 'Divine Mercy', icon: '🌅' },
  { id: 'patience', label: 'Patience & Trials', icon: '🕊️' },
  { id: 'gratitude', label: 'Gratitude & Peace', icon: '🌿' },
  { id: 'hereafter', label: 'Death & Hereafter', icon: '💀' },
  { id: 'creation', label: 'Cosmos & Nature', icon: '🌌' },
  { id: 'character', label: 'Kindness & Akhlaq', icon: '💖' },
  { id: 'animated', label: 'Animated Series', icon: '🎨' }
];
`;

fs.writeFileSync(path.join(__dirname, 'src', 'awareness365Data.js'), fileContent, 'utf-8');
console.log(`Successfully generated src/awareness365Data.js with ${all365.length} daily awareness shorts entries!`);
