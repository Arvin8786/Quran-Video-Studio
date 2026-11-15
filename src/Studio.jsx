import React, { useState, useEffect, useRef } from 'react';
import StudioView from './StudioView.jsx';
import {apiFetch,apiOrigin,assetUrl,serviceConfig,saveServiceConfig} from './service.js';
import {recordFullVideo} from './browser-renderer.js';
import { createVideoAsset, publicationTarget, publishingRequest } from './publication.js';

// Reciter Metadata & Audio Folder Mapping
const RECITERS_METADATA = {
  'Husary_128kbps': {
    name: 'Sheikh Mahmoud Khalil Al-Husary',
    arabicName: 'الشيخ محمود خليل الحصري',
    title: 'Master of Tajweed (شيخ المقارئ المصرية)',
    origin: 'Egypt',
    riwayah: "Hafs 'an 'Asim (Murattal)",
    style: 'Unmatched precision, pristine Tajweed, calm and meditative tone',
    folder: 'Husary_128kbps'
  },
  'ar.alafasy': {
    name: 'Sheikh Mishary Rashid Alafasy',
    arabicName: 'الشيخ مشاري بن راشد العفاسي',
    title: 'Renowned Qari & Imam',
    origin: 'Kuwait',
    riwayah: "Hafs 'an 'Asim",
    style: 'Melodious, expressive, emotionally engaging voice',
    folder: 'Alafasy_128kbps'
  },
  'ar.abdurrahmaansudais': {
    name: 'Sheikh Abdur-Rahman As-Sudais',
    arabicName: 'الشيخ عبد الرحمن السديس',
    title: 'Chief Imam of Masjid al-Haram, Makkah',
    origin: 'Kingdom of Saudi Arabia',
    riwayah: "Hafs 'an 'Asim",
    style: 'Passionate, powerful, unmistakable voice of the Holy Kaaba',
    folder: 'Abdurrahmaan_As-Sudais_192kbps'
  },
  'ar.abdulbasit': {
    name: 'Sheikh AbdulBaset AbdulSamad',
    arabicName: 'الشيخ عبد الباسط عبد الصمد',
    title: 'The Golden Throat (صوت مكة)',
    origin: 'Egypt',
    riwayah: "Hafs 'an 'Asim (Murattal)",
    style: 'Majestic classical resonance with legendary breath control',
    folder: 'Abdul_Basit_Murattal_192kbps'
  },
  'ar.minshawi': {
    name: 'Sheikh Mohamed Siddiq Al-Minshawi',
    arabicName: 'الشيخ محمد صديق المنشاوي',
    title: 'The Weeping Voice (الصوت الباكي)',
    origin: 'Egypt',
    riwayah: "Hafs 'an 'Asim (Murattal)",
    style: 'Profoundly moving, spiritually humble, sorrowful and reverent',
    folder: 'Minshawy_Murattal_128kbps'
  },
  'ar.mahermuaiqly': {
    name: 'Sheikh Maher Al-Muaiqly',
    arabicName: 'الشيخ ماهر بن حمد المعيقلي',
    title: 'Imam of Masjid al-Haram, Makkah',
    origin: 'Kingdom of Saudi Arabia',
    riwayah: "Hafs 'an 'Asim",
    style: 'Deep, comforting, rhythmic recitation echoing from the Kaaba',
    folder: 'Maher_AlMuaiqly_64kbps'
  }
};

// Curated Pexels Royalty-Free HD Background Videos (Verified Direct MP4 URLs)
const PRESET_VIDEOS = [
  // Sea & Ocean
  {
    id: 'sea-waves',
    category: 'sea',
    title: 'Majestic Ocean Waves & Surf',
    durationBadge: '60s HD',
    thumb: 'https://images.pexels.com/videos/34693119/nature-ocean-sea-slow-motion-34693119.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/34693119/14704850_1920_1080_30fps.mp4'
  },
  {
    id: 'sea-deep',
    category: 'sea',
    title: 'Deep Blue Coastal Waves',
    durationBadge: '45s HD',
    thumb: 'https://images.pexels.com/videos/5668625/pexels-photo-5668625.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/5668625/5668625-hd_1366_720_30fps.mp4'
  },
  {
    id: 'sea-aerial',
    category: 'sea',
    title: 'Tropical Coastal Surf Shore',
    durationBadge: '50s HD',
    thumb: 'https://images.pexels.com/videos/6748729/4k-above-sea-beach-drone-6748729.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/6748729/6748729-hd_1366_570_24fps.mp4'
  },
  {
    id: 'sea-emerald',
    category: 'sea',
    title: 'Emerald Wave Shoreline',
    durationBadge: '35s HD',
    thumb: 'https://images.pexels.com/videos/34964457/pexels-photo-34964457.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/34964457/14811528_1280_720_30fps.mp4'
  },
  {
    id: 'sea-sunset',
    category: 'sea',
    title: 'Golden Sunset Tide & Surf',
    durationBadge: '40s HD',
    thumb: 'https://images.pexels.com/videos/2876707/free-video-2876707.jpg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/2876707/2876707-hd_1920_1080_30fps.mp4'
  },

  // Forest & Pines
  {
    id: 'forest-sunrays',
    category: 'forest',
    title: 'Sun Rays in Pine Forest',
    durationBadge: '58s HD',
    thumb: 'https://images.pexels.com/videos/5535406/pexels-photo-5535406.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/5535406/5535406-hd_1920_1080_30fps.mp4'
  },
  {
    id: 'forest-canopy',
    category: 'forest',
    title: 'Evergreen Pine Canopy',
    durationBadge: '48s HD',
    thumb: 'https://images.pexels.com/videos/5623817/pexels-photo-5623817.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/5623817/5623817-hd_1920_1080_24fps.mp4'
  },
  {
    id: 'forest-sunflare',
    category: 'forest',
    title: 'Golden Woods Lens Flare',
    durationBadge: '35s HD',
    thumb: 'https://images.pexels.com/videos/11265968/lens-flare-slowmotion-sun-flare-11265968.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/11265968/11265968-hd_1280_720_25fps.mp4'
  },
  {
    id: 'forest-mist',
    category: 'forest',
    title: 'Alpine Forest Mist & Clouds',
    durationBadge: '40s HD',
    thumb: 'https://images.pexels.com/videos/5968139/blue-clouds-cotinus-forest-5968139.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/5968139/5968139-hd_1920_1080_30fps.mp4'
  },

  // Rivers & Waterfalls
  {
    id: 'river-mountain',
    category: 'river',
    title: 'Serene Alpine River Flow',
    durationBadge: '52s HD',
    thumb: 'https://images.pexels.com/videos/28963293/pexels-photo-28963293.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/28963293/12529743_1920_1080_24fps.mp4'
  },
  {
    id: 'waterfall-cascade',
    category: 'river',
    title: 'Cascading Mountain Falls',
    durationBadge: '60s HD',
    thumb: 'https://images.pexels.com/videos/6405064/120fps-fujifilm-slow-motion-video-waterfall-6405064.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/6405064/6405064-hd_1920_1080_24fps.mp4'
  },
  {
    id: 'river-canyon',
    category: 'river',
    title: 'Towering Canyon River Stream',
    durationBadge: '40s HD',
    thumb: 'https://images.pexels.com/videos/11661110/canyon-drone-footage-drone-photography-drone-shot-11661110.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/11661110/11661110-hd_1280_720_24fps.mp4'
  },
  {
    id: 'river-stones',
    category: 'river',
    title: 'Mountain Brook & Pebble Stones',
    durationBadge: '30s HD',
    thumb: 'https://images.pexels.com/videos/26855469/mountains-pebble-river-stones-26855469.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/26855469/12022116_1280_720_30fps.mp4'
  },
  {
    id: 'waterfall-alpine',
    category: 'river',
    title: 'Alpine Forest Waterfall',
    durationBadge: '45s HD',
    thumb: 'https://images.pexels.com/videos/3987504/acqua-alberi-alpi-animali-3987504.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/3987504/3987504-hd_1920_1080_30fps.mp4'
  },

  // Rain & Water
  {
    id: 'rain-green',
    category: 'rain',
    title: 'Peaceful Rain on Green Leaves',
    durationBadge: '45s HD',
    thumb: 'https://images.pexels.com/videos/32628145/cold-climate-monsoon-monsoon-weather-pune-32628145.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/32628145/13913113_1280_720_25fps.mp4'
  },
  {
    id: 'rain-monsoon',
    category: 'rain',
    title: 'Soft Garden Rain & Droplets',
    durationBadge: '30s HD',
    thumb: 'https://images.pexels.com/videos/4779387/colombia-jardin-lluvia-matas-4779387.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/4779387/4779387-hd_1920_1080_30fps.mp4'
  },
  {
    id: 'rain-canopy',
    category: 'rain',
    title: 'Rain Falling Through Foliage',
    durationBadge: '30s HD',
    thumb: 'https://images.pexels.com/videos/4779388/colombia-goteras-lluvia-naturaleza-4779388.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/4779388/4779388-hd_1920_1080_30fps.mp4'
  },

  // Mountains & Clouds
  {
    id: 'mountain-valley',
    category: 'mountain',
    title: 'Majestic Alpine Valley Drone',
    durationBadge: '45s HD',
    thumb: 'https://images.pexels.com/videos/35274206/4k-drohnenaufnahme-4k-nature-beautiful-landscape-by-drone-beautiful-landscape-drone-35274206.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/35274206/14942934_1280_720_60fps.mp4'
  },
  {
    id: 'mountain-sunrise',
    category: 'mountain',
    title: 'Golden Sunrise Mountain Peak',
    durationBadge: '35s HD',
    thumb: 'https://images.pexels.com/videos/3926075/travel-nature-sunrise-3926075.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/3926075/3926075-hd_1920_1080_24fps.mp4'
  },
  {
    id: 'clouds-ocean',
    category: 'mountain',
    title: 'Atmospheric Storm Clouds Horizon',
    durationBadge: '65s HD',
    thumb: 'https://images.pexels.com/videos/5853147/pictures/preview-0.jpg',
    videoUrl: 'https://videos.pexels.com/video-files/5853147/5853147-hd_1366_720_30fps.mp4'
  }
];

// Curated Quran Thematic Lessons Verses
const QURAN_LESSONS = [
  {
    key: 'death',
    title: 'THE REALITY OF DEATH',
    badge: '⚡ AWARENESS • THE REALITY OF DEATH',
    surahNumber: 50,
    surahName: 'Qaf',
    startAyah: 19,
    endAyah: 22,
    category: 'death',
    videoUrl: 'https://videos.pexels.com/video-files/34693119/14704850_1920_1080_30fps.mp4',
    quote: 'And the stupor of death will come in truth: That is what you were trying to escape!'
  },
  {
    key: 'tasteDeath',
    title: 'EVERY SOUL SHALL TASTE DEATH',
    badge: '⚡ REMINDER • EVERY SOUL SHALL TASTE DEATH',
    surahNumber: 21,
    surahName: 'Al-Anbiyaa',
    startAyah: 34,
    endAyah: 35,
    category: 'death',
    videoUrl: 'https://videos.pexels.com/video-files/5853147/5853147-hd_1366_720_30fps.mp4',
    quote: 'Every soul will taste death. And We test you with evil and with good as trial.'
  },
  {
    key: 'imaan',
    title: 'TO GAIN IMAAN & CERTAINTY',
    badge: '🌟 FAITH • TO GAIN IMAAN & CERTAINTY',
    surahNumber: 8,
    surahName: 'Al-Anfal',
    startAyah: 2,
    endAyah: 4,
    category: 'imaan',
    videoUrl: 'https://videos.pexels.com/video-files/3926075/3926075-uhd_2560_1440_24fps.mp4',
    quote: 'The believers are only those who, when Allah is mentioned, feel a fear in their hearts and when His verses are recited to them, it increases them in faith.'
  },
  {
    key: 'tawakkul',
    title: 'TRUST IN ALLAH (TAWAKKUL)',
    badge: '🛡️ RELIANCE • TRUST IN ALLAH ALONE',
    surahNumber: 65,
    surahName: 'At-Talaq',
    startAyah: 2,
    endAyah: 3,
    category: 'imaan',
    videoUrl: 'https://videos.pexels.com/video-files/35274206/14942934_1280_720_60fps.mp4',
    quote: 'And whoever relies upon Allah - then He is sufficient for him. Indeed, Allah will accomplish His purpose.'
  },
  {
    key: 'judgment',
    title: 'THE DAY OF JUDGMENT',
    badge: '⚡ AWARENESS • THE DAY OF JUDGMENT',
    surahNumber: 81,
    surahName: 'At-Takwir',
    startAyah: 1,
    endAyah: 6,
    category: 'hereafter',
    videoUrl: 'https://videos.pexels.com/video-files/5668625/5668625-hd_1366_720_30fps.mp4',
    quote: 'When the sun is rolled up, and when the stars fall, and when the mountains pass away...'
  },
  {
    key: 'zalzalah',
    title: 'THE FINAL EARTHQUAKE',
    badge: '⚡ AWARENESS • THE FINAL EARTHQUAKE',
    surahNumber: 99,
    surahName: 'Az-Zalzala',
    startAyah: 1,
    endAyah: 8,
    category: 'hereafter',
    videoUrl: 'https://videos.pexels.com/video-files/11661110/11661110-hd_1280_720_24fps.mp4',
    quote: 'When the earth is shaken with its earthquake, and the earth unloads its burdens...'
  },
  {
    key: 'mercy',
    title: 'DIVINE MERCY & FORGIVENESS',
    badge: '🌅 HOPE • DIVINE MERCY & FORGIVENESS',
    surahNumber: 39,
    surahName: 'Az-Zumar',
    startAyah: 53,
    endAyah: 54,
    category: 'mercy',
    videoUrl: 'https://videos.pexels.com/video-files/5535406/5535406-hd_1920_1080_30fps.mp4',
    quote: 'Do not despair of the mercy of Allah. Indeed, Allah forgives all sins.'
  },
  {
    key: 'peace',
    title: 'REST FOR THE HEARTS (PEACE)',
    badge: '🕊️ SOLACE • REST FOR THE HEARTS',
    surahNumber: 13,
    surahName: "Ar-Ra'd",
    startAyah: 28,
    endAyah: 29,
    category: 'peace',
    videoUrl: 'https://videos.pexels.com/video-files/6748729/6748729-hd_1366_570_24fps.mp4',
    quote: 'Verily, in the remembrance of Allah do hearts find rest and peace.'
  },
  {
    key: 'ease',
    title: 'WITH HARDSHIP COMES EASE',
    badge: '🌈 PROMISE • WITH HARDSHIP COMES EASE',
    surahNumber: 94,
    surahName: 'Ash-Sharh',
    startAyah: 1,
    endAyah: 8,
    category: 'hope',
    videoUrl: 'https://videos.pexels.com/video-files/5623817/5623817-hd_1920_1080_24fps.mp4',
    quote: 'For indeed, with hardship comes ease. Indeed, with hardship comes ease.'
  },
  {
    key: 'sabr',
    title: 'PATIENCE IN ADVERSITY (SABR)',
    badge: '⚓ STRENGTH • PATIENCE IN ADVERSITY',
    surahNumber: 2,
    surahName: 'Al-Baqarah',
    startAyah: 153,
    endAyah: 156,
    category: 'sabr',
    videoUrl: 'https://videos.pexels.com/video-files/28963293/12529743_1920_1080_24fps.mp4',
    quote: 'O you who have believed, seek help through patience and prayer. Indeed, Allah is with the patient.'
  },
  {
    key: 'tawbah',
    title: 'SINCERE REPENTANCE (TAWBAH)',
    badge: '🤲 RETURN • SINCERE REPENTANCE',
    surahNumber: 66,
    surahName: 'At-Tahrim',
    startAyah: 8,
    endAyah: 8,
    category: 'mercy',
    videoUrl: 'https://videos.pexels.com/video-files/32628145/13913113_1280_720_25fps.mp4',
    quote: 'O you who have believed, repent to Allah with sincere repentance.'
  },
  {
    key: 'jannah',
    title: 'THE GARDENS OF JANNAH',
    badge: '🌿 CONTEMPLATION • THE GARDENS OF JANNAH',
    surahNumber: 55,
    surahName: 'Ar-Rahmaan',
    startAyah: 46,
    endAyah: 50,
    category: 'hereafter',
    videoUrl: 'https://videos.pexels.com/video-files/6405064/6405064-hd_1920_1080_24fps.mp4',
    quote: 'And for him who feared the standing before his Lord, there are two gardens...'
  },
  {
    key: 'gratitude',
    title: 'GRATITUDE & ABUNDANCE (SHUKR)',
    badge: '✨ BLESSING • GRATITUDE & INCREASE',
    surahNumber: 14,
    surahName: 'Ibrahim',
    startAyah: 7,
    endAyah: 7,
    category: 'faith',
    videoUrl: 'https://videos.pexels.com/video-files/11265968/11265968-hd_1280_720_25fps.mp4',
    quote: 'If you are grateful, I will surely increase you [in favor].'
  },
  {
    key: 'parents',
    title: 'HONORING PARENTS',
    badge: '❤️ COMPASSION • HONORING PARENTS',
    surahNumber: 17,
    surahName: 'Al-Isra',
    startAyah: 23,
    endAyah: 24,
    category: 'character',
    videoUrl: 'https://videos.pexels.com/video-files/4779387/4779387-hd_1920_1080_30fps.mp4',
    quote: 'And say: My Lord, have mercy upon them as they brought me up when I was small.'
  }
];

// Helper for Canvas Text Wrapping
function getWrappedLines(ctx, text, maxWidth) {
  if (!text) return [];
  const words = text.split(' ');
  let lines = [];
  let currentLine = words[0] || '';

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

// Generate Titles, Detailed Descriptions, Reciter Credits & Hashtags Kit
function generateCaptionsKit({ mode, platform, titleStyle, selectedSurah, selectedLesson, selectedReciter }) {
  const reciterMeta = RECITERS_METADATA[selectedReciter] || RECITERS_METADATA['Husary_128kbps'];
  let title = '';
  let description = '';
  let creditsFormatted = '';
  let hashtags = [];

  if (mode === 'nature') {
    title = titleStyle === 'emotional'
      ? `Peaceful Nature Scenery 🌿 Calming Mind Relaxation, Deep Sleep & Stress Relief`
      : titleStyle === 'seo'
      ? `Scenic Nature Video | 720p HD Pure Landscape Loop for Meditation & Study`
      : `Play this peaceful nature video to calm your mind & sleep peacefully 🌊`;

    creditsFormatted = `🌿 SOUNDSCAPE & VISUAL ATTRIBUTION:
• Visual Scenery: 100% Royalty-Free Cinematic Nature Loop (Pexels / Licensed)
• Format: 1280x720 HD (16:9 Landscape MP4)
• Purpose: Pure Mind Relaxation, Peaceful Environment, Sleep & Meditation`;

    hashtags = ['#NatureLoop', '#MindRelaxation', '#PeacefulEnvironment', '#RelaxingNature', '#DeepSleep', '#NatureSounds', '#Meditation', '#StressRelief'];

    if (platform === 'youtube') {
      description = `🌿 Pure Peaceful Nature for Mind Relaxation, Calm Environment & Deep Sleep.

Immerse yourself in clean, uninterrupted natural scenery. This pure video loop is crafted to create a serene environment—perfect for relaxing after a long day, deep restorative sleep, stress relief, reading, or quiet focus.

✨ VIDEO HIGHLIGHTS:
• Format: 1280x720 HD MP4 Landscape
• Visuals: Uninterrupted natural scenery
• Usage: Relaxation, Deep Sleep, Insomnia Relief, Meditation, Study

${creditsFormatted}

${hashtags.join(' ')}`;
    } else {
      description = `🌿 Need a moment of calm? Here is a peaceful nature loop for deep mind relaxation and serenity.

${creditsFormatted}

${hashtags.slice(0, 8).join(' ')}`;
    }
  } else if (mode === 'reflection') {
    title = `If Your Prayers Feel Delayed, Listen To This... 🕊️ | Path to Peace`;
    creditsFormatted = `🕊️ PRODUCTION & CHANNEL ATTRIBUTION:
• Channel: Path to Peace (P.T.P)
• Format: 9:16 Vertical Video (YouTube Shorts / TikTok / Reels)
• Visuals: 100% Royalty-Free Golden Sunset & Coastal Surf
• Background Audio: Nocturne — Asher Fulero (Cleared for Monetization)`;
    hashtags = ['#PathToPeace', '#IslamicReminder', '#QuranReflection', '#TrustAllah', '#Dua', '#InnerPeace', '#Shorts', '#Sabr', '#Tawakkul'];
    description = `To anyone feeling overwhelmed, exhausted, or wondering why their prayers feel unanswered: Allah has not forgotten you. What is written for you will never pass you by.

🕊️ Channel: Path to Peace (P.T.P)
📖 Reflection: Surah Ash-Sharh & Surah Ad-Duha
🤲 "And your Lord will give you, and you will be satisfied." [Quran 93:5]

Take a moment to breathe, leave your worries to Allah, and trust divine timing. Subscribe to Path to Peace for daily spiritual solace.

${hashtags.join(' ')}`;
  } else if (mode === 'lessons') {
    const lesson = selectedLesson || QURAN_LESSONS[0];
    const surahClean = (lesson.surahName || 'Surah').replace(/[^a-zA-Z]/g, '');
    const reciterTag = reciterMeta.name.replace(/Sheikh\s*/i, '').replace(/[^a-zA-Z]/g, '');

    if (titleStyle === 'emotional') {
      title = `${lesson.title} 🤲 Surah ${lesson.surahName} (${lesson.startAyah}-${lesson.endAyah}) | ${reciterMeta.name} 🕊️`;
    } else if (titleStyle === 'seo') {
      title = `${lesson.title} - Surah ${lesson.surahName} Verses ${lesson.startAyah} to ${lesson.endAyah} | Recited by ${reciterMeta.name}`;
    } else {
      title = `Listen to this Quran verse when you need ${lesson.title} ✨ Daily Reminder | ${reciterMeta.name}`;
    }

    creditsFormatted = `🎙️ RECITER CREDITS & ATTRIBUTION:
• Qari / Reciter: ${reciterMeta.name} (${reciterMeta.arabicName})
• Designation: ${reciterMeta.title} (${reciterMeta.origin})
• Riwayah: ${reciterMeta.riwayah}
• Style: ${reciterMeta.style}
• Audio Courtesy: EveryAyah Public Recitation Archive
• Video Production: ProEase Quran Video Studio (720p HD MP4)`;

    hashtags = [
      '#QuranReminder',
      `#${(lesson.category || 'faith').toUpperCase()}`,
      `#Surah${surahClean}`,
      `#${reciterTag}`,
      '#IslamicReminder',
      '#QuranRecitation',
      '#Islam',
      '#Muslim',
      '#Peace',
      '#Tajweed',
      '#QuranVerses'
    ];

    if (platform === 'youtube' || platform === 'shorts') {
      description = `⚡ Quran Lesson & Spiritual Reminder: "${lesson.title}"
📖 Surah ${lesson.surahName}, Verses ${lesson.startAyah}–${lesson.endAyah}

"${lesson.quote}"

Recited with heartfelt melody and precision by ${reciterMeta.name}. Take a moment to reflect on this divine guidance today.

${creditsFormatted}

🤲 "And remind, for indeed, the reminder benefits the believers." [Quran 51:55]
Hit Subscribe for more uplifting Quran lessons and peaceful recitations!

${hashtags.join(' ')}`;
    } else {
      description = `✨ ${lesson.title} • Surah ${lesson.surahName} (${lesson.startAyah}-${lesson.endAyah})
"${lesson.quote}"
Recited by ${reciterMeta.name}.

${creditsFormatted}

${hashtags.slice(0, 8).join(' ')}`;
    }
  } else {
    // QURAN RECITATION MODE - FULL CONTINUOUS SURAH
    const surah = selectedSurah || {
      number: 1,
      englishName: 'Al-Faatiha',
      englishNameTranslation: 'The Opening',
      numberOfAyahs: 7
    };

    const surahClean = (surah.englishName || 'AlFaatiha').replace(/[^a-zA-Z]/g, '');
    const reciterTag = reciterMeta.name.replace(/Sheikh\s*/i, '').replace(/[^a-zA-Z]/g, '');

    if (titleStyle === 'emotional') {
      title = `Heart-Melting Surah ${surah.englishName} Full Recitation | ${reciterMeta.name} 720p HD | Beautiful Quran For Soul 🕊️`;
    } else if (titleStyle === 'seo') {
      title = `Surah ${surah.englishName} Full (${surah.englishNameTranslation || ''}) - ${reciterMeta.name} | 720p HD Crystal Audio & English Translation`;
    } else {
      title = `Listen To Surah ${surah.englishName} Before Sleeping... Pure Peace & Protection ✨ | ${reciterMeta.name}`;
    }

    creditsFormatted = `🎙️ RECITER CREDITS & ATTRIBUTION:
• Qari (Reciter): ${reciterMeta.name} (${reciterMeta.arabicName})
• Designation: ${reciterMeta.title}
• Origin: ${reciterMeta.origin}
• Riwayah: ${reciterMeta.riwayah}
• Recitation Style: ${reciterMeta.style}
• Audio Courtesy: EveryAyah Public Recitation Archive`;

    hashtags = [
      '#Quran',
      `#Surah${surahClean}`,
      `#${reciterTag}`,
      '#QuranRecitation',
      '#Islam',
      '#Muslim',
      '#Peace',
      '#QuranTilawat',
      '#HolyQuran',
      '#IslamicReminder',
      '#Tajweed',
      '#HeartSoothing',
      '#BeautifulQuran',
      '#QuranVerses'
    ];

    if (platform === 'youtube') {
      description = `✨ Heart-Melting Complete Recitation of Surah ${surah.englishName} (${surah.englishNameTranslation || ''}) by ${reciterMeta.name}

Listen to the complete recitation of Surah ${surah.englishName} recited with immaculate Tajweed and soulful melody. May this holy recitation illuminate your heart, bring tranquility to your spirit, and fill your home with divine barakah.

📖 SURAH DETAILS:
• Surah Name: ${surah.englishName}
• Meaning: ${surah.englishNameTranslation || ''}
• Surah Number: ${surah.number}
• Total Verses: ${surah.numberOfAyahs} Ayahs (Full Surah Continuous)

${creditsFormatted}

🎬 VIDEO PRODUCTION & TECHNICAL SPECS:
• Studio: ProEase Quran Video Studio
• Video Quality: 1280x720 HD MP4 (16:9 Landscape Format)
• Audio: High-Fidelity Synchronized Audio
• Visuals: Cinematic Royalty-Free Nature Background Loop (Pexels / Licensed)
• Overlay: Uthmani Script Typography with English Sahih Translation

🤲 SPIRITUAL REMINDER & HADITH:
The Messenger of Allah ﷺ said: "Whoever recites a letter from the Book of Allah, he will receive one good deed as ten good deeds like it." (Sunan at-Tirmidhi)

If this recitation brought peace to your heart, please Like, Share, and Subscribe to support spreading the message of the Holy Quran worldwide.

${hashtags.join(' ')}`;
    } else if (platform === 'shorts') {
      description = `✨ Surah ${surah.englishName} (${surah.englishNameTranslation || ''}) Full Recitation
Recited by ${reciterMeta.name} 🕊️
Find peace in the words of Allah.

${creditsFormatted}

${hashtags.slice(0, 10).join(' ')}`;
    } else {
      description = `✨ Surah ${surah.englishName} (${surah.englishNameTranslation || ''})
Recited by ${reciterMeta.name} (${reciterMeta.origin}).
Take a moment to listen and reflect. 🤲

${creditsFormatted}

${hashtags.slice(0, 8).join(' ')}`;
    }
  }

  return { title, description, creditsFormatted, hashtags, reciterMeta };
}

// AI Shorts Contextual Script & Prompt Engine
function generateAIShortsScript(lesson) {
  if (!lesson) return null;
  const themeName = lesson.title;
  const ref = `Surah ${lesson.surahName} (Verses ${lesson.startAyah}-${lesson.endAyah})`;
  const quote = lesson.quote;

  let visualMood = 'Cinematic nature and atmospheric serenity';
  let colorGrade = 'Golden hour amber & deep twilight blue';
  let cameraMotion = 'Slow cinematic drone drift and gentle rhythmic waves';

  if (lesson.category === 'death' || lesson.category === 'hereafter') {
    visualMood = 'Solemn, reflective, vast cosmic horizon and ocean waves under dramatic evening clouds';
    colorGrade = 'Deep midnight blue with subtle golden twilight rim light';
    cameraMotion = 'Slow smooth push-in toward the horizon, solemn and majestic';
  } else if (lesson.category === 'imaan' || lesson.category === 'faith') {
    visualMood = 'Radiant sun rays piercing through an evergreen pine forest';
    colorGrade = 'Warm golden sunflare, emerald green leaves, divine light beams';
    cameraMotion = 'Gentle upward tilt toward sun rays filtering through tree canopy';
  } else if (lesson.category === 'mercy' || lesson.category === 'hope') {
    visualMood = 'Soft garden rain falling on green leaves with morning dew';
    colorGrade = 'Fresh emerald green, soft silver mist, gentle warm lighting';
    cameraMotion = 'Macro close-up slow motion droplets falling on velvet leaves';
  } else if (lesson.category === 'peace') {
    visualMood = 'Serene alpine river flowing smoothly over crystal pebbles';
    colorGrade = 'Tranquil blue water reflections, soft daylight';
    cameraMotion = 'Flowing water tracking shot, steady and calming';
  }

  return {
    title: `AI Shorts Production Brief: ${themeName}`,
    targetRef: ref,
    coreMessage: quote,
    videoPrompt: `Cinematic 9:16 vertical video prompt for AI generation (Veo / Sora / Runway): ${visualMood}, ${cameraMotion}, ${colorGrade}, photorealistic 4k resolution, high dynamic range, meditative atmosphere, 60fps steadycam.`,
    hookScript: `(0-3s Hook): "Stop scrolling for a moment. Let the words of ${ref} settle into your heart..."`,
    reflectionNotes: `(3-15s Recitation & Reflection): Play the recitation of ${lesson.surahName} (${lesson.startAyah}-${lesson.endAyah}) by Qari. Display Arabic text in radiant gold with English translation below.`,
    typography: 'Primary Arabic font: Amiri (Gold #fde047). Translation font: Inter (White). Background: Clean 9:16 portrait canvas with subtle gradient scrim.',
    hashtags: ['#QuranShorts', `#${lesson.category.toUpperCase()}`, `#Surah${lesson.surahName.replace(/[^a-zA-Z0-9]/g, '')}`, '#IslamicReminder', '#Peace', '#QuranVerse']
  };
}

// Path to Peace (P.T.P) Short Reflection Production Generator
function buildPtpReflectionPackage(quote) {
  const q = (quote || '').toLowerCase();
  let lines = [
    'If you feel left behind right now,',
    'read this carefully:',
    'A delay from Allah is never a denial.',
    'He is not making you wait to punish you.',
    'He is preparing you for what you asked for.',
    'Trust His timing. 🤍'
  ];
  let voiceover = `(Soft, soothing, reassuring tone — deep breath)\n"If you’ve been feeling like everyone around you is moving forward... while your life is standing still, take a deep breath.\n\n(Pause 0.8s)\nYou are not falling behind.\n\nWhen Allah delays an answer to your Dua, it’s not because He forgot you. A delayed prayer is never a denied prayer.\n\nSometimes, He holds back what you want today, to protect your heart... and prepare you for something far greater than you imagined.\n\n(Gentle whisper)\nWhat is written for you will never miss you. Trust the One who wrote your story."`;
  let ytTrack = 'Nocturne — Asher Fulero (YouTube Audio Library - Free & Cleared for Monetization)';
  let pixabayQuery = 'ambient meditation calm emotional ney islam flute spiritual';
  let visualConcept = 'Slow cinematic drone shot gliding low over calm ocean waves at sunset with warm amber backlight, subtle coastal mist, and centered 9:16 vertical typography with soft golden glows.';
  let matchedVideoId = 'sea-sunset';
  let title = 'If Your Prayers Feel Delayed, Listen To This... 🕊️ | Path to Peace';
  let description = `To anyone feeling overwhelmed, exhausted, or wondering why their prayers feel unanswered: Allah has not forgotten you. What is written for you will never pass you by.\n\n🕊️ Channel: Path to Peace (P.T.P)\n📖 Reflection: Surah Ash-Sharh & Surah Ad-Duha\n🤲 "And your Lord will give you, and you will be satisfied." [Quran 93:5]\n\nTake a moment to breathe, leave your worries to Allah, and trust divine timing. Subscribe to Path to Peace for daily spiritual solace.\n\n#PathToPeace #IslamicReminder #QuranReflection #InnerPeace #Tawakkul #Shorts #Dua #Sabr`;
  let pinnedComment = 'Drop a 🤍 if you needed this reminder today. What prayer are you patiently trusting Allah with right now? 🤲 Let us make Dua for each other in the comments below.';
  let hashtags = ['#PathToPeace', '#IslamicReminder', '#QuranReflection', '#TrustAllah', '#Dua', '#InnerPeace', '#Shorts', '#Sabr', '#Tawakkul', '#ShortsViral'];

  if (q.includes('exhaust') || q.includes('tired') || q.includes('alone') || q.includes('battle')) {
    lines = [
      'To the soul fighting silent battles:',
      'read this and exhale:',
      'Allah sees every tear you hide.',
      'He knows how hard you are trying.',
      '"Indeed, Allah is with the patient."',
      'Ease is already on its way. 🕊️'
    ];
    voiceover = `(Warm, reassuring, empathetic tone)\n"If today felt heavier than usual, and you feel like no one truly understands the silent battles you are carrying alone...\n\n(Pause 0.8s)\nRemember: Allah sees you.\n\nHe hears the silent prayers you cannot put into words.\n\nEvery heavy breath, every drop of tears, every second of patience is recorded with Him.\n\n(Gentle reassurance)\nRest your heart tonight. Relief is already on its way to you."`;
    title = 'To The Soul Fighting Silent Battles Today... 🕊️ | Path to Peace';
    description = `You are not alone. When nobody sees what you are going through, Allah sees your heart, your patience, and your silent prayers.\n\n🕊️ Channel: Path to Peace (P.T.P)\n📖 Reflection: Surah Al-Baqarah (2:153)\n🤲 "Indeed, Allah is with the patient."\n\nTake solace in His presence. Subscribe to Path to Peace.\n\n#PathToPeace #SilentBattles #IslamicReminder #Patience #Sabr #Healing #InnerPeace`;
    pinnedComment = 'Drop a 🕊️ if you are carrying something heavy today. Remember: you never have to carry it alone. Allah is with you.';
  } else if (q.includes('anxious') || q.includes('worry') || q.includes('future') || q.includes('fear')) {
    lines = [
      'If your heart is anxious about tomorrow,',
      'let this bring you peace:',
      'The One who took care of you yesterday,',
      'will take care of you today and tomorrow.',
      'Surrender the worry to Him.',
      'His plan is gentler than your fears. 🌿'
    ];
    voiceover = `(Gentle, grounding, calm whisper)\n"If your mind has been racing with worry about tomorrow...\n\nTake a deep breath and let your shoulders drop.\n\n(Pause 0.8s)\nYou don’t have to figure everything out today.\n\nThe same Lord who carried you through yesterday’s storms is already in your tomorrow.\n\nSurrender the uncertainty to Allah. He will never abandon a heart that trusts in Him."`;
    title = 'Stop Worrying About Tomorrow... Listen To This 🕊️ | Path to Peace';
    description = `Cast your anxieties and future worries to the One who manages the entire universe with absolute mercy and precision.\n\n🕊️ Channel: Path to Peace (P.T.P)\n📖 Reflection: Surah At-Talaq (65:3)\n🤲 "And whoever relies upon Allah - then He is sufficient for him."\n\n#PathToPeace #AnxietyRelief #Tawakkul #TrustAllah #IslamicReminder #InnerPeace`;
    pinnedComment = 'Say "Alhamdulillah" and let go of the worry. Allah is in control of your tomorrow. 🤍';
  } else if (q.includes('break') || q.includes('grief') || q.includes('heart') || q.includes('hurt') || q.includes('sad')) {
    lines = [
      'If your heart feels broken right now,',
      'remember this promise:',
      'Allah never breaks something in your life,',
      'except to rebuild it better.',
      '"Unquestionably, by the remembrance of Allah',
      'hearts find rest." 🕊️'
    ];
    voiceover = `(Gentle soothing voice)\n"To the heart that feels fractured and tender today...\n\nKnow that Allah is closest to the brokenhearted.\n\n(Pause 0.8s)\nWhat feels like an ending right now is just Allah closing a door that was hurting you, so He can open the door that will heal you.\n\nPlace your heart in His hands. He will mend every broken piece."`;
    title = 'When Your Heart Feels Broken, Remember This... 💔🕊️ | Path to Peace';
    description = `A tender reminder for anyone healing from heartbreak, grief, or disappointment. Allah is the healer of all broken hearts.\n\n🕊️ Channel: Path to Peace (P.T.P)\n📖 Reflection: Surah Ar-Ra'd (13:28)\n\n#PathToPeace #Heartbreak #Healing #InnerPeace #Allah #IslamicReminder`;
    pinnedComment = 'Leave a 🤲 for healing. May Allah soothe every ache in your chest tonight.';
  } else if (q && !q.includes('delay') && !q.includes('overwhelm') && !q.includes('stress')) {
    // Smart dynamic adapter for any custom raw quote/thought
    const words = quote.trim().split(/\s+/);
    if (words.length > 5) {
      const chunk1 = words.slice(0, Math.ceil(words.length / 3)).join(' ');
      const chunk2 = words.slice(Math.ceil(words.length / 3), Math.ceil(words.length * 2 / 3)).join(' ');
      const chunk3 = words.slice(Math.ceil(words.length * 2 / 3)).join(' ');
      lines = [
        'Take a breath and remember:',
        `"${chunk1}`,
        `${chunk2}`,
        `${chunk3}"`,
        'Allah is closer to you than your jugular vein.',
        'Trust His divine plan. 🕊️'
      ];
    }
    title = 'A Gentle Reminder For Your Soul Today 🕊️ | Path to Peace';
  }

  return {
    lines,
    voiceover,
    ytTrack,
    pixabayQuery,
    visualConcept,
    matchedVideoId,
    title,
    description,
    pinnedComment,
    hashtags
  };
}

const DEFAULT_SOCIAL_CHANNELS = [
  {
    id: 'youtube',
    name: 'YouTube & Shorts',
    badge: '🔴 YouTube',
    color: '#ef4444',
    connected: false,
    accountName: '',
    handle: '',
    channelId: '',
    avatar: '🕊️',
    autoPost: true,
    privacy: 'public',
    sessionToken: '',
    connectedAt: null,
    totalPosts: 0
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    badge: '🎵 TikTok',
    color: '#ec4899',
    connected: false,
    accountName: '',
    handle: '',
    channelId: '',
    avatar: '✨',
    autoPost: true,
    privacy: 'public',
    sessionToken: '',
    connectedAt: null,
    totalPosts: 0
  },
  {
    id: 'facebook',
    name: 'Facebook Page & Reels',
    badge: '📘 Facebook',
    color: '#3b82f6',
    connected: false,
    accountName: '',
    handle: '',
    channelId: '',
    avatar: '📖',
    autoPost: true,
    privacy: 'public',
    sessionToken: '',
    connectedAt: null,
    totalPosts: 0
  },
  {
    id: 'instagram',
    name: 'Instagram Reels',
    badge: '📸 Instagram',
    color: '#f43f5e',
    connected: false,
    accountName: '',
    handle: '',
    channelId: '',
    avatar: '🌙',
    autoPost: false,
    privacy: 'public',
    sessionToken: '',
    connectedAt: null,
    totalPosts: 0
  }
];

export default function App() {
  const [activeMode, setActiveMode] = useState('lessons'); // 'quran' | 'lessons' | 'reflection' | 'nature'
  const [reflectionQuote, setReflectionQuote] = useState('I feel overwhelmed by stress, like everyone else is moving forward while my prayers feel delayed.');
  const [reflectionTextLines, setReflectionTextLines] = useState([
    'If you feel left behind right now,',
    'read this carefully:',
    'A delay from Allah is never a denial.',
    'He is not making you wait to punish you.',
    'He is preparing you for what you asked for.',
    'Trust His timing. 🤍'
  ]);
  const initialPtpPkg = buildPtpReflectionPackage('I feel overwhelmed by stress, like everyone else is moving forward while my prayers feel delayed.');
  const [reflectionVoiceoverScript, setReflectionVoiceoverScript] = useState(initialPtpPkg.voiceover);

  // Dynamic Font Resizing & Frame-Safe Constraints
  const [arabicFontScale, setArabicFontScale] = useState(1.0); // 0.65 to 1.65x
  const [translationFontScale, setTranslationFontScale] = useState(1.0); // 0.65 to 1.65x
  const [reflectionFontSize, setReflectionFontSize] = useState(50); // 20px to 54px on 1080p
  const [fontPreset, setFontPreset] = useState('normal'); // 'compact' | 'normal' | 'large' | 'cinematic'

  const applyFontPreset = (preset) => {
    setFontPreset(preset);
    if (preset === 'compact') {
      setArabicFontScale(0.8);
      setTranslationFontScale(0.85);
      setReflectionFontSize(26);
    } else if (preset === 'normal') {
      setArabicFontScale(1.0);
      setTranslationFontScale(1.0);
      setReflectionFontSize(34);
    } else if (preset === 'large') {
      setArabicFontScale(1.22);
      setTranslationFontScale(1.18);
      setReflectionFontSize(42);
    } else if (preset === 'cinematic') {
      setArabicFontScale(1.42);
      setTranslationFontScale(1.30);
      setReflectionFontSize(48);
    }
  };

  // Persistent Social Media Accounts & Saved Sessions
  const [socialChannels, setSocialChannels] = useState(() => {
    try {
      const saved = localStorage.getItem('proease_social_sessions_v3');
      const parsed = saved ? JSON.parse(saved) : [];
      if (Array.isArray(parsed)) return DEFAULT_SOCIAL_CHANNELS.map(channel => ({ ...channel,
        ...(parsed.find(item => item && item.id === channel.id) || {}), connected: false, verified: false }));
    } catch (e) {}
    return DEFAULT_SOCIAL_CHANNELS;
  });

  // Save social channels to localStorage whenever changed
  useEffect(() => {
    try {
      localStorage.setItem('proease_social_sessions_v3', JSON.stringify(socialChannels));
    } catch (e) {}
  }, [socialChannels]);

  // Auto-Post on Recording Complete Toggle (Persisted)
  const [autoPostOnFinish, setAutoPostOnFinish] = useState(() => {
    try {
      const saved = localStorage.getItem('proease_autopost_on_finish');
      if (saved !== null) return JSON.parse(saved) === true;
    } catch (e) {}
    return false;
  });

  useEffect(() => {
    try {
      localStorage.setItem('proease_autopost_on_finish', JSON.stringify(autoPostOnFinish));
    } catch (e) {}
  }, [autoPostOnFinish]);

  // Modals & Panels for Social Accounts & Publishing
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [connectingChannel, setConnectingChannel] = useState(null); // Platform currently connecting in OAuth modal
  const [authConnectingTab, setAuthConnectingTab] = useState('token'); // 'token' | 'oauth'
  const [verifyingToken, setVerifyingToken] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authStatusInfo, setAuthStatusInfo] = useState({ callbackUrl: '', configuredProviders: {} });
  const [serviceVersion,setServiceVersion]=useState(0);
  const [serviceState,setServiceState]=useState({connected:false,error:''});

  const [publishModalData, setPublishModalData] = useState(null); // Live auto-posting status data

  // Sync active social sessions from backend server on mount
  useEffect(() => {
    if(!serviceConfig().base){setServiceState({connected:false,error:''});setSocialChannels(previous=>previous.map(channel=>({...channel,connected:false})));return;}
    const controller=new AbortController();
    apiFetch('/api/auth/status',{signal:controller.signal})
      .then(async res => {const data=await res.json();if(!res.ok)throw new Error(data.error||'Publishing service could not connect.');return data;})
      .then(data => {
        if (data && data.sessions) {
          setServiceState({connected:true,error:''});
          setAuthStatusInfo({
            callbackUrl: data.callbackUrl || '',
            configuredProviders: data.configuredProviders || {}
          });
          setSocialChannels(prev => prev.map(ch => {
            const s = data.sessions[ch.id];
            if (s && s.connected) {
              return {
                ...ch,
                connected: true,
                accountName: s.accountName || ch.accountName,
                handle: s.handle || ch.handle,
                avatar: s.avatar || ch.avatar,
                channelId: s.channelId || ch.channelId,
                autoPost: s.autoPost !== undefined ? s.autoPost : ch.autoPost,
                privacy: s.privacy || ch.privacy,
                totalPosts: s.totalPosts || ch.totalPosts,
                verified: s.verified || false
              };
            }
            return { ...ch, connected: false, verified: false };
          }));
        }
      })
      .catch(error => {if(error.name==='AbortError')return;setServiceState({connected:false,error:error.message});setSocialChannels(previous=>previous.map(channel=>({...channel,connected:false})));});
    return()=>controller.abort();
  }, [serviceVersion]);

  // Listen for OAuth Popup PostMessage Completion
  useEffect(() => {
    const onMessage = (event) => {
      if (event.origin !== apiOrigin() || event.source !== oauthPopupRef.current) return;
      if (event.data && event.data.type === 'OAUTH_AUTH_SUCCESS') {
        const { provider, session } = event.data;
        setSocialChannels(prev => prev.map(ch => ch.id === provider ? {
          ...ch,
          connected: true,
          accountName: session.accountName || ch.accountName,
          handle: session.handle || ch.handle,
          avatar: session.avatar || ch.avatar,
          channelId: session.channelId || ch.channelId,
          autoPost: true,
          privacy: session.privacy || ch.privacy,
          verified: true,
          connectedAt: 'Real OAuth Session Active'
        } : ch));
        setConnectingChannel(null);
        setShareStatus(`✓ ${provider.toUpperCase()} Authorized successfully via OAuth!`);
        setTimeout(() => setShareStatus(''), 4500);
      } else if (event.data && event.data.type === 'OAUTH_AUTH_ERROR') {
        setAuthError(`OAuth cancelled or rejected: ${event.data.error || 'Unknown error'}`);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);
  const [publishedHistory, setPublishedHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('proease_published_history_v1');
      if (saved && Array.isArray(JSON.parse(saved))) return JSON.parse(saved).filter(item => item && typeof item.title === 'string' && typeof item.date === 'string' && typeof item.channelNames === 'string');
    } catch (e) {}
    return [];
  });

  const previewVoiceover = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(reflectionVoiceoverScript);
      utt.rate = 0.95;
      utt.pitch = 1.0;
      window.speechSynthesis.speak(utt);
    }
  };
  const [surahs, setSurahs] = useState([]);
  const [selectedSurah, setSelectedSurah] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(QURAN_LESSONS[0]);
  const [lessonCategory, setLessonCategory] = useState('all');
  const [lessonSearch, setLessonSearch] = useState('');
  const [selectedReciter, setSelectedReciter] = useState('Husary_128kbps');
  const [ayahData, setAyahData] = useState([]);
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingComplete, setIsProcessingComplete] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState('gradient');
  const [bgCategory, setBgCategory] = useState('all');
  const [processingSpeed, setProcessingSpeed] = useState(1.0); // 1.0x Normal Speed default (Pristine authentic recitation)
  const [statusText, setStatusText] = useState('Ready');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloadFilename, setDownloadFilename] = useState('');
  const [aspectRatio, setAspectRatio] = useState('9:16'); // '16:9' | '9:16'

  // Captions & Reciter Credits State
  const [captionsPlatform, setCaptionsPlatform] = useState('youtube'); // 'youtube' | 'shorts' | 'social'
  const [captionsTitleStyle, setCaptionsTitleStyle] = useState('emotional'); // 'emotional' | 'seo' | 'hook'
  const [copiedField, setCopiedField] = useState(null);
  const [recordedFile, setRecordedFile] = useState(null);
  const [completedAsset, setCompletedAsset] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [inspectorTab, setInspectorTab] = useState('content');
  const [workspaceTab, setWorkspaceTab] = useState('studio');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loadVersion, setLoadVersion] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [renderPhase, setRenderPhase] = useState('');
  const [renderEngine,setRenderEngine]=useState('browser');
  useEffect(()=>{const changed=()=>setServiceVersion(value=>value+1);window.addEventListener('proease-service-change',changed);return()=>window.removeEventListener('proease-service-change',changed);},[]);
  const [authForm, setAuthForm] = useState({ token: '', pageId: '', privacy: 'public' });
  const [tikTokCreator,setTikTokCreator]=useState(null);
  const [tikTokSettings,setTikTokSettings]=useState({privacy:'',disableDuet:true,disableStitch:true,disableComment:true});
  useEffect(()=>{setTikTokCreator(null);setTikTokSettings(previous=>({...previous,privacy:''}));if(!socialChannels.some(channel=>channel.id==='tiktok'&&channel.connected))return;let active=true;apiFetch('/api/auth/tiktok/creator').then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error);return data;}).then(data=>{if(active)setTikTokCreator(data.creator);}).catch(error=>{if(active)setShareStatus(error.message);});return()=>{active=false;};},[serviceVersion,socialChannels.find(channel=>channel.id==='tiktok')?.connected,socialChannels.find(channel=>channel.id==='tiktok')?.channelId]);
  const [shareStatus, setShareStatus] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');

  const logoImgObjRef = useRef(null);
  const oauthPopupRef = useRef(null);
  const playbackGenerationRef = useRef(0);
  const ambientRef = useRef(null);
  const renderOverlayRef = useRef(null);
  const backendRenderingRef = useRef(false);
  const renderRequestRef = useRef(null);
  const backgroundKindRef=useRef(selectedVideoUrl);backgroundKindRef.current=selectedVideoUrl;
  const publishInFlightRef = useRef(false);
  const completedAssetRef = useRef(null);
  const autoPostEnabledRef = useRef(autoPostOnFinish);
  const autoPostTimerRef = useRef(null);
  autoPostEnabledRef.current = autoPostOnFinish;
  const setAutoPostEnabled = value => {
    autoPostEnabledRef.current = value;
    setAutoPostOnFinish(value);
    if (!value && autoPostTimerRef.current) { clearTimeout(autoPostTimerRef.current); autoPostTimerRef.current = null; }
  };
  const saveCompletedVideo = (file, metadata, mode, ratio) => {
    const asset = createVideoAsset(file, metadata, mode, ratio);
    completedAssetRef.current = asset;
    setCompletedAsset(asset);
    setRecordedFile(file);
    return asset;
  };
  const updateAsset = asset => { completedAssetRef.current = asset; setCompletedAsset(asset); };
  const queueAutoPost = asset => {
    if (autoPostTimerRef.current) clearTimeout(autoPostTimerRef.current);
    autoPostTimerRef.current = setTimeout(() => {
      autoPostTimerRef.current = null;
      if (autoPostEnabledRef.current && completedAssetRef.current?.id === asset.id && !backendRenderingRef.current) {
        publishToConnectedAccounts(null, completedAssetRef.current);
      }
    }, 900);
  };
  const socialChannelsRef = useRef(socialChannels);
  socialChannelsRef.current = socialChannels;
  useEffect(() => () => { if (downloadUrl) URL.revokeObjectURL(downloadUrl); }, [downloadUrl]);
  useEffect(() => () => { if (logoUrl.startsWith('blob:')) URL.revokeObjectURL(logoUrl); }, [logoUrl]);
  useEffect(() => () => { if (selectedVideoUrl.startsWith('blob:')) URL.revokeObjectURL(selectedVideoUrl); }, [selectedVideoUrl]);

  useEffect(() => {
    if (!logoUrl) {
      logoImgObjRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = logoUrl;
    img.onload = () => { logoImgObjRef.current = img; };
    img.onerror = () => { logoImgObjRef.current = null; setShareStatus('Could not load the logo. Choose a valid image file.'); };
    return () => { img.onload = null; img.onerror = null; };
  }, [logoUrl]);

  // Background Video Source Tabs & Pexels Search State
  const [bgTab, setBgTab] = useState('presets'); // 'presets' | 'pexels' | 'upload'
  const [pexelsApiKey, setPexelsApiKey] = useState('');
  const [pexelsQuery, setPexelsQuery] = useState('ocean waves');
  const [pexelsResults, setPexelsResults] = useState([]);
  const [pexelsSearching, setPexelsSearching] = useState(false);

  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const audioRefA = useRef(null);
  const audioRefB = useRef(null);
  const activeSlotRef = useRef('A'); // Alternating buffer slot: 'A' or 'B'
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const animationFrameIdRef = useRef(null);
  const renderHeartbeatRef = useRef(null);
  const surahCacheRef = useRef({});
  const isPlayingRef = useRef(false);
  const isRecordingRef = useRef(false);
  const currentAyahIndexRef = useRef(0);
  const watchdogTimerRef = useRef(null);
  const reflectionTimerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const masterGainRef = useRef(null);
  const destNodeRef = useRef(null);
  const audioSourceARef = useRef(null);
  const audioSourceBRef = useRef(null);
  const activeBufferSourceRef = useRef(null);
  const scheduledSourcesRef = useRef([]);
  const schedulerTimerRef = useRef(null);
  const audioBufferCacheRef = useRef(new Map());
  const audioLoadingPromisesRef = useRef(new Map());
  const verseChangeTimeRef = useRef(performance.now());
  const lastVideoCanvasRef = useRef(null);
  const lastVideoCacheTimeRef = useRef(0);
  const canvasStreamRef = useRef(null);
  const combinedStreamRef = useRef(null);

  // Continuous Ref Sync for Uninterrupted Canvas Render Loop
  const ayahDataRef = useRef([]);
  const activeModeRef = useRef('surah');
  const selectedLessonRef = useRef(null);
  const selectedSurahRef = useRef(null);
  const aspectRatioRef = useRef('16:9');
  const arabicFontScaleRef = useRef(1.0);
  const translationFontScaleRef = useRef(1.0);
  const reflectionFontSizeRef = useRef(28);
  const reflectionTextLinesRef = useRef([]);

  ayahDataRef.current = ayahData;
  currentAyahIndexRef.current = currentAyahIndex;
  activeModeRef.current = activeMode;
  selectedLessonRef.current = selectedLesson;
  selectedSurahRef.current = selectedSurah;
  aspectRatioRef.current = aspectRatio;
  arabicFontScaleRef.current = arabicFontScale;
  translationFontScaleRef.current = translationFontScale;
  reflectionFontSizeRef.current = reflectionFontSize;
  reflectionTextLinesRef.current = reflectionTextLines;

  // Web Audio Bridge Initializer: Connects audio elements seamlessly to recording stream and speakers
  // Guaranteed persistent references prevent V8 garbage-collection crashes during recording
  const initAudioBridge = () => {
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const existingTrack = destNodeRef.current ? destNodeRef.current.stream.getAudioTracks()[0] : null;
      const trackIsHealthy = existingTrack && existingTrack.readyState === 'live';

      if (!masterGainRef.current || !destNodeRef.current || !trackIsHealthy) {
        const dest = ctx.createMediaStreamDestination();
        const gain = ctx.createGain();
        gain.gain.value = 1.0;
        gain.connect(dest);
        gain.connect(ctx.destination);

        destNodeRef.current = dest;
        masterGainRef.current = gain;

        if (audioRefA.current) {
          try {
            audioRefA.current.crossOrigin = 'anonymous';
            if (!audioSourceARef.current) {
              const srcA = ctx.createMediaElementSource(audioRefA.current);
              srcA.connect(gain);
              audioSourceARef.current = srcA;
              audioRefA.current._connected = true;
            } else {
              try {
                audioSourceARef.current.disconnect();
                audioSourceARef.current.connect(gain);
              } catch(discErr) {}
            }
          } catch(e) {
            console.warn('AudioSource A attachment notice:', e);
          }
        }

        if (audioRefB.current) {
          try {
            audioRefB.current.crossOrigin = 'anonymous';
            if (!audioSourceBRef.current) {
              const srcB = ctx.createMediaElementSource(audioRefB.current);
              srcB.connect(gain);
              audioSourceBRef.current = srcB;
              audioRefB.current._connected = true;
            } else {
              try {
                audioSourceBRef.current.disconnect();
                audioSourceBRef.current.connect(gain);
              } catch(discErr) {}
            }
          } catch(e) {
            console.warn('AudioSource B attachment notice:', e);
          }
        }
      }
      return destNodeRef.current ? destNodeRef.current.stream : null;
    } catch (e) {
      console.warn('Web Audio bridge initialization:', e);
      return null;
    }
  };

  // Gentle ambient drone generator for P.T.P Short Reflection mode
  const playAmbientTone = () => {
    try {
      const ctx = audioCtxRef.current;
      if (!ctx || !masterGainRef.current) return null;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const oscGain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(216, ctx.currentTime);
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(324, ctx.currentTime);

      oscGain.gain.setValueAtTime(0.001, ctx.currentTime);
      oscGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 1.5);

      osc1.connect(oscGain);
      osc2.connect(oscGain);
      oscGain.connect(masterGainRef.current);

      osc1.start();
      osc2.start();

      return {
        stop: () => {
          try {
            oscGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 1);
            setTimeout(() => {
              try { osc1.stop(); osc2.stop(); } catch(e){}
            }, 1100);
          } catch(e) {}
        }
      };
    } catch(e) {
      return null;
    }
  };

  // Resilient Gapless Audio Buffer Preloader (Single-flight Promise caching & safe PCM decoding)
  const preloadAudioBuffer = async (url) => {
    if (!url) return null;
    if (audioBufferCacheRef.current.has(url)) {
      return audioBufferCacheRef.current.get(url);
    }
    if (audioLoadingPromisesRef.current.has(url)) {
      return audioLoadingPromisesRef.current.get(url);
    }

    const loaderPromise = (async () => {
      try {
        let res = await fetch(url, { signal: AbortSignal.timeout(15000) }).catch(() => null);
        if (!res || !res.ok) {
          res = await apiFetch(`/api/proxy?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(15000) }).catch(() => null);
        }
        if (!res || !res.ok) return null;
        const arrayBuffer = await res.arrayBuffer();
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          audioCtxRef.current = new AudioContextClass();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        const bufCopy = arrayBuffer.slice(0);
        const decoded = await new Promise((resolve, reject) => {
          ctx.decodeAudioData(bufCopy, resolve, reject);
        });
        audioBufferCacheRef.current.set(url, decoded);
        while (audioBufferCacheRef.current.size > 12) audioBufferCacheRef.current.delete(audioBufferCacheRef.current.keys().next().value);
        return decoded;
      } catch (err) {
        console.warn('Audio decode notice for', url, err);
        return null;
      } finally {
        audioLoadingPromisesRef.current.delete(url);
      }
    })();

    audioLoadingPromisesRef.current.set(url, loaderPromise);
    return loaderPromise;
  };

  const fetchQuranJson = async (path,signal) => {
    const match=path.match(/^\/surah\/(\d+)/);
    const response=await fetch(assetUrl(match?`quran/${Number(match[1])}.json`:'quran/chapters.json'),{signal});
    if(!response.ok)throw new Error('Quran text could not load. Refresh the page to update its files.');
    const data=await response.json();
    if(!Array.isArray(data)||!data.length)throw new Error('Quran text was incomplete.');
    if(!match)return {code:200,data};
    return {code:200,data:['arabic','transliteration','translation'].map(key=>({ayahs:data.map(verse=>({numberInSurah:verse.numberInSurah,text:verse[key]}))}))};
  };

  // 1. Fetch Surah List on Mount
  useEffect(() => {
    const controller = new AbortController();
    fetchQuranJson('/surah', controller.signal)
      .then(data => {
        if (data.code === 200 && data.data) {
          if (!Array.isArray(data.data) || data.data.some(item => !Number.isInteger(item.number) || typeof item.englishName !== 'string')) throw new Error('The Quran service returned an invalid Surah list. Please retry.');
          setSurahs(data.data);
          setSelectedSurah(previous => data.data.find(item => item.number === previous?.number) || data.data[0]);
        }
      })
      .catch(err => { if (!controller.signal.aborted && ['quran', 'lessons'].includes(activeModeRef.current)) setLoadError(err.message); });
    return () => controller.abort();
  }, [loadVersion]);

  // 2. Fetch Ayah Data when Selected Surah, Lesson, or Reciter Changes
  useEffect(() => {
    if (activeMode === 'reflection' || activeMode === 'nature') { setStatusText('Ready'); return; }
    if (activeMode === 'quran' && !selectedSurah) return;
    const controller = new AbortController();
    setLoadError('');
    setAyahData([]);
    let surahNum = 1;
    let startAyah = 1;
    let endAyah = 999;

    if (activeMode === 'lessons' && selectedLesson) {
      surahNum = selectedLesson.surahNumber;
      startAyah = selectedLesson.startAyah || 1;
      endAyah = selectedLesson.endAyah || 999;
      setStatusText(`Loading: ${selectedLesson.title}...`);
    } else if (selectedSurah) {
      surahNum = selectedSurah.number;
      setStatusText(`Loading Surah ${selectedSurah.englishName}...`);
    }

    const surahPadded = surahNum.toString().padStart(3, '0');
    const reciterFolder = RECITERS_METADATA[selectedReciter] ? RECITERS_METADATA[selectedReciter].folder : 'Husary_128kbps';

    const applyVerses = (rawList) => {
      if (controller.signal.aborted) return;
      let verses = rawList.map(item => {
        const numInSurah = item.numberInSurah;
        const ayahPadded = numInSurah.toString().padStart(3, '0');
        return {
          numberInSurah: numInSurah,
          arabic: item.arabic,
          transliteration: item.transliteration,
          translation: item.translation,
          audioUrl: `https://everyayah.com/data/${reciterFolder}/${surahPadded}${ayahPadded}.mp3`
        };
      });

      if (activeMode === 'lessons' && selectedLesson) {
        verses = verses.filter(v => v.numberInSurah >= startAyah && v.numberInSurah <= endAyah);
      }

      if (!verses.length) throw new Error('No verses were found in this selection. Choose another lesson.');
      setAyahData(verses);
      setCurrentAyahIndex(0);
      currentAyahIndexRef.current = 0;
      const name = activeMode === 'lessons' ? selectedLesson.title : (selectedSurah ? selectedSurah.englishName : 'Surah');
      setStatusText(`Ready: ${name} (${verses.length} Ayats)`);

      // PRELOAD: Buffer audio into Web Audio AudioBuffers & dual slots for true 0ms gapless playback
      if (verses.length > 0 && audioRefA.current) {
        audioRefA.current.src = verses[0].audioUrl;
        audioRefA.current.preload = 'auto';
      }
      if (verses.length > 1 && audioRefB.current) {
        audioRefB.current.src = verses[1].audioUrl;
        audioRefB.current.preload = 'auto';
      }
      verses.slice(0, 6).forEach(v => {
        preloadAudioBuffer(v.audioUrl);
        const p = new Audio();
        p.src = v.audioUrl;
        p.preload = 'auto';
      });
    };

    if (surahCacheRef.current[surahNum]) {
      applyVerses(surahCacheRef.current[surahNum]);
      return () => controller.abort();
    }

    const multiEditionEndpoint = `https://api.alquran.cloud/v1/surah/${surahNum}/editions/quran-uthmani,en.transliteration,en.sahih`;

    fetchQuranJson(`/surah/${surahNum}/editions/quran-uthmani,en.transliteration,en.sahih`, controller.signal)
      .then(json => {
        if (!Array.isArray(json.data) || json.data.length !== 3 || json.data.some(edition => !Array.isArray(edition.ayahs))) throw new Error('The Quran service returned incomplete text. Please retry.');
        if (json.code === 200 && json.data && json.data.length === 3) {
          const uthmani = json.data[0].ayahs;
          const translit = json.data[1].ayahs;
          const trans = json.data[2].ayahs;

          const rawList = uthmani.map((item, idx) => ({
            numberInSurah: item.numberInSurah,
            arabic: item.text,
            transliteration: translit[idx] ? translit[idx].text : '',
            translation: trans[idx] ? trans[idx].text : ''
          }));

          surahCacheRef.current[surahNum] = rawList;
          applyVerses(rawList);
        }
      })
      .catch(err => {
        if (!controller.signal.aborted) { setLoadError(`Failed to load Quran texts: ${err.message}`); setStatusText('Text unavailable'); }
      });
    return () => controller.abort();
  }, [selectedSurah, selectedLesson, activeMode, selectedReciter, loadVersion]);

  // 3. Reliable Background Video Loading & Playback (Guaranteed continuous loop)
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !selectedVideoUrl) return;
    if(selectedVideoUrl==='gradient'){v.pause();v.removeAttribute('src');v.load();return;}

    v.crossOrigin = 'anonymous';
    v.muted = true;
    v.defaultMuted = true;
    v.loop = true;
    v.playsInline = true;
    v.autoplay = true;

    lastVideoCanvasRef.current = null;
    v.onerror = () => setStatusText('Background video could not load. Choose another preset or upload a video.');
    v.src = selectedVideoUrl;
    v.load();
    const p = v.play();
    if (p !== undefined) {
      p.catch(() => {});
    }
    return () => { v.onerror = null; };
  }, [selectedVideoUrl, workspaceTab]);

  // 4. Pexels Video Search Integration
  const searchPexels = () => {
    if (!pexelsApiKey.trim()) { setShareStatus('Enter your Pexels API key before searching.'); return; }
    setPexelsSearching(true);
    const endpoint = `https://api.pexels.com/videos/search?query=${encodeURIComponent(pexelsQuery)}&orientation=landscape&per_page=12`;
    fetch(endpoint, {
      headers: { Authorization: pexelsApiKey }
    })
      .then(async res => { if (!res.ok) throw new Error(`Pexels search failed (${res.status}). Check your API key.`); return res.json(); })
      .then(data => {
        if (data.videos) {
          setPexelsResults(data.videos);
        }
        setPexelsSearching(false);
      })
      .catch(err => {
        setShareStatus(err.message || 'Pexels search failed. Please retry.');
        setPexelsSearching(false);
      });
  };

  // 5. Canvas Render Loop (requestAnimationFrame + 30fps Heartbeat for zero-stall captureStream)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let isAlive = true;
    let lastPaintTime = Date.now();

    const drawFrame = (overlayOnly = false, verseIndex = currentAyahIndexRef.current) => {
      lastPaintTime = Date.now();
      const width = canvas.width;
      const height = canvas.height;
      ctx.save();
      ctx.clearRect(0, 0, width, height);
      if (!overlayOnly) {

      // Draw Video Background (Always renders active frame; automatically resumes if paused or ended)
      const v = videoRef.current;
      let videoDrawn = false;
      if (backgroundKindRef.current!=='gradient' && v && v.videoWidth > 0) {
        try {
          const vRatio = v.videoWidth / v.videoHeight;
          const cRatio = width / height;
          let drawW, drawH, drawX, drawY;
          if (vRatio > cRatio) {
            drawH = height;
            drawW = height * vRatio;
            drawX = (width - drawW) / 2;
            drawY = 0;
          } else {
            drawW = width;
            drawH = width / vRatio;
            drawX = 0;
            drawY = (height - drawH) / 2;
          }
          ctx.drawImage(v, drawX, drawY, drawW, drawH);
          videoDrawn = true;

          // Cache pure video scenery frame to guarantee zero black flashes when video loops
          const now = Date.now();
          if (v.readyState >= 2 && !v.seeking && (!lastVideoCanvasRef.current || now - lastVideoCacheTimeRef.current > 400)) {
            if (!lastVideoCanvasRef.current) {
              lastVideoCanvasRef.current = document.createElement('canvas');
            }
            const lvc = lastVideoCanvasRef.current;
            if (lvc.width !== width || lvc.height !== height) {
              lvc.width = width;
              lvc.height = height;
            }
            const lvCtx = lvc.getContext('2d');
            lvCtx.drawImage(v, drawX, drawY, drawW, drawH);
            lastVideoCacheTimeRef.current = now;
          }

          if (v.paused || v.ended) {
            v.play().catch(() => {});
          }
        } catch (err) {
          videoDrawn = false;
        }
      }

      if (!videoDrawn && lastVideoCanvasRef.current) {
        // Paint last good scenery frame seamlessly while video loops
        ctx.drawImage(lastVideoCanvasRef.current, 0, 0);
        videoDrawn = true;
      }

      if (!videoDrawn) {
        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(0.5, '#0a2336');
        bgGrad.addColorStop(1, '#020710');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = '30px Inter, sans-serif';
        ctx.textAlign = 'center';
        if(backgroundKindRef.current!=='gradient')ctx.fillText(v?.error ? 'Choose a scene or upload a background.' : 'Loading background scenery...', width / 2, height / 2);
      }

      }
      // Subtle readable overlay scrim (Keeps nature video scenery crisp & text 100% legible)
      if (activeModeRef.current !== 'nature') {
        const scrim = ctx.createLinearGradient(0, 0, 0, height);
        scrim.addColorStop(0, 'rgba(0, 0, 0, 0.40)');
        scrim.addColorStop(0.2, 'rgba(0, 0, 0, 0.20)');
        scrim.addColorStop(0.5, 'rgba(0, 0, 0, 0.40)');
        scrim.addColorStop(0.8, 'rgba(0, 0, 0, 0.50)');
        scrim.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
        ctx.fillStyle = scrim;
        ctx.fillRect(0, 0, width, height);

        // Top Header Badge & Verse Citation
        const topBadgeY = aspectRatio === '9:16' ? 90 : 50;
        const topSubY = aspectRatio === '9:16' ? 125 : 75;

        const activeM = activeModeRef.current;
        const selL = selectedLessonRef.current;
        const selS = selectedSurahRef.current;
        const refFSize = reflectionFontSizeRef.current;
        const refLines = reflectionTextLinesRef.current || [];
        const curVerses = ayahDataRef.current || [];
        const curVerse = curVerses[verseIndex];

        if (activeM === 'reflection') {
          ctx.fillStyle = '#fef08a';
          ctx.font = aspectRatio === '9:16' ? '700 30px Inter, sans-serif' : '700 26px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 8;
          ctx.fillText('🕊️ PATH TO PEACE (P.T.P) • SHORT REFLECTION', width / 2, topBadgeY);

          // STRICT SAFE-ZONE CONTAINMENT FOR P.T.P REFLECTION
          const maxContentW = width * (aspectRatio === '9:16' ? 0.86 : 0.82);
          const topMinY = aspectRatio === '9:16' ? 180 : 100;
          const bottomMaxY = aspectRatio === '9:16' ? (height - 220) : (height - 110);
          const availableH = bottomMaxY - topMinY;
          const centerX = width / 2;

          let effFontSize = refFSize;
          const measureReflect = (fSize) => {
            ctx.font = `600 ${fSize}px 'Inter', sans-serif`;
            let allWrapped = [];
            refLines.forEach((origLine, lIdx) => {
              const wrapped = getWrappedLines(ctx, origLine, maxContentW);
              wrapped.forEach((wl) => {
                allWrapped.push({
                  text: wl,
                  isHighlight: lIdx === 2 || lIdx === 4 || lIdx === refLines.length - 1
                });
              });
            });
            const lineH = Math.round(fSize * 1.68);
            const totalH = allWrapped.length * lineH;
            return { allWrapped, lineH, totalH };
          };

          let rMeas = measureReflect(effFontSize);
          if (rMeas.totalH > availableH) {
            effFontSize = Math.max(16, Math.floor((availableH - 20) / (rMeas.allWrapped.length * 1.68)));
            rMeas = measureReflect(effFontSize);
          }

          const startY = topMinY + Math.max(0, (availableH - rMeas.totalH) / 2);
          ctx.save();
          ctx.textAlign = 'center';

          rMeas.allWrapped.forEach((item, idx) => {
            if (item.isHighlight) {
              ctx.fillStyle = '#fde047';
              ctx.font = `700 ${Math.round(effFontSize * 1.15)}px 'Inter', sans-serif`;
              ctx.shadowColor = 'rgba(251, 191, 36, 0.85)';
              ctx.shadowBlur = 16;
            } else {
              ctx.fillStyle = '#ffffff';
              ctx.font = `600 ${effFontSize}px 'Inter', sans-serif`;
              ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
              ctx.shadowBlur = 12;
            }
            ctx.fillText(item.text, centerX, startY + (idx * rMeas.lineH));
          });
          ctx.restore();

        } else if (activeM === 'lessons' && selL) {
          ctx.fillStyle = '#fef08a';
          ctx.font = aspectRatio === '9:16' ? '700 30px Inter, sans-serif' : '700 26px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 8;
          ctx.fillText(selL.badge, width / 2, topBadgeY);

          if (curVerse) {
            ctx.fillStyle = '#cbd5e1';
            ctx.font = aspectRatio === '9:16' ? '600 25px Inter, sans-serif' : '600 23px Inter, sans-serif';
            ctx.fillText(`SURAH ${selL.surahName.toUpperCase()} • AYAH ${curVerse.numberInSurah}`, width / 2, topSubY);
          }
        } else if (selS) {
          ctx.fillStyle = '#fbbf24';
          ctx.font = aspectRatio === '9:16' ? '700 32px Inter, sans-serif' : '700 28px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 8;
          ctx.fillText(`SURAH ${selS.englishName.toUpperCase()}`, width / 2, topBadgeY);

          if (curVerse) {
            ctx.fillStyle = '#cbd5e1';
            ctx.font = aspectRatio === '9:16' ? '600 25px Inter, sans-serif' : '600 23px Inter, sans-serif';
            ctx.fillText(`VERSE ${curVerse.numberInSurah} OF ${selS.numberOfAyahs}`, width / 2, topSubY);
          }
        }

        // Subtitle Text Overlay with Mathematical Frame Containment (Guaranteed Zero Overflow across All Sizes & Modes)
        if (activeM !== 'reflection' && curVerse) {
          ctx.save();
          const elapsedSinceChange = performance.now() - verseChangeTimeRef.current;
          const textAlpha = Math.min(1.0, Math.max(0.12, elapsedSinceChange / 160));
          ctx.globalAlpha = overlayOnly ? 1 : textAlpha;

          const maxContentW = width * (aspectRatio === '9:16' ? 0.86 : 0.82);
          const centerX = width / 2;

          const topMinY = aspectRatio === '9:16' ? 180 : 110;
          const bottomMaxY = aspectRatio === '9:16' ? (height - 230) : (height - 120);
          const availableHeight = bottomMaxY - topMinY;

          const aScale = arabicFontScaleRef.current || 1.0;
          const tScale = translationFontScaleRef.current || 1.0;

          // Base target font sizes scaled by user sliders
          const baseArabicPx = aspectRatio === '9:16' ? Math.round(76 * aScale) : Math.round(68 * aScale);
          const baseLitPx = aspectRatio === '9:16' ? Math.round(36 * tScale) : Math.round(32 * tScale);
          const baseTransPx = aspectRatio === '9:16' ? Math.round(42 * tScale) : Math.round(36 * tScale);

          const arabicFull = curVerse.arabic + ` ۝${curVerse.numberInSurah}`;
          const transLitText = `"${curVerse.transliteration}"`;
          const transText = curVerse.translation;

          // Dynamic measurement helper
          const measureVerseBlock = (aPx, lPx, tPx) => {
            ctx.font = `bold ${aPx}px 'Amiri', serif`;
            const aLines = getWrappedLines(ctx, arabicFull, maxContentW);
            const aLineH = Math.round(aPx * 1.48);
            const aH = aLines.length * aLineH;

            ctx.font = `italic 600 ${lPx}px 'Inter', sans-serif`;
            const lLines = getWrappedLines(ctx, transLitText, maxContentW);
            const lLineH = Math.round(lPx * 1.42);
            const lH = lLines.length * lLineH;

            ctx.font = `500 ${tPx}px 'Inter', sans-serif`;
            const tLines = getWrappedLines(ctx, transText, maxContentW);
            const tLineH = Math.round(tPx * 1.42);
            const tH = tLines.length * tLineH;

            const gap1 = Math.round(22 * Math.min(1.2, tScale));
            const gap2 = Math.round(18 * Math.min(1.2, tScale));
            const totalH = aH + gap1 + lH + gap2 + tH;

            return { aLines, aLineH, aH, lLines, lLineH, lH, tLines, tLineH, tH, gap1, gap2, totalH };
          };

          let meas = measureVerseBlock(baseArabicPx, baseLitPx, baseTransPx);

          // If block height exceeds available safe vertical area -> proportionally auto-clamp
          if (meas.totalH > availableHeight) {
            const clampRatio = Math.max(0.48, (availableHeight - 20) / meas.totalH);
            const clampedArabic = Math.max(20, Math.floor(baseArabicPx * clampRatio));
            const clampedLit = Math.max(12, Math.floor(baseLitPx * clampRatio));
            const clampedTrans = Math.max(13, Math.floor(baseTransPx * clampRatio));
            meas = measureVerseBlock(clampedArabic, clampedLit, clampedTrans);
          }

          // Perfectly center the text block inside the safe viewport
          const startY = topMinY + Math.max(0, (availableHeight - meas.totalH) / 2);
          let currentY = startY;

          // 1. Draw Arabic
          ctx.font = `bold ${meas.aLineH / 1.48}px 'Amiri', serif`;
          ctx.fillStyle = '#fde047';
          ctx.textAlign = 'center';
          ctx.shadowColor = 'rgba(251, 191, 36, 0.9)';
          ctx.shadowBlur = 18;
          meas.aLines.forEach((line) => {
            ctx.fillText(line, centerX, currentY + (meas.aLineH * 0.75));
            currentY += meas.aLineH;
          });
          currentY += meas.gap1;

          // 2. Draw Transliteration
          ctx.font = `italic 600 ${meas.lLineH / 1.42}px 'Inter', sans-serif`;
          ctx.fillStyle = '#fef08a';
          ctx.shadowColor = 'rgba(0,0,0,0.9)';
          ctx.shadowBlur = 12;
          meas.lLines.forEach((line) => {
            ctx.fillText(line, centerX, currentY + (meas.lLineH * 0.75));
            currentY += meas.lLineH;
          });
          currentY += meas.gap2;

          // 3. Draw Translation
          ctx.font = `500 ${meas.tLineH / 1.42}px 'Inter', sans-serif`;
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = 'rgba(0,0,0,0.9)';
          ctx.shadowBlur = 12;
          meas.tLines.forEach((line) => {
            ctx.fillText(line, centerX, currentY + (meas.tLineH * 0.75));
            currentY += meas.tLineH;
          });

          ctx.restore();
        }
      }

      // Draw Channel Logo Watermark at bottom right (for all video sizes)
      const logoImg = logoImgObjRef.current;
      if (logoImg && logoImg.complete) {
        const maxLogoW = width * 0.12;
        const maxLogoH = height * 0.12;
        const lRatio = logoImg.width / logoImg.height;
        let lW = maxLogoW;
        let lH = maxLogoW / lRatio;
        if (lH > maxLogoH) {
          lH = maxLogoH;
          lW = maxLogoH * lRatio;
        }
        const lX = width - lW - 45;
        const lY = height - lH - 45;
        ctx.save();
        ctx.globalAlpha = 0.95;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 14;
        ctx.drawImage(logoImg, lX, lY, lW, lH);
        ctx.restore();
      }
      ctx.restore();
    };

    renderOverlayRef.current = (verseIndex) => {
      try { drawFrame(true, verseIndex); return canvas.toDataURL('image/png'); }
      finally { drawFrame(); }
    };
    const render = () => {
      if (!isAlive) return;
      if (!backendRenderingRef.current || isRecordingRef.current) drawFrame();
      animationFrameIdRef.current = requestAnimationFrame(render);
    };

    animationFrameIdRef.current = requestAnimationFrame(render);

    if (renderHeartbeatRef.current) clearInterval(renderHeartbeatRef.current);
    renderHeartbeatRef.current = setInterval(() => {
      if ((!backendRenderingRef.current || isRecordingRef.current) && Date.now() - lastPaintTime > 45) {
        drawFrame();
      }
    }, 33);

    return () => {
      isAlive = false;
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      if (renderHeartbeatRef.current) clearInterval(renderHeartbeatRef.current);
    };
  }, [aspectRatio, logoUrl, workspaceTab]);

  // 6. Sequential Audio Playback & Synchronized Recording Pipeline
  const [isBackendRendering, setIsBackendRendering] = useState(false);

  const readVideoDataUrl = (file) => new Promise((resolve, reject) => {
    if (!file || !file.size) return reject(new Error('Process a video before posting.'));
    if (file.size > 70 * 1024 * 1024) return reject(new Error('This video exceeds the 70 MB upload limit. Download it and upload it directly to the platform.'));
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the video file. Please process it again.'));
    reader.readAsDataURL(file);
  });

  const handleBrowserVideoRender = async () => {
    if(backendRenderingRef.current||isPlayingRef.current||publishInFlightRef.current)return;
    const verses=['nature','reflection'].includes(activeMode)?[]:[...ayahData];
    if(!verses.length&&!['nature','reflection'].includes(activeMode)){setStatusText('Load the complete Quran selection before recording.');return;}
    const controller=new AbortController();renderRequestRef.current=controller;backendRenderingRef.current=true;isRecordingRef.current=true;
    const metadata={...captionsKit,hashtags:[...captionsKit.hashtags]},mode=activeMode,ratio=aspectRatio;
    if(autoPostTimerRef.current)clearTimeout(autoPostTimerRef.current);
    setIsBackendRendering(true);setIsRecording(true);setIsProcessingComplete(false);setRecordedFile(null);setCurrentAyahIndex(0);setRenderPhase('Preparing full video');setDownloadUrl('');completedAssetRef.current=null;setCompletedAsset(null);
    try{
      if(!initAudioBridge())throw new Error('Audio recording is not supported in this browser.');
      const context=audioCtxRef.current;await context.resume();
      if(selectedVideoUrl!=='gradient'&&videoRef.current.readyState<2)throw new Error('The background is not ready. Upload a video or choose Studio gradient in Scenery.');
      await document.fonts.ready;
      const blob=await recordFullVideo({canvas:canvasRef.current,context,verses,getBuffer:preloadAudioBuffer,speed:processingSpeed,signal:controller.signal,
        onVerse:index=>{currentAyahIndexRef.current=index;setCurrentAyahIndex(index);setRenderPhase(`Recording verse ${index+1} of ${verses.length}`);},onProgress:setStatusText});
      const extension=blob.type.includes('mp4')?'mp4':'webm';const file=new File([blob],`ProEase_${mode}_${Date.now()}_Full_1080p.${extension}`,{type:blob.type});
      const url=URL.createObjectURL(blob);setDownloadUrl(url);setDownloadFilename(file.name);setIsProcessingComplete(true);
      const asset=saveCompletedVideo(file,metadata,mode,ratio);setRenderPhase('Full video ready');setStatusText('Full video ready — every selected verse included.');
      const link=document.createElement('a');link.href=url;link.download=file.name;link.click();queueAutoPost(asset);
    }catch(error){setStatusText(error.name==='AbortError'?'Video processing cancelled.':error.message);}
    finally{isRecordingRef.current=false;backendRenderingRef.current=false;renderRequestRef.current=null;setIsRecording(false);setIsBackendRendering(false);}
  };
  const handleBackendVideoRender = async () => {
    if(renderEngine==='browser')return handleBrowserVideoRender();
    if (backendRenderingRef.current || isPlayingRef.current || publishInFlightRef.current) return;
    if (activeMode !== 'nature' && activeMode !== 'reflection' && !ayahData.length) {
      setStatusText('Load the Quran verses successfully before processing. Select a lesson or Surah to retry.'); return;
    }
    if (autoPostTimerRef.current) { clearTimeout(autoPostTimerRef.current); autoPostTimerRef.current = null; }
    const renderMetadata = { ...captionsKit, hashtags: [...captionsKit.hashtags] };
    const controller = new AbortController();
    renderRequestRef.current = controller;
    backendRenderingRef.current = true;
    setIsBackendRendering(true);
    setRecordedFile(null);
    completedAssetRef.current = null; setCompletedAsset(null);
    setIsProcessingComplete(false);
    setRenderPhase('Preparing your video');
    setDownloadUrl('');

    let surahNumber = 1;
    let startAyah = 1;
    let endAyah = 999;
    let title = 'QuranRecitation';

    if (activeMode === 'lessons' && selectedLesson) {
      surahNumber = selectedLesson.surahNumber;
      startAyah = selectedLesson.startAyah || 1;
      endAyah = selectedLesson.endAyah || 999;
      title = selectedLesson.title;
    } else if (activeMode === 'reflection') {
      title = 'PathToPeace_Reflection';
    } else if (activeMode === 'nature') {
      title = 'Peaceful_Nature_Loop';
    } else if (selectedSurah) {
      surahNumber = selectedSurah.number;
      title = `Surah_${selectedSurah.englishName.replace(/[^a-zA-Z0-9]/g, '')}`;
    }

    const resolvedFolder = (RECITERS_METADATA[selectedReciter] && RECITERS_METADATA[selectedReciter].folder)
      ? RECITERS_METADATA[selectedReciter].folder
      : (selectedReciter || 'Husary_128kbps');

    // Direct audio URLs already prepared in ayahData
    const audioUrls = (activeMode !== 'reflection' && activeMode !== 'nature' && ayahData && ayahData.length > 0)
      ? ayahData.map(v => v.audioUrl).filter(Boolean)
      : [];

    setStatusText('Processing video on backend (fast 1080p render)... Please wait.');

    try {
      // Blob URLs exist only in this browser; send the actual uploaded background.
      const videoDataUrl = selectedVideoUrl.startsWith('blob:')
        ? await readVideoDataUrl(await (await fetch(selectedVideoUrl)).blob())
        : undefined;
      await document.fonts.ready;
      if (logoUrl && !logoImgObjRef.current) throw new Error('The logo is still loading. Wait a moment or choose another image.');
      const overlays = [];
      const count = activeMode === 'nature' || activeMode === 'reflection' ? 1 : ayahData.length;
      if (!renderOverlayRef.current) throw new Error('Preview is not ready. Please try again.');
      for (let index = 0; index < count; index++) {
        controller.signal.throwIfAborted();
        overlays.push(renderOverlayRef.current(index));
        // Keep the page responsive while preparing long Surahs.
        if (index % 8 === 0) await new Promise(resolve => requestAnimationFrame(resolve));
      }
      setRenderPhase('Rendering your MP4');
      const res = await apiFetch('/api/render-video', {
        signal: controller.signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surahNumber,
          startAyah,
          endAyah,
          reciterFolder: resolvedFolder,
          audioUrls,
          videoUrl: selectedVideoUrl,
          videoDataUrl,
          overlays,
          processingSpeed,
          aspectRatio,
          title,
          mode: activeMode
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with ${res.status}`);
      }

      if (!res.headers.get('content-type')?.includes('video/')) {
        throw new Error('The video API is unavailable. Start the app with npm start, or build it and use npm run preview.');
      }
      const blob = await res.blob();
      if (!blob.size) throw new Error('The server returned an empty video. Please try again.');
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      const filename = `ProEase_${title}_1080p.mp4`;
      setDownloadFilename(filename);
      const completedFile = new File([blob], filename, { type: 'video/mp4' });
      const asset = saveCompletedVideo(completedFile, renderMetadata, activeMode, aspectRatio);
      setIsProcessingComplete(true);
      setStatusText('1080p MP4 Video ready');
      setRenderPhase('Export ready');

      // Instant browser file download
      try {
        const dlLink = document.createElement('a');
        dlLink.href = url;
        dlLink.download = filename;
        document.body.appendChild(dlLink);
        dlLink.click();
        document.body.removeChild(dlLink);
      } catch(e) {}

      queueAutoPost(asset);
    } catch (err) {
      console.error('Backend render error:', err);
      setStatusText(err.name === 'AbortError' ? 'Video processing cancelled.' : `Render failed: ${err.message || 'Unknown error'}`);
    } finally {
      if (renderRequestRef.current === controller) renderRequestRef.current = null;
      backendRenderingRef.current = false;
      setIsBackendRendering(false);
    }
  };

  // 6. Look-Ahead Hardware Web Audio Gapless Engine & Synchronized 1080p Recording
  // True 0.00ms gapless sample-accurate recitation with Look-Ahead Web Audio Scheduling
  const startPlaybackOrRecording = async (record = false) => {
    if (isPlayingRef.current || isRecordingRef.current) return;
    const generation = ++playbackGenerationRef.current;
    if (activeModeRef.current === 'reflection' || activeModeRef.current === 'nature') {
      startReflectionPlayback(record);
      return;
    }

    const verses = ayahDataRef.current || [];
    if (!verses.length) {
      setStatusText('Loading verses, please wait a moment...');
      return;
    }

    // Initialize audio bridge
    const audioStream = initAudioBridge();
    const ctx = audioCtxRef.current;
    if (!ctx || !audioStream) { setStatusText('Audio is unavailable in this browser. Please use a browser with Web Audio support.'); return; }
    if (ctx && ctx.state === 'suspended') {
      try { await ctx.resume(); } catch { setStatusText('Audio could not start. Check your browser’s sound permissions.'); return; }
    }
    if (ctx.state !== 'running') { setStatusText('Audio is paused by the browser. Allow sound and try preview again.'); return; }

    // Clear previous audio sources and timers
    if (scheduledSourcesRef.current && scheduledSourcesRef.current.length > 0) {
      scheduledSourcesRef.current.forEach(s => {
        try { s.onended = null; s.stop(); } catch(e){}
      });
      scheduledSourcesRef.current = [];
    }
    if (schedulerTimerRef.current) {
      clearInterval(schedulerTimerRef.current);
      schedulerTimerRef.current = null;
    }

    isPlayingRef.current = true;
    isRecordingRef.current = record;
    setIsPlaying(true);
    setIsRecording(record);
    if (record) { setIsProcessingComplete(false); setDownloadUrl(''); setRecordedFile(null); }
    setCurrentAyahIndex(0);
    currentAyahIndexRef.current = 0;
    verseChangeTimeRef.current = performance.now();

    const totalAyats = verses.length;
    const targetLabel = activeModeRef.current === 'lessons' ? (selectedLessonRef.current?.title || 'Lesson') : (selectedSurahRef.current?.englishName || 'Surah');
    setStatusText(record ? `Buffering audio & starting HD recording (${totalAyats} Ayats)...` : `Buffering audio & starting playback...`);

    // Prime Verse 0 buffer immediately to guarantee zero delay on first sound
    let firstBuffer = audioBufferCacheRef.current.get(verses[0].audioUrl);
    if (!firstBuffer) {
      firstBuffer = await preloadAudioBuffer(verses[0].audioUrl);
    }

    if (generation !== playbackGenerationRef.current || !isPlayingRef.current) return;
    if (!firstBuffer) { stopPlayback(); setStatusText('Could not load recitation audio. Check the network or choose another reciter.'); return; }

    // Proactively begin buffering upcoming verses in parallel
    verses.slice(1, 8).forEach(v => preloadAudioBuffer(v.audioUrl));

    if (record) {
      recordedChunksRef.current = [];
      const canvasStream = canvasRef.current.captureStream(30);
      canvasStreamRef.current = canvasStream;
      let combinedStream = new MediaStream();
      combinedStreamRef.current = combinedStream;

      canvasStream.getVideoTracks().forEach(t => combinedStream.addTrack(t));

      if (audioStream) {
        audioStream.getAudioTracks().forEach(t => combinedStream.addTrack(t));
      }

      let mimeType = 'video/webm;codecs=vp8,opus';
      const preferredTypes = [
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4;codecs=avc1',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm'
      ];
      for (const t of preferredTypes) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
          mimeType = t;
          break;
        }
      }

      try {
        const recorder = new MediaRecorder(combinedStream, {
          mimeType,
          videoBitsPerSecond: 3500000,
          audioBitsPerSecond: 192000
        });

        recorder.ondataavailable = e => {
          if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
        };

        recorder.onerror = e => {
          console.error('MediaRecorder error event:', e);
        };

        recorder.onstop = () => {
          const outputMime = mimeType;
          const blob = new Blob(recordedChunksRef.current, { type: outputMime });
          const url = URL.createObjectURL(blob);
          setDownloadUrl(url);

          let baseName = 'QuranRecitation';
          if (activeModeRef.current === 'lessons' && selectedLessonRef.current) {
            baseName = `Lesson_${selectedLessonRef.current.key}`;
          } else if (selectedSurahRef.current) {
            baseName = `Surah_${selectedSurahRef.current.englishName.replace(/[^a-zA-Z0-9]/g, '')}`;
          }
          const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
          const filename = `ProEase_${baseName}_1080p.${ext}`;
          setDownloadFilename(filename);

          try {
            const file = new File([blob], filename, { type: outputMime });
            setRecordedFile(file);
          } catch (fileErr) {
            console.warn('File constructor fallback:', fileErr);
          }

          setIsProcessingComplete(true);
          setStatusText(`Video complete (${totalAyats} Ayats)! Ready to download or share.`);

          if (autoPostOnFinish) {
            setTimeout(() => {
              if (autoPostEnabledRef.current) publishToConnectedAccounts(null, saveCompletedVideo(new File([blob], filename, { type: outputMime }), captionsKit, activeModeRef.current, aspectRatioRef.current));
            }, 900);
          }
        };

        // Start continuous recording without timeslice fragmentation
        recorder.start();
        mediaRecorderRef.current = recorder;
      } catch (err) {
        console.error('MediaRecorder start error:', err);
      }
    }

    setStatusText(record ? `Recording ${targetLabel} (${totalAyats} Ayats)...` : `Playing ${targetLabel}...`);

    // Look-Ahead Hardware Web Audio Gapless Scheduler
    let nextStartTime = ctx.currentTime + 0.05;
    let scheduledIndex = 0;
    let waitingSince = 0;

    const scheduleAhead = () => {
      if (!isPlayingRef.current && !isRecordingRef.current) return;
      const currentTime = ctx.currentTime;

      // Schedule upcoming verses into Web Audio queue up to 12 seconds in advance
      while (scheduledIndex < verses.length && nextStartTime < currentTime + 12) {
        const verse = verses[scheduledIndex];
        const buf = audioBufferCacheRef.current.get(verse.audioUrl);

        if (!buf) {
          preloadAudioBuffer(verse.audioUrl).then(buffer => {
            if (!buffer && generation === playbackGenerationRef.current) { stopPlayback(); setStatusText('Could not load a recitation verse. No verses were skipped. Please retry.'); }
          });
          if (!waitingSince) waitingSince = performance.now();
          if (performance.now() - waitingSince > 30000) {
            stopPlayback();
            setStatusText('Audio loading timed out. No verses were skipped. Please retry.');
          }
          break;
        }

        waitingSince = 0;
        nextStartTime = Math.max(nextStartTime, ctx.currentTime + 0.05);
        const source = ctx.createBufferSource();
        source.buffer = buf;
        source.playbackRate.value = processingSpeed;
        source.connect(masterGainRef.current);

        const thisIdx = scheduledIndex;
        source.onended = () => {
          if (!isPlayingRef.current && !isRecordingRef.current) return;
          if (thisIdx + 1 < verses.length) {
            currentAyahIndexRef.current = thisIdx + 1;
            setCurrentAyahIndex(thisIdx + 1);
            verseChangeTimeRef.current = performance.now();
          } else {
            finishPlaybackAndRecording();
          }
        };

        source.start(nextStartTime);
        scheduledSourcesRef.current.push(source);

        const duration = buf.duration / processingSpeed;
        nextStartTime += duration;
        scheduledIndex++;

        // Proactively preload the next few verses
        if (verses[scheduledIndex]) preloadAudioBuffer(verses[scheduledIndex].audioUrl);
        if (verses[scheduledIndex + 1]) preloadAudioBuffer(verses[scheduledIndex + 1].audioUrl);
        if (verses[scheduledIndex + 2]) preloadAudioBuffer(verses[scheduledIndex + 2].audioUrl);
      }
    };

    scheduleAhead();
    schedulerTimerRef.current = setInterval(scheduleAhead, 60);
  };

  // Reflection Mode Player (15-second 9:16 Shorts with ambient tone)
  const startReflectionPlayback = (record) => {
    const audioStream = initAudioBridge();
    if (!audioStream) { setStatusText('Audio is unavailable in this browser.'); return; }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }

    isPlayingRef.current = true;
    isRecordingRef.current = record;
    setIsPlaying(true);
    setIsRecording(record);
    if (record) { setIsProcessingComplete(false); setDownloadUrl(''); setRecordedFile(null); }

    const synthAmbient = playAmbientTone();
    ambientRef.current = synthAmbient;
    if (activeModeRef.current === 'reflection' && !record && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(reflectionVoiceoverScript);
      utt.rate = 0.95;
      utt.pitch = 1.0;
      window.speechSynthesis.speak(utt);
    }
    const durationSeconds = 15;
    let elapsed = 0;
    setStatusText(`${record ? 'Recording' : 'Previewing'} ${activeModeRef.current === 'nature' ? 'Nature Loop' : 'Reflection Short'} (${durationSeconds}s)...`);

    if (record) {
      recordedChunksRef.current = [];
      const canvasStream = canvasRef.current.captureStream(30);
      canvasStreamRef.current = canvasStream;
      let combinedStream = new MediaStream();
      combinedStreamRef.current = combinedStream;
      canvasStream.getVideoTracks().forEach(t => combinedStream.addTrack(t));
      if (audioStream) {
        audioStream.getAudioTracks().forEach(t => combinedStream.addTrack(t));
      }

      let mimeType = 'video/webm;codecs=vp8,opus';
      const preferredTypes = [
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4;codecs=avc1',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm'
      ];
      for (const t of preferredTypes) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
          mimeType = t;
          break;
        }
      }

      try {
        const recorder = new MediaRecorder(combinedStream, {
          mimeType,
          videoBitsPerSecond: 3000000,
          audioBitsPerSecond: 192000
        });
        recorder.ondataavailable = e => {
          if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
        };
        recorder.onerror = e => {
          console.error('Reflection MediaRecorder error event:', e);
        };
        recorder.onstop = () => {
          const outputMime = mimeType;
          const blob = new Blob(recordedChunksRef.current, { type: outputMime });
          const url = URL.createObjectURL(blob);
          setDownloadUrl(url);
          const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
          const filename = `ProEase_PathToPeace_Reflection_1080p.${ext}`;
          setDownloadFilename(filename);
          try { setRecordedFile(new File([blob], filename, { type: outputMime })); } catch(e){}
          setIsProcessingComplete(true);
          setStatusText('9:16 Reflection Short Complete! Ready to download or auto-post.');

          if (autoPostOnFinish) {
            setTimeout(() => {
              if (autoPostEnabledRef.current) publishToConnectedAccounts(null, saveCompletedVideo(new File([blob], filename, { type: outputMime }), captionsKit, activeModeRef.current, aspectRatioRef.current));
            }, 900);
          }
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
      } catch(err) {
        console.error('MediaRecorder error in reflection mode:', err);
      }
    }

    if (reflectionTimerRef.current) clearInterval(reflectionTimerRef.current);
    reflectionTimerRef.current = setInterval(() => {
      elapsed += 1;
      const remaining = durationSeconds - elapsed;
      if (remaining > 0) {
        setStatusText(record ? `Recording 9:16 Short (${remaining}s remaining)...` : `Previewing (${remaining}s remaining)...`);
      } else {
        clearInterval(reflectionTimerRef.current);
        reflectionTimerRef.current = null;
        finishPlaybackAndRecording();
      }
    }, 1000);
  };

  const stopAmbient = () => {
    ambientRef.current?.stop(); ambientRef.current = null;
    window.speechSynthesis?.cancel();
  };
  const finishPlaybackAndRecording = () => {
    ++playbackGenerationRef.current;
    stopAmbient();
    isPlayingRef.current = false;
    isRecordingRef.current = false;
    setIsPlaying(false);
    setIsRecording(false);
    if (schedulerTimerRef.current) {
      clearInterval(schedulerTimerRef.current);
      schedulerTimerRef.current = null;
    }
    if (scheduledSourcesRef.current && scheduledSourcesRef.current.length > 0) {
      scheduledSourcesRef.current.forEach(s => {
        try { s.onended = null; s.stop(); } catch(e){}
      });
      scheduledSourcesRef.current = [];
    }
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
    if (reflectionTimerRef.current) {
      clearInterval(reflectionTimerRef.current);
      reflectionTimerRef.current = null;
    }
    if (activeBufferSourceRef.current) {
      try {
        activeBufferSourceRef.current.onended = null;
        activeBufferSourceRef.current.stop();
      } catch(e) {}
      activeBufferSourceRef.current = null;
    }
    [audioRefA.current, audioRefB.current].forEach(a => {
      if (a) {
        a.onended = null;
        a.ontimeupdate = null;
        a.onerror = null;
        a.oncanplay = null;
        a.onloadedmetadata = null;
        a.onwaiting = null;
        a.onstalled = null;
        try {
          a.pause();
          a.currentTime = 0;
        } catch(e) {}
      }
    });
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch(e) {
        console.warn('MediaRecorder stop warning:', e);
      }
    }
    setStatusText('Preview complete.');
  };

  const stopPlayback = () => {
    if (autoPostTimerRef.current) { clearTimeout(autoPostTimerRef.current); autoPostTimerRef.current = null; }
    renderRequestRef.current?.abort();
    ++playbackGenerationRef.current;
    stopAmbient();
    isPlayingRef.current = false;
    isRecordingRef.current = false;
    setIsPlaying(false);
    setIsRecording(false);
    if (schedulerTimerRef.current) {
      clearInterval(schedulerTimerRef.current);
      schedulerTimerRef.current = null;
    }
    if (scheduledSourcesRef.current && scheduledSourcesRef.current.length > 0) {
      scheduledSourcesRef.current.forEach(s => {
        try { s.onended = null; s.stop(); } catch(e){}
      });
      scheduledSourcesRef.current = [];
    }
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
    if (reflectionTimerRef.current) {
      clearInterval(reflectionTimerRef.current);
      reflectionTimerRef.current = null;
    }
    if (activeBufferSourceRef.current) {
      try {
        activeBufferSourceRef.current.onended = null;
        activeBufferSourceRef.current.stop();
      } catch(e) {}
      activeBufferSourceRef.current = null;
    }
    [audioRefA.current, audioRefB.current].forEach(a => {
      if (a) {
        a.onended = null;
        a.ontimeupdate = null;
        a.onerror = null;
        a.oncanplay = null;
        a.onloadedmetadata = null;
        a.onwaiting = null;
        a.onstalled = null;
        try {
          a.pause();
          a.currentTime = 0;
        } catch(e) {}
      }
    });
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch(e) {
        console.warn('MediaRecorder stop warning:', e);
      }
    }
    if (mediaRecorderRef.current) mediaRecorderRef.current.onstop = null;
    canvasStreamRef.current?.getTracks().forEach(track => track.stop());
    setStatusText('Playback stopped.');
  };

  useEffect(() => {
    if (isPlayingRef.current || isRecordingRef.current) stopPlayback();
  }, [activeMode, selectedSurah, selectedLesson, selectedReciter, aspectRatio, processingSpeed]);
  useEffect(() => () => { stopPlayback(); }, []);

  // Filtered Lessons
  const filteredLessons = QURAN_LESSONS.filter(l => {
    if (lessonCategory !== 'all' && l.category !== lessonCategory) return false;
    if (lessonSearch) {
      const q = lessonSearch.toLowerCase();
      return l.title.toLowerCase().includes(q) || l.surahName.toLowerCase().includes(q) || l.quote.toLowerCase().includes(q);
    }
    return true;
  });

  // Filtered Preset Videos
  const filteredPresets = PRESET_VIDEOS.filter(p => {
    if (bgCategory === 'all') return true;
    return p.category === bgCategory;
  });

  const captionsKit = activeMode === 'reflection' ? buildPtpReflectionPackage(reflectionQuote) : generateCaptionsKit({
    mode: activeMode,
    platform: captionsPlatform,
    titleStyle: captionsTitleStyle,
    selectedSurah,
    selectedLesson,
    selectedReciter
  });

  const copyToClipboard = async (text, fieldName) => {
    if (!text) return false;
    try {
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
        await navigator.clipboard.writeText(text);
      } catch {
        const el = document.createElement('textarea');
        el.value = text; document.body.appendChild(el); el.select();
        try { if (!document.execCommand('copy')) throw new Error('Clipboard permission denied'); }
        finally { el.remove(); }
      }
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
      return true;
    } catch {
      setShareStatus('Could not copy to the clipboard. Allow clipboard access or select and copy the text manually.');
      return false;
    }
  };

  // Publish the completed artifact, independently of settings for the next video.
  const publishToConnectedAccounts = async (specificChannels = null, asset = completedAssetRef.current) => {
    if (publishInFlightRef.current) return;
    if (!asset?.file) { setShareStatus('Create a video before posting.'); return; }
    if (autoPostTimerRef.current) { clearTimeout(autoPostTimerRef.current); autoPostTimerRef.current = null; }
    const activeList = (specificChannels || socialChannelsRef.current).filter(channel => channel.connected && channel.autoPost
      && !['uploaded', 'review'].includes(asset.outcomes[publicationTarget(channel)]?.status));
    if (!activeList.length) { setShareStatus('Select a connected account that has not received this video yet.'); return; }
    publishInFlightRef.current = true;
    setIsPublishing(true);
    setPublishModalData({ operationId: crypto.randomUUID(), videoTitle: asset.metadata.title, isPublishing: true,
      channels: activeList.map(channel => ({ ...channel, status: 'preparing', stepMsg: 'Preparing video file' })) });
    const successfulChannels = [];
    try {
      const needsFile=activeList.some(channel=>!asset.outcomes[publicationTarget(channel)]?.operationId);
      const videoDataUrl = needsFile?await readVideoDataUrl(asset.file):null;
      for (const channel of activeList) {
        const target = publicationTarget(channel);
        const setChannel = patch => setPublishModalData(previous => previous && ({ ...previous,
          channels: previous.channels.map(item => item.id === channel.id ? { ...item, ...patch } : item) }));
        setChannel({ status: 'uploading', stepMsg: 'Uploading to ' + channel.name });
        const previousOperation=asset.outcomes[target]?.operationId;
        let { response, data } = previousOperation?await publishingRequest(`/api/publish/status/${encodeURIComponent(previousOperation)}`,{method:'GET'},25000):await publishingRequest(`/api/publish/${channel.id}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `${asset.id}:${target}` },
          body: JSON.stringify({ ...asset.metadata, privacy: channel.privacy || 'public', tiktokPrivacy:tikTokSettings.privacy,disableDuet:tikTokSettings.disableDuet,disableStitch:tikTokSettings.disableStitch,disableComment:tikTokSettings.disableComment,videoDataUrl, videoFileName: asset.file.name }),
        });
        const deadline=Date.now()+60000;
        while(data.pending&&!data.authError&&Date.now()<deadline){
          setChannel({status:'processing',stepMsg:data.message||'The platform is processing this video.'});
          await new Promise(resolve=>setTimeout(resolve,2000));
          ({response,data}=await publishingRequest(`/api/publish/status/${encodeURIComponent(data.operationId)}`,{method:'GET'},25000));
        }
        const outcome = { operationId:data.operationId, status: data.pending?'processing':response.ok && data.success ? 'uploaded' : data.uncertain ? 'review' : 'failed',
          stepMsg: data.warning || data.message || data.error || 'The upload could not be confirmed.',
          postUrl: data.postUrl || ({youtube:'https://studio.youtube.com/',facebook:'https://www.facebook.com/',instagram:'https://www.instagram.com/',tiktok:'https://www.tiktok.com/'})[channel.id],
          postId: data.postId, delivery: data.delivery };
        asset.outcomes[target] = outcome;
        if (completedAssetRef.current?.id === asset.id) updateAsset({ ...asset, outcomes: { ...asset.outcomes } });
        setChannel(outcome);
        if (outcome.status === 'uploaded') {
          successfulChannels.push(channel);
          setSocialChannels(previous => previous.map(item => item.id === channel.id ? { ...item, totalPosts: (Number(item.totalPosts) || 0) + 1, lastPostDate: 'Just now' } : item));
        }
        if (data.authError) setSocialChannels(previous => previous.map(item => item.id === channel.id ? { ...item, connected: false, verified: false } : item));
      }
      if (successfulChannels.length) {
        const entry = { id: `pub_${asset.id}_${Date.now()}`, title: asset.metadata.title, mode: asset.mode, aspectRatio: asset.aspectRatio,
          date: new Date().toLocaleString(), channelNames: successfulChannels.map(channel => channel.name).join(', ') };
        setPublishedHistory(previous => {
          const updated = [entry, ...previous].slice(0, 30);
          try { localStorage.setItem('proease_published_history_v1', JSON.stringify(updated)); } catch { /* History remains visible for this session. */ }
          return updated;
        });
      }
    } catch (error) {
      setShareStatus(error.message || 'Could not prepare this video for upload.');
      setPublishModalData(previous => previous && ({ ...previous, channels: previous.channels.map(channel => ({ ...channel, status: 'failed', stepMsg: error.message })) }));
    } finally {
      publishInFlightRef.current = false;
      setIsPublishing(false);
      setPublishModalData(previous => previous && ({ ...previous, isPublishing: false }));
    }
  };

  const handleToggleAutoPost = async (channelId) => {
    const channel = socialChannelsRef.current.find(item => item.id === channelId);
    if (!channel) return;
    try {
      const response = await apiFetch('/api/auth/preferences', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: channelId, autoPost: !channel.autoPost }) });
      if (!response.ok) throw new Error('Could not save Auto-Post preference.');
      setSocialChannels(prev => prev.map(item => item.id === channelId ? { ...item, autoPost: !channel.autoPost } : item));
    } catch { setAuthError('Could not save Auto-Post preference. Please retry.'); }
  };

  const handleDisconnectSocial = async (channelId) => {
    try {
      const response = await apiFetch('/api/auth/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: channelId })
      });
      if (!response.ok) throw new Error('Disconnect failed.');
    } catch { setAuthError('Could not disconnect the account. Please retry.'); return; }

    setSocialChannels(prev => prev.map(c => c.id === channelId ? {
      ...c,
      connected: false,
      sessionToken: '',
      connectedAt: null,
      autoPost: false,
      verified: false
    } : c));
  };

  // Real Token Verification & Persistent Session Saving with Provider API
  const handleVerifyAndSaveToken = async (channelId, token, handle, name, privacy, channelRefId) => {
    setVerifyingToken(true);
    setAuthError('');
    try {
      const resp = await apiFetch('/api/auth/save-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: channelId,
          accessToken: token,
          accountName: name,
          handle: handle,
          privacy: privacy || 'public',
          channelId: channelRefId
        })
      });
      const data = await resp.json();
      if (!resp.ok || data.error) {
        setAuthError(data.error || 'Failed to verify token with provider');
        setVerifyingToken(false);
        return;
      }
      const s = data.session;
      setSocialChannels(prev => prev.map(c => c.id === channelId ? {
        ...c,
        connected: true,
        handle: s.handle || handle || c.handle,
        accountName: s.accountName || name || c.accountName,
        avatar: s.avatar || c.avatar,
        privacy: s.privacy || privacy || 'public',
        channelId: s.channelId || channelRefId || c.channelId,
        verified: s.verified || false,
        connectedAt: 'Persistent Session Saved',
        autoPost: true
      } : c));
      setConnectingChannel(null);
      setShareStatus(data.message || `✓ ${channelId.toUpperCase()} session authorized and saved permanently!`);
      setTimeout(() => setShareStatus(''), 4500);
    } catch (err) {
      setAuthError(err.message || 'Verification request failed');
    } finally {
      setVerifyingToken(false);
    }
  };

  // Real 1-Click OAuth Popup Launcher
  const handleLaunchOAuthPopup = async (channelId) => {
    setAuthError('');
    // Open while the click still has browser permission, before awaiting the API.
    oauthPopupRef.current = window.open('about:blank', 'oauth_popup', 'width=600,height=720,status=no,resizable=yes');
    if (!oauthPopupRef.current) { setAuthError('Allow popups for this page, then try connecting again.'); return; }
    try {
      const res = await apiFetch(`/api/auth/${channelId}/url`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not start sign-in.');
      if (!data.url) throw new Error(`OAuth credentials are not configured for ${channelId.toUpperCase()}. Add the client ID and secret to .env, or connect using Direct Token.`);
      oauthPopupRef.current.location.href = data.url;
    } catch (err) {
      oauthPopupRef.current?.close(); oauthPopupRef.current = null;
      setAuthError(err.message || 'Could not start sign-in.');
    }
  };

  const handleNativeShare = async () => {
    const asset = completedAssetRef.current;
    if (!asset?.file) { setShareStatus('Export a video before sharing it.'); return; }
    const payload = { files: [asset.file], title: asset.metadata.title, text: asset.metadata.hashtags.slice(0, 5).join(' ') };
    try {
      if (!navigator.share || !navigator.canShare?.({ files: payload.files })) {
        setShareStatus('This browser cannot share video files directly. Download the MP4 and upload it to your platform.'); return;
      }
      await navigator.share(payload);
      setShareStatus('Video shared successfully.');
    } catch (error) {
      if (error.name !== 'AbortError') setShareStatus('The video could not be shared. Download the MP4 to upload it manually.');
    }
  };

  const handleDirectShare = async (platform) => {
    if (platform === 'youtube') {
      if (!await copyToClipboard(`${captionsKit.title}\n\n${captionsKit.description}`, 'copyYT')) return;
      setShareStatus('✓ Title & Full SEO Description copied! Opening YouTube Studio Upload...');
    } else if (platform === 'tiktok') {
      if (!await copyToClipboard(`${captionsKit.title} ${captionsKit.hashtags.slice(0, 6).join(' ')}`, 'copyTT')) return;
      setShareStatus('✓ Hook & Hashtags copied! Opening TikTok Studio Upload...');
    } else if (platform === 'facebook') {
      if (!await copyToClipboard(`${captionsKit.title}\n\n${captionsKit.hashtags.slice(0, 5).join(' ')}`, 'copyFB')) return;
      setShareStatus('✓ Captions copied! Opening Facebook Share...');
    }
    setTimeout(() => setShareStatus(''), 4500);
  };

  return <StudioView {...{activeMode,setActiveMode,reflectionQuote,setReflectionQuote,reflectionTextLines,setReflectionTextLines,reflectionVoiceoverScript,setReflectionVoiceoverScript,reflectionFontSize,setReflectionFontSize,
 arabicFontScale,setArabicFontScale,translationFontScale,setTranslationFontScale,fontPreset,applyFontPreset,socialChannels,autoPostOnFinish,setAutoPostEnabled,
 showSocialModal,setShowSocialModal,connectingChannel,setConnectingChannel,authConnectingTab,setAuthConnectingTab,verifyingToken,authError,setAuthError,authStatusInfo,
 publishModalData,publishedHistory,previewVoiceover,surahs,selectedSurah,setSelectedSurah,selectedLesson,setSelectedLesson,lessonCategory,setLessonCategory,lessonSearch,setLessonSearch,
 selectedReciter,setSelectedReciter,ayahData,currentAyahIndex,isPlaying,selectedVideoUrl,setSelectedVideoUrl,bgCategory,setBgCategory,processingSpeed,setProcessingSpeed,statusText,
 downloadUrl,aspectRatio,setAspectRatio,copiedField,shareStatus,setShareStatus,showAiModal,setShowAiModal,logoUrl,setLogoUrl,
 bgTab,setBgTab,pexelsApiKey,setPexelsApiKey,pexelsQuery,setPexelsQuery,pexelsResults,pexelsSearching,searchPexels,
 canvasRef,videoRef,audioRefA,audioRefB,isBackendRendering,handleBackendVideoRender,startPlaybackOrRecording,stopPlayback,filteredLessons,filteredPresets,captionsKit,
 copyToClipboard,publishToConnectedAccounts,handleToggleAutoPost,handleDisconnectSocial,handleVerifyAndSaveToken,handleLaunchOAuthPopup,handleNativeShare,
 tikTokCreator,tikTokSettings,setTikTokSettings,renderEngine,setRenderEngine,serviceState,serviceVersion,saveServiceConfig,serviceConfig,completedAsset,updateAsset,isPublishing,inspectorTab,setInspectorTab,workspaceTab,setWorkspaceTab,mobileMenuOpen,setMobileMenuOpen,
 setLoadVersion,loadError,renderPhase,authForm,setAuthForm,QURAN_LESSONS,PRESET_VIDEOS,RECITERS_METADATA,buildPtpReflectionPackage,generateAIShortsScript}}/>;
}
