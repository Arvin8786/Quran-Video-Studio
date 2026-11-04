/**
 * ProEase Studio - 9:16 Portrait Quran Shorts & Natural Scene Video Studio
 * Complete integration with Al Quran Cloud API, Pexels Video API (Long Loops),
 * Canvas 9:16 Portrait rendering (No-Box Seamless Scrim & Highlighted Wordings),
 * 365 Days Curated Awareness Shorts (Daily Social Media Posting),
 * Animated Series Royalty-Free Database,
 * Long Multi-Scene Nature Loops, and Processing-Gated Download Pipeline.
 */

import { AWARENESS_365_DAYS, AWARENESS_CATEGORIES } from './awareness365Data.js';

// Application State
const state = {
  isPreparing: false,
  isFinalizing: false,
  playbackGeneration: 0,
  canvasStream: null,
  activeMode: 'quran', // 'quran' | 'awareness' | 'nature'
  surahs: [],
  selectedSurah: null,
  startAyah: 1,
  endAyah: 7,
  selectedReciter: 'Husary_128kbps',
  processingSpeed: 1.0,
  pendingAutoDownload: false,
  ayahData: [], // Array of { numberInSurah, arabic, transliteration, translation, audioUrl, duration }
  currentAyahIndex: 0,
  isPlaying: false,
  isRecording: false,
  isProcessingComplete: false, // Strict requirement: video must complete processing before allowing download
  currentBackgroundVideoUrl: '',
  mediaRecorder: null,
  recordedChunks: [],
  audioContext: null,
  audioSourceNode: null,
  audioDestinationNode: null,
  currentAudioObj: null,
  natureAudioNode: null,
  natureGainNode: null,
  animationFrameId: null,
  fontSizeArabic: 42,
  overlayTheme: 'goldGlow',
  boxLightness: 65, // Percentage (20 to 95)
  showAwarenessBanner: true,
  currentAwarenessKey: null,
  awarenessPage: 1,
  awarenessCurrentDay: 1,
  awarenessSearchQuery: '',
  awarenessSelectedCategory: 'all',
  selectedCategory: 'all',
  proceduralType: 'gold',

  // Long Nature Loop Studio Settings
  natureTargetSeconds: 300, // Default 5 minutes
  natureCycleSpeed: 0, // Single scene or shift every 15s/30s/60s
  natureAudioMode: 'oceanWaves', // 'oceanWaves' | 'forestRain' | 'mountainStream' | 'nightCampfire' | 'gentleWind' | 'silent'
  natureTextDisplay: 'pureNature', // Blank video for mind relaxation and peaceful atmospheres
  natureSelectedCategory: 'all',
  dhikrIndex: 0,
  lastDhikrSwitchTime: 0,

  // Video Captions, Details & Reciter Credits State
  captionsPlatform: 'youtube', // 'youtube' | 'shorts' | 'social'
  captionsTitleStyle: 'emotional', // 'emotional' | 'seo' | 'hook'

  // Playback & Timing
  lastSceneSwitchTime: 0,
  sceneIndex: 0,
  playbackStartTime: 0,
  totalTargetSeconds: 0,
  currentBufferSource: null,
  currentAyahDuration: 5,
  currentAyahAudioStartTime: 0,
  lastRecordedBlob: null,
  lastRecordedUrl: '',
  lastRecordedFilename: '',
  particles: [] // Animated canvas particles for offline modes
};

// Default Pexels API Key provided by user
// Supply your own Pexels key in the UI; never ship a shared credential.
const DEFAULT_PEXELS_API_KEY = '';

// Peaceful Dhikr list for Long Nature Loop Studio
const DHIKR_LIST = [
  {
    arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
    transliteration: 'Subhan-Allahi wa bihamdihi, Subhan-Allahil-Azim',
    translation: 'Glory be to Allah and His is the praise, Glory be to Allah the Supreme'
  },
  {
    arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
    transliteration: 'La ilaha ill-Allahu wahdahu la sharika lahu',
    translation: 'There is no god but Allah alone, having no partner with Him'
  },
  {
    arabic: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
    transliteration: 'Al-hamdu lillahi Rabbil-alamin',
    translation: 'All praise is due to Allah, the Lord of all the worlds'
  },
  {
    arabic: 'أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ وَأَتُوبُ إِلَيْهِ',
    transliteration: 'Astaghfirullah al-Azim wa atubu ilayh',
    translation: 'I seek forgiveness from Allah the Almighty and repent unto Him'
  },
  {
    arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ',
    transliteration: 'La hawla wa la quwwata illa billahil-Aliyyil-Azim',
    translation: 'There is no power nor might except with Allah, the Most High, the Supreme'
  }
];

// Curated Thematic Awareness Shorts (Matched Verses + Cinematic Natural Scenes)
const AWARENESS_THEMES = {
  death: {
    key: 'death',
    title: 'THE REALITY OF DEATH',
    bannerText: '⚡ AWARENESS • THE REALITY OF DEATH',
    surahNumber: 50, // Surah Qaf
    surahName: 'Qaf',
    startAyah: 19,
    endAyah: 22,
    backgroundCategory: 'sea',
    videoUrl: 'https://videos.pexels.com/video-files/34693119/14704850_1920_1080_30fps.mp4', // stormy horizon & ocean waves
    themeStyle: 'lightGlass',
    quote: 'And the stupor of death will come in truth: That is what you were trying to escape!'
  },
  tasteDeath: {
    key: 'tasteDeath',
    title: 'EVERY SOUL SHALL TASTE DEATH',
    bannerText: '⚡ REMINDER • EVERY SOUL SHALL TASTE DEATH',
    surahNumber: 21, // Surah Al-Anbiya
    surahName: 'Al-Anbiyaa',
    startAyah: 34,
    endAyah: 35,
    backgroundCategory: 'sky',
    videoUrl: 'https://videos.pexels.com/video-files/5853147/5853147-hd_1366_720_30fps.mp4', // vast clouds over horizon
    themeStyle: 'translucentGold',
    quote: 'Every soul will taste death. And We test you with evil and with good as trial.'
  },
  judgment: {
    key: 'judgment',
    title: 'THE DAY OF JUDGMENT',
    bannerText: '⚡ AWARENESS • THE DAY OF JUDGMENT',
    surahNumber: 81, // Surah At-Takwir
    surahName: 'At-Takwir',
    startAyah: 1,
    endAyah: 6,
    backgroundCategory: 'sea',
    videoUrl: 'https://videos.pexels.com/video-files/5668625/5668625-hd_1366_720_30fps.mp4',
    themeStyle: 'lightGlass',
    quote: 'When the sun is rolled up, and when the stars fall, and when the mountains pass away...'
  },
  zalzalah: {
    key: 'zalzalah',
    title: 'THE TREMOR OF THE EARTH',
    bannerText: '⚡ AWARENESS • THE FINAL EARTHQUAKE',
    surahNumber: 99, // Surah Az-Zalzalah
    surahName: 'Az-Zalzala',
    startAyah: 1,
    endAyah: 8,
    backgroundCategory: 'river',
    videoUrl: 'https://videos.pexels.com/video-files/11661110/11661110-hd_1280_720_24fps.mp4', // towering canyon
    themeStyle: 'softMist',
    quote: 'When the earth is shaken with its earthquake, and the earth unloads its burdens...'
  },
  mercy: {
    key: 'mercy',
    title: 'DIVINE MERCY & FORGIVENESS',
    bannerText: '🌅 HOPE • DIVINE MERCY & FORGIVENESS',
    surahNumber: 39, // Surah Az-Zumar
    surahName: 'Az-Zumar',
    startAyah: 53,
    endAyah: 54,
    backgroundCategory: 'forest',
    videoUrl: 'https://videos.pexels.com/video-files/5535406/5535406-hd_1920_1080_30fps.mp4', // morning sun rays through forest
    themeStyle: 'lightGlass',
    quote: 'Do not despair of the mercy of Allah. Indeed, Allah forgives all sins.'
  },
  jannah: {
    key: 'jannah',
    title: 'THE GARDENS OF JANNAH',
    bannerText: '🌿 CONTEMPLATION • THE GARDENS OF JANNAH',
    surahNumber: 55, // Surah Ar-Rahman
    surahName: 'Ar-Rahmaan',
    startAyah: 46,
    endAyah: 50,
    backgroundCategory: 'river',
    videoUrl: 'https://videos.pexels.com/video-files/6405064/6405064-hd_1920_1080_24fps.mp4', // crystal cascading paradise waterfall
    themeStyle: 'emerald',
    quote: 'And for him who feared the standing before his Lord, there are two gardens...'
  },
  peace: {
    key: 'peace',
    title: 'REST FOR THE HEARTS',
    bannerText: '🕊️ SOLACE • REST FOR THE HEARTS',
    surahNumber: 13, // Surah Ar-Ra'd
    surahName: "Ar-Ra'd",
    startAyah: 28,
    endAyah: 29,
    backgroundCategory: 'sea',
    videoUrl: 'https://videos.pexels.com/video-files/6748729/6748729-hd_1366_570_24fps.mp4', // serene coastline
    themeStyle: 'whiteVeil',
    quote: 'Verily, in the remembrance of Allah do hearts find rest and peace.'
  },
  ease: {
    key: 'ease',
    title: 'EASE WITH HARDSHIP',
    bannerText: '🌈 PROMISE • WITH HARDSHIP COMES EASE',
    surahNumber: 94, // Surah Ash-Sharh
    surahName: 'Ash-Sharh',
    startAyah: 1,
    endAyah: 8,
    backgroundCategory: 'forest',
    videoUrl: 'https://videos.pexels.com/video-files/5623817/5623817-hd_1920_1080_24fps.mp4', // evergreen pines
    themeStyle: 'lightGlass',
    quote: 'For indeed, with hardship comes ease. Indeed, with hardship comes ease.'
  }
};

// Preset Royalty-Free Background Videos (High Quality Long HD Loops & Animated Series)
const PRESET_VIDEOS = [
  // Animated Series (Curated Royalty-Free Loops for Social Shorts)
  {
    id: 'animated-lanterns',
    category: 'animated',
    title: '✨ Ramadan Lanterns & Stars (Animated Series)',
    durationBadge: 'Animated Loop',
    thumb: 'https://images.pexels.com/photos/4386442/pexels-photo-4386442.jpeg?auto=compress&cs=tinysrgb&w=300',
    videoUrl: 'animated-lanterns'
  },
  {
    id: 'animated-dunes',
    category: 'animated',
    title: '🌙 Starry Desert Dunes (Animated Series)',
    durationBadge: 'Animated Loop',
    thumb: 'https://images.pexels.com/photos/1001435/pexels-photo-1001435.jpeg?auto=compress&cs=tinysrgb&w=300',
    videoUrl: 'animated-dunes'
  },
  {
    id: 'animated-sakura',
    category: 'animated',
    title: '🌸 Falling Sakura Petals & Sky (Animated Series)',
    durationBadge: 'Animated Loop',
    thumb: 'https://images.pexels.com/photos/2088203/pexels-photo-2088203.jpeg?auto=compress&cs=tinysrgb&w=300',
    videoUrl: 'animated-sakura'
  },
  {
    id: 'animated-cosmic',
    category: 'animated',
    title: '🌌 Celestial Galaxy & Stardust (Animated Series)',
    durationBadge: 'Animated Loop',
    thumb: 'https://images.pexels.com/photos/1169754/pexels-photo-1169754.jpeg?auto=compress&cs=tinysrgb&w=300',
    videoUrl: 'animated-cosmic'
  },
  {
    id: 'animated-particles',
    category: 'animated',
    title: '✨ Golden Sacred Radiance (Animated Series)',
    durationBadge: 'Animated Loop',
    thumb: 'https://images.pexels.com/photos/7130555/pexels-photo-7130555.jpeg?auto=compress&cs=tinysrgb&w=300',
    videoUrl: 'animated-particles'
  },
  {
    id: 'animated-ghibli',
    category: 'animated',
    title: '🍃 Anime Meadow & Sunset (Animated Series)',
    durationBadge: 'Animated Loop',
    thumb: 'https://images.pexels.com/photos/1423600/pexels-photo-1423600.jpeg?auto=compress&cs=tinysrgb&w=300',
    videoUrl: 'animated-ghibli'
  },
  {
    id: 'animated-aurora',
    category: 'animated',
    title: '🌌 Emerald Aurora Waves (Animated Series)',
    durationBadge: 'Animated Loop',
    thumb: 'https://images.pexels.com/photos/1938348/pexels-photo-1938348.jpeg?auto=compress&cs=tinysrgb&w=300',
    videoUrl: 'animated-aurora'
  },
  {
    id: 'animated-oasis',
    category: 'animated',
    title: '🌴 Twilight Oasis & Crescent (Animated Series)',
    durationBadge: 'Animated Loop',
    thumb: 'https://images.pexels.com/photos/33545/sunrise-phu-quoc-island-ocean.jpg?auto=compress&cs=tinysrgb&w=300',
    videoUrl: 'animated-oasis'
  },
  {
    id: 'animated-clouds',
    category: 'animated',
    title: '☁️ Pastel Twilight Cloud Drift (Animated Series)',
    durationBadge: 'Animated Loop',
    thumb: 'https://images.pexels.com/photos/531756/pexels-photo-531756.jpeg?auto=compress&cs=tinysrgb&w=300',
    videoUrl: 'animated-clouds'
  },
  {
    id: 'animated-mosque',
    category: 'animated',
    title: '🕌 Islamic Mosque Silhouette (Animated Series)',
    durationBadge: 'Animated Loop',
    thumb: 'https://images.pexels.com/photos/2233416/pexels-photo-2233416.jpeg?auto=compress&cs=tinysrgb&w=300',
    videoUrl: 'animated-mosque'
  },

  // Sea & Ocean
  {
    id: 'sea-waves',
    category: 'sea',
    title: 'Majestic Ocean Waves',
    durationBadge: '60s',
    thumb: 'https://images.pexels.com/videos/34693119/nature-ocean-sea-slow-motion-34693119.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/34693119/14704850_1920_1080_30fps.mp4'
  },
  {
    id: 'sea-deep',
    category: 'sea',
    title: 'Deep Blue Sea',
    durationBadge: '45s',
    thumb: 'https://images.pexels.com/videos/5668625/pexels-photo-5668625.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/5668625/5668625-hd_1366_720_30fps.mp4'
  },
  {
    id: 'sea-aerial',
    category: 'sea',
    title: 'Coastal Surf Shore',
    durationBadge: '50s',
    thumb: 'https://images.pexels.com/videos/6748729/4k-above-sea-beach-drone-6748729.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/6748729/6748729-hd_1366_570_24fps.mp4'
  },

  // Forest & Trees
  {
    id: 'forest-sunrays',
    category: 'forest',
    title: 'Sun Rays in Pine Forest',
    durationBadge: '58s',
    thumb: 'https://images.pexels.com/videos/5535406/pexels-photo-5535406.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/5535406/5535406-hd_1920_1080_30fps.mp4'
  },
  {
    id: 'forest-canopy',
    category: 'forest',
    title: 'Evergreen Pine Canopy',
    durationBadge: '48s',
    thumb: 'https://images.pexels.com/videos/5623817/pexels-photo-5623817.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/5623817/5623817-hd_1920_1080_24fps.mp4'
  },
  {
    id: 'forest-sunflare',
    category: 'forest',
    title: 'Golden Woods Flare',
    durationBadge: '35s',
    thumb: 'https://images.pexels.com/videos/11265968/lens-flare-slowmotion-sun-flare-11265968.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/11265968/11265968-hd_1280_720_25fps.mp4'
  },

  // River & Waterfalls
  {
    id: 'river-mountain',
    category: 'river',
    title: 'Serene Alpine River',
    durationBadge: '52s',
    thumb: 'https://images.pexels.com/videos/28963293/pexels-photo-28963293.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/28963293/12529743_1920_1080_24fps.mp4'
  },
  {
    id: 'waterfall-cascade',
    category: 'river',
    title: 'Cascading Mountain Falls',
    durationBadge: '60s',
    thumb: 'https://images.pexels.com/videos/6405064/120fps-fujifilm-slow-motion-video-waterfall-6405064.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/6405064/6405064-hd_1920_1080_24fps.mp4'
  },
  {
    id: 'river-canyon',
    category: 'river',
    title: 'Canyon Stream Drone',
    durationBadge: '40s',
    thumb: 'https://images.pexels.com/videos/11661110/canyon-drone-footage-drone-photography-drone-shot-11661110.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/11661110/11661110-hd_1280_720_24fps.mp4'
  },

  // Sky & Clouds
  {
    id: 'clouds-ocean',
    category: 'sky',
    title: 'Atmospheric Storm Clouds',
    durationBadge: '65s',
    thumb: 'https://images.pexels.com/videos/5853147/pictures/preview-0.jpg',
    videoUrl: 'https://videos.pexels.com/video-files/5853147/5853147-hd_1366_720_30fps.mp4'
  },

  // Procedural Offline Natural Backgrounds
  {
    id: 'procedural-sea',
    category: 'procedural',
    title: 'Ocean Horizon (Offline)',
    durationBadge: 'Loop',
    thumb: 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=300',
    videoUrl: 'procedural-sea'
  },
  {
    id: 'procedural-forest',
    category: 'procedural',
    title: 'Emerald Forest (Offline)',
    durationBadge: 'Loop',
    thumb: 'https://images.pexels.com/photos/1423600/pexels-photo-1423600.jpeg?auto=compress&cs=tinysrgb&w=300',
    videoUrl: 'procedural-forest'
  },
  {
    id: 'procedural-gold',
    category: 'procedural',
    title: 'Golden Aura (Offline)',
    durationBadge: 'Loop',
    thumb: 'https://images.pexels.com/photos/7130555/pexels-photo-7130555.jpeg?auto=compress&cs=tinysrgb&w=300',
    videoUrl: 'procedural-gold'
  }
];

// Curated Royalty-Free Nature Background Loop Videos (Exclusively for Mind Relaxation & Peaceful Atmospheres)
const NATURE_PRESET_VIDEOS = [
  // Ocean & Waves
  {
    id: 'nature-ocean-majestic',
    category: 'sea',
    title: 'Majestic Ocean Waves & Surf',
    durationBadge: '60s HD Loop',
    thumb: 'https://images.pexels.com/videos/34693119/nature-ocean-sea-slow-motion-34693119.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/34693119/14704850_1920_1080_30fps.mp4'
  },
  {
    id: 'nature-ocean-deep',
    category: 'sea',
    title: 'Deep Blue Coastal Waves',
    durationBadge: '45s HD Loop',
    thumb: 'https://images.pexels.com/videos/5668625/pexels-photo-5668625.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/5668625/5668625-hd_1366_720_30fps.mp4'
  },
  {
    id: 'nature-ocean-aerial',
    category: 'sea',
    title: 'Tropical Coastal Surf Shore',
    durationBadge: '50s HD Loop',
    thumb: 'https://images.pexels.com/videos/6748729/4k-above-sea-beach-drone-6748729.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/6748729/6748729-hd_1366_570_24fps.mp4'
  },
  {
    id: 'nature-ocean-emerald',
    category: 'sea',
    title: 'Emerald Wave Shoreline',
    durationBadge: '35s HD Loop',
    thumb: 'https://images.pexels.com/videos/34964457/pexels-photo-34964457.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/34964457/14811528_1280_720_30fps.mp4'
  },
  {
    id: 'nature-ocean-sunset',
    category: 'sea',
    title: 'Golden Sunset Tide & Surf',
    durationBadge: '40s HD Loop',
    thumb: 'https://images.pexels.com/videos/2876707/free-video-2876707.jpg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/2876707/2876707-hd_1920_1080_30fps.mp4'
  },
  {
    id: 'nature-ocean-rhythmic',
    category: 'sea',
    title: 'Rhythmic Calming Foam Surf',
    durationBadge: '40s HD Loop',
    thumb: 'https://images.pexels.com/videos/36323806/atmosphere-atmospheric-breaking-calm-36323806.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/36323806/15404563_1280_720_24fps.mp4'
  },

  // Forest & Pines
  {
    id: 'nature-forest-sunrays',
    category: 'forest',
    title: 'Sun Rays in Pine Forest',
    durationBadge: '58s HD Loop',
    thumb: 'https://images.pexels.com/videos/5535406/pexels-photo-5535406.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/5535406/5535406-hd_1920_1080_30fps.mp4'
  },
  {
    id: 'nature-forest-canopy',
    category: 'forest',
    title: 'Evergreen Pine Canopy',
    durationBadge: '48s HD Loop',
    thumb: 'https://images.pexels.com/videos/5623817/pexels-photo-5623817.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/5623817/5623817-hd_1920_1080_24fps.mp4'
  },
  {
    id: 'nature-forest-sunflare',
    category: 'forest',
    title: 'Golden Woods Lens Flare',
    durationBadge: '35s HD Loop',
    thumb: 'https://images.pexels.com/videos/11265968/lens-flare-slowmotion-sun-flare-11265968.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/11265968/11265968-hd_1280_720_25fps.mp4'
  },
  {
    id: 'nature-forest-mist',
    category: 'forest',
    title: 'Alpine Forest Mist & Clouds',
    durationBadge: '40s HD Loop',
    thumb: 'https://images.pexels.com/videos/5968139/blue-clouds-cotinus-forest-5968139.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/5968139/5968139-hd_1920_1080_30fps.mp4'
  },

  // Rivers & Waterfalls
  {
    id: 'nature-river-alpine',
    category: 'river',
    title: 'Serene Alpine River Flow',
    durationBadge: '52s HD Loop',
    thumb: 'https://images.pexels.com/videos/28963293/pexels-photo-28963293.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/28963293/12529743_1920_1080_24fps.mp4'
  },
  {
    id: 'nature-waterfall-cascade',
    category: 'river',
    title: 'Cascading Mountain Falls',
    durationBadge: '60s HD Loop',
    thumb: 'https://images.pexels.com/videos/6405064/120fps-fujifilm-slow-motion-video-waterfall-6405064.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/6405064/6405064-hd_1920_1080_24fps.mp4'
  },
  {
    id: 'nature-river-canyon',
    category: 'river',
    title: 'Towering Canyon River Stream',
    durationBadge: '40s HD Loop',
    thumb: 'https://images.pexels.com/videos/11661110/canyon-drone-footage-drone-photography-drone-shot-11661110.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/11661110/11661110-hd_1280_720_24fps.mp4'
  },
  {
    id: 'nature-river-stones',
    category: 'river',
    title: 'Mountain Brook & Pebble Stones',
    durationBadge: '30s HD Loop',
    thumb: 'https://images.pexels.com/videos/26855469/mountains-pebble-river-stones-26855469.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/26855469/12022116_1280_720_30fps.mp4'
  },
  {
    id: 'nature-waterfall-alpine',
    category: 'river',
    title: 'Alpine Forest Waterfall Stream',
    durationBadge: '45s HD Loop',
    thumb: 'https://images.pexels.com/videos/3987504/acqua-alberi-alpi-animali-3987504.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/3987504/3987504-hd_1920_1080_30fps.mp4'
  },

  // Rain & Water
  {
    id: 'nature-rain-green',
    category: 'rain',
    title: 'Peaceful Rain on Green Leaves',
    durationBadge: '45s HD Loop',
    thumb: 'https://images.pexels.com/videos/32628145/cold-climate-monsoon-monsoon-weather-pune-32628145.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/32628145/13913113_1280_720_25fps.mp4'
  },
  {
    id: 'nature-rain-monsoon',
    category: 'rain',
    title: 'Soft Garden Rain & Droplets',
    durationBadge: '30s HD Loop',
    thumb: 'https://images.pexels.com/videos/4779387/colombia-jardin-lluvia-matas-4779387.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/4779387/4779387-uhd_3840_2160_30fps.mp4'
  },
  {
    id: 'nature-rain-canopy',
    category: 'rain',
    title: 'Rain Falling Through Foliage',
    durationBadge: '30s HD Loop',
    thumb: 'https://images.pexels.com/videos/4779388/colombia-goteras-lluvia-naturaleza-4779388.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/4779388/4779388-uhd_3840_2160_30fps.mp4'
  },

  // Mountains & Clouds
  {
    id: 'nature-mountain-valley',
    category: 'mountain',
    title: 'Majestic Alpine Valley Drone',
    durationBadge: '45s HD Loop',
    thumb: 'https://images.pexels.com/videos/35274206/4k-drohnenaufnahme-4k-nature-beautiful-landscape-by-drone-beautiful-landscape-drone-35274206.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/35274206/14942934_1280_720_60fps.mp4'
  },
  {
    id: 'nature-mountain-sunrise',
    category: 'mountain',
    title: 'Golden Sunrise Mountain Peak',
    durationBadge: '35s HD Loop',
    thumb: 'https://images.pexels.com/videos/3926075/travel-nature-sunrise-3926075.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/3926075/3926075-uhd_2560_1440_24fps.mp4'
  },
  {
    id: 'nature-mountain-hills',
    category: 'mountain',
    title: 'Lush Green Rolling Hills',
    durationBadge: '30s HD Loop',
    thumb: 'https://images.pexels.com/videos/26583632/pexels-photo-26583632.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/26583632/11964892_1280_720_60fps.mp4'
  },
  {
    id: 'nature-clouds-ocean',
    category: 'mountain',
    title: 'Atmospheric Cloud Drift Horizon',
    durationBadge: '65s HD Loop',
    thumb: 'https://images.pexels.com/videos/5853147/pictures/preview-0.jpg',
    videoUrl: 'https://videos.pexels.com/video-files/5853147/5853147-hd_1366_720_30fps.mp4'
  },

  // Night & Starry Sky
  {
    id: 'nature-night-galaxy',
    category: 'night',
    title: 'Deep Celestial Galaxy & Stars',
    durationBadge: '50s HD Loop',
    thumb: 'https://images.pexels.com/videos/14369240/abundance-abundant-adoration-adventure-14369240.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/14369240/14369240-hd_1920_1080_30fps.mp4'
  },
  {
    id: 'nature-night-stars',
    category: 'night',
    title: 'Starry Sky Drift & Constellations',
    durationBadge: '40s HD Loop',
    thumb: 'https://images.pexels.com/videos/12336940/pexels-photo-12336940.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/12336940/12336940-hd_1920_1028_60fps.mp4'
  },
  {
    id: 'nature-night-clouds',
    category: 'night',
    title: 'Starry Horizon & Whispering Clouds',
    durationBadge: '40s HD Loop',
    thumb: 'https://images.pexels.com/videos/12336972/pexels-photo-12336972.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    videoUrl: 'https://videos.pexels.com/video-files/12336972/12336972-hd_1346_720_60fps.mp4'
  },

  // Offline Procedural Visuals
  {
    id: 'procedural-sea',
    category: 'procedural',
    title: 'Calming Ocean Horizon (Offline)',
    durationBadge: 'Offline Loop',
    thumb: 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=300',
    videoUrl: 'procedural-sea'
  },
  {
    id: 'procedural-forest',
    category: 'procedural',
    title: 'Emerald Pine Woods (Offline)',
    durationBadge: 'Offline Loop',
    thumb: 'https://images.pexels.com/photos/1423600/pexels-photo-1423600.jpeg?auto=compress&cs=tinysrgb&w=300',
    videoUrl: 'procedural-forest'
  },
  {
    id: 'procedural-stars',
    category: 'procedural',
    title: 'Midnight Starfield (Offline)',
    durationBadge: 'Offline Loop',
    thumb: 'https://images.pexels.com/photos/1169754/pexels-photo-1169754.jpeg?auto=compress&cs=tinysrgb&w=300',
    videoUrl: 'procedural-stars'
  }
];

// DOM Element References
let dom = {};

function initDom() {
  dom = {
    modeBtnQuran: document.getElementById('modeBtnQuran'),
    modeBtnAwareness: document.getElementById('modeBtnAwareness'),
    modeBtnNature: document.getElementById('modeBtnNature'),
    sectionAwareness: document.getElementById('sectionAwareness'),
    sectionNatureLoop: document.getElementById('sectionNatureLoop'),
    sectionQuran: document.getElementById('sectionQuran'),
    sectionVideo: document.getElementById('sectionVideo'),
    sectionOverlay: document.getElementById('sectionOverlay'),
    awarenessGrid: document.getElementById('awarenessGrid'),
    natureDurationChips: document.getElementById('natureDurationChips'),
    customDurationRow: document.getElementById('customDurationRow'),
    customMinutesInput: document.getElementById('customMinutesInput'),
    sceneCycleSpeed: document.getElementById('sceneCycleSpeed'),
    natureAudioMode: document.getElementById('natureAudioMode'),
    natureTextDisplay: document.getElementById('natureTextDisplay'),
    natureTabPresets: document.getElementById('natureTabPresets'),
    natureTabPexels: document.getElementById('natureTabPexels'),
    natureTabUpload: document.getElementById('natureTabUpload'),
    natureContentPresets: document.getElementById('natureContentPresets'),
    natureContentPexels: document.getElementById('natureContentPexels'),
    natureContentUpload: document.getElementById('natureContentUpload'),
    natureCategoryChips: document.getElementById('natureCategoryChips'),
    naturePresetGrid: document.getElementById('naturePresetGrid'),
    naturePexelsQuery: document.getElementById('naturePexelsQuery'),
    btnSearchNaturePexels: document.getElementById('btnSearchNaturePexels'),
    naturePexelsResults: document.getElementById('naturePexelsResults'),
    natureDropzone: document.getElementById('natureDropzone'),
    natureVideoFileInput: document.getElementById('natureVideoFileInput'),
    natureUploadFileName: document.getElementById('natureUploadFileName'),
    surahSelect: document.getElementById('surahSelect'),
    surahSearch: document.getElementById('surahSearch'),
    startAyah: document.getElementById('startAyah'),
    endAyah: document.getElementById('endAyah'),
    reciterSelect: document.getElementById('reciterSelect'),
    fontSizeArabic: document.getElementById('fontSizeArabic'),
    overlayTheme: document.getElementById('overlayTheme'),
    boxLightnessSlider: document.getElementById('boxLightnessSlider'),
    boxLightnessValue: document.getElementById('boxLightnessValue'),
    awarenessBannerToggle: document.getElementById('awarenessBannerToggle'),
    categoryChips: document.getElementById('categoryChips'),
    presetGrid: document.getElementById('presetGrid'),
    tabPresets: document.getElementById('tabPresets'),
    tabPexels: document.getElementById('tabPexels'),
    tabUpload: document.getElementById('tabUpload'),
    contentPresets: document.getElementById('contentPresets'),
    contentPexels: document.getElementById('contentPexels'),
    contentUpload: document.getElementById('contentUpload'),
    pexelsApiKey: document.getElementById('pexelsApiKey'),
    pexelsQuery: document.getElementById('pexelsQuery'),
    btnSearchPexels: document.getElementById('btnSearchPexels'),
    pexelsDurationFilter: document.getElementById('pexelsDurationFilter'),
    pexelsResults: document.getElementById('pexelsResults'),
    dropzone: document.getElementById('dropzone'),
    videoFileInput: document.getElementById('videoFileInput'),
    uploadFileName: document.getElementById('uploadFileName'),
    renderCanvas: document.getElementById('renderCanvas'),
    bgVideoSource: document.getElementById('bgVideoSource'),
    audioSource: document.getElementById('audioSource'),
    btnPreviewPlay: document.getElementById('btnPreviewPlay'),
    btnPlayText: document.getElementById('btnPlayText'),
    btnStopPlay: document.getElementById('btnStopPlay'),
    btnGenerateRecord: document.getElementById('btnGenerateRecord'),
    btnRecordText: document.getElementById('btnRecordText'),
    timelineTrack: document.getElementById('timelineTrack'),
    timelineFill: document.getElementById('timelineFill'),
    timeCurrent: document.getElementById('timeCurrent'),
    timeTotal: document.getElementById('timeTotal'),
    renderStatusMessage: document.getElementById('renderStatusMessage'),
    globalStatus: document.getElementById('globalStatus'),
    hudAyahInfo: document.getElementById('hudAyahInfo'),
    hudRecordingIndicator: document.getElementById('hudRecordingIndicator'),
    hudRecTime: document.getElementById('hudRecTime'),
    renderProgressModal: document.getElementById('renderProgressModal'),
    renderModalProgressFill: document.getElementById('renderModalProgressFill'),
    renderModalStep: document.getElementById('renderModalStep'),
    renderModalTitle: document.getElementById('renderModalTitle'),
    renderModalSubtitle: document.getElementById('renderModalSubtitle'),
    exportResultBox: document.getElementById('exportResultBox'),
    btnDownloadVideo: document.getElementById('btnDownloadVideo'),
    directDownloadCard: document.getElementById('directDownloadCard'),
    directDownloadStatus: document.getElementById('directDownloadStatus'),
    directDownloadDetails: document.getElementById('directDownloadDetails'),
    btnDirectDownloadAnchor: document.getElementById('btnDirectDownloadAnchor'),
    btnDirectDownloadAnchorText: document.getElementById('btnDirectDownloadAnchorText'),
    ayahQueueCount: document.getElementById('ayahQueueCount'),
    ayahQueueContainer: document.getElementById('ayahQueueContainer'),
    btnFullSurah: document.getElementById('btnFullSurah'),
    btnAyah1to3: document.getElementById('btnAyah1to3'),
    btnAyah1to5: document.getElementById('btnAyah1to5'),
    btnAyah1to7: document.getElementById('btnAyah1to7'),
    activeModeBadge: document.getElementById('activeModeBadge'),
    awarenessReciterSelect: document.getElementById('awarenessReciterSelect'),
    processingSpeedSelect: document.getElementById('processingSpeedSelect'),
    videoSectionHeading: document.getElementById('videoSectionHeading'),
    ayahQueueTitle: document.getElementById('ayahQueueTitle'),
    awareness365Search: document.getElementById('awareness365Search'),
    awarenessCatChips: document.getElementById('awarenessCatChips'),
    btnSearchAwarenessClear: document.getElementById('btnSearchAwarenessClear'),
    btnAwarenessJumpToday: document.getElementById('btnAwarenessJumpToday'),
    btnAwarenessRandom: document.getElementById('btnAwarenessRandom'),
    btnAwarenessPrevDay: document.getElementById('btnAwarenessPrevDay'),
    btnAwarenessNextDay: document.getElementById('btnAwarenessNextDay'),
    btnAwarenessPrevPage: document.getElementById('btnAwarenessPrevPage'),
    btnAwarenessNextPage: document.getElementById('btnAwarenessNextPage'),
    awarenessPageInfo: document.getElementById('awarenessPageInfo'),
    awarenessPageNumber: document.getElementById('awarenessPageNumber'),
    awarenessDayCountBadge: document.getElementById('awarenessDayCountBadge'),
    entireSurahNotice: document.getElementById('entireSurahNotice'),
    entireSurahDescription: document.getElementById('entireSurahDescription'),
    headerActiveModeText: document.getElementById('headerActiveModeText'),
    headerResTag: document.getElementById('headerResTag'),

    // Video Captions, Details & Reciter Credits Section Elements
    sectionVideoCaptions: document.getElementById('sectionVideoCaptions'),
    captionsModeBadge: document.getElementById('captionsModeBadge'),
    captionsPlatformTabs: document.getElementById('captionsPlatformTabs'),
    btnCopyTitle: document.getElementById('btnCopyTitle'),
    titleOptionsChips: document.getElementById('titleOptionsChips'),
    captionTitleInput: document.getElementById('captionTitleInput'),
    reciterCreditsBlock: document.getElementById('reciterCreditsBlock'),
    reciterCreditsLabel: document.getElementById('reciterCreditsLabel'),
    btnCopyCredits: document.getElementById('btnCopyCredits'),
    reciterCreditCard: document.getElementById('reciterCreditCard'),
    reciterAvatarIcon: document.getElementById('reciterAvatarIcon'),
    reciterCreditName: document.getElementById('reciterCreditName'),
    reciterCreditMeta: document.getElementById('reciterCreditMeta'),
    videoSpecsRow: document.getElementById('videoSpecsRow'),
    specPillSurah: document.getElementById('specPillSurah'),
    specPillResolution: document.getElementById('specPillResolution'),
    specPillAyahs: document.getElementById('specPillAyahs'),
    specPillLicense: document.getElementById('specPillLicense'),
    btnCopyDescription: document.getElementById('btnCopyDescription'),
    captionDescriptionTextarea: document.getElementById('captionDescriptionTextarea'),
    btnCopyHashtags: document.getElementById('btnCopyHashtags'),
    hashtagsContainer: document.getElementById('hashtagsContainer'),
    btnCopyFullKit: document.getElementById('btnCopyFullKit')
  };

  // Default mode is Quran Recitation: 16:9 Landscape HD (1280x720)
  if (dom.renderCanvas) {
    dom.renderCanvas.width = 1280;
    dom.renderCanvas.height = 720;
  }
}

function setCanvasDimensions(width, height) {
  if (!dom.renderCanvas) return;
  dom.renderCanvas.width = width;
  dom.renderCanvas.height = height;

  const wrapper = document.querySelector('.canvas-viewport-wrapper');
  if (wrapper) {
    if (width > height) {
      wrapper.classList.remove('is-portrait');
      wrapper.classList.add('is-landscape');
    } else {
      wrapper.classList.remove('is-landscape');
      wrapper.classList.add('is-portrait');
    }
  }

  const qualityBadge = document.querySelector('.badge-720p-quality');
  if (qualityBadge) {
    if (width > height) {
      qualityBadge.innerHTML = `
        <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
        16:9 Landscape · 720p
      `;
      qualityBadge.title = '16:9 Landscape HD (1280x720) for YouTube & Recitation';
    } else {
      qualityBadge.innerHTML = `
        <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
        9:16 Shorts · 720p
      `;
      qualityBadge.title = '9:16 Portrait HD (720x1280) for TikTok, Reels & Shorts';
    }
  }

  initParticles();
  drawCanvasFrame();
}

// 1. Quran Metadata & Surah Fetching
async function fetchSurahList() {
  try {
    setStatus('Fetching Surahs...', '#fbbf24');
    const res = await fetch('https://api.alquran.cloud/v1/surah');
    const data = await res.json();
    if (data.code === 200 && data.data) {
      state.surahs = data.data;
      renderSurahDropdown();
      setStatus('Surahs loaded', '#10b981');
      if (state.surahs.length > 0) {
        selectSurah(1); // Default to Al-Faatiha
      }
    }
  } catch (err) {
    console.error('Failed to fetch surah list:', err);
    setStatus('Failed to load Surahs (Network Error)', '#ef4444');
  }
}

function renderSurahDropdown(filterText = '') {
  const query = filterText.toLowerCase().trim();
  const filtered = state.surahs.filter((s) => {
    if (!query) return true;
    return (
      s.number.toString().includes(query) ||
      s.englishName.toLowerCase().includes(query) ||
      s.englishNameTranslation.toLowerCase().includes(query) ||
      s.name.includes(query)
    );
  });

  dom.surahSelect.innerHTML = filtered
    .map(
      (s) =>
        `<option value="${s.number}">${s.number}. ${s.englishName} (${s.englishNameTranslation}) - ${s.numberOfAyahs} Ayat</option>`
    )
    .join('');

  if (state.selectedSurah) {
    dom.surahSelect.value = state.selectedSurah.number;
  }
}

function selectSurah(surahNumber, customStart = null, customEnd = null, autoPlay = false) {
  const surah = state.surahs.find((s) => s.number === parseInt(surahNumber, 10)) || {
    number: 1,
    englishName: 'Al-Faatiha',
    englishNameTranslation: 'The Opening',
    name: 'سُورَةُ ٱلْفَاتِحَةِ',
    numberOfAyahs: 7
  };
  state.selectedSurah = surah;
  if (dom.surahSelect) {
    dom.surahSelect.value = surah.number;
  }

  // In Quran Recitation mode, recite the ENTIRE selected Surah continuously from Ayah 1 to end!
  if (state.activeMode === 'quran') {
    state.startAyah = 1;
    state.endAyah = surah.numberOfAyahs;
  } else if (customStart !== null && customEnd !== null) {
    state.startAyah = Math.min(customStart, surah.numberOfAyahs);
    state.endAyah = Math.min(customEnd, surah.numberOfAyahs);
  } else {
    state.startAyah = 1;
    state.endAyah = surah.numberOfAyahs;
  }

  if (dom.startAyah) {
    dom.startAyah.max = surah.numberOfAyahs;
    dom.startAyah.value = state.startAyah;
  }
  if (dom.endAyah) {
    dom.endAyah.max = surah.numberOfAyahs;
    dom.endAyah.value = state.endAyah;
  }

  if (dom.entireSurahDescription) {
    dom.entireSurahDescription.textContent = `All ${surah.numberOfAyahs} verses of Surah ${surah.englishName} (${surah.englishNameTranslation || ''}) will be recited sequentially from Ayah 1 to completion.`;
  }

  // Reset video processing state when a new Surah is chosen
  state.isProcessingComplete = false;
  state.lastRecordedBlob = null;
  state.recordedChunks = [];
  if (dom.btnGenerateRecord) {
    dom.btnGenerateRecord.disabled = true;
    dom.btnGenerateRecord.classList.add('btn-download-disabled');
    dom.btnGenerateRecord.classList.remove('btn-download-ready');
    dom.btnRecordText.textContent = '🔒 Download (Complete Processing First)';
  }
  if (dom.directDownloadCard) {
    dom.directDownloadCard.classList.add('hidden');
  }

  fetchAyahData(autoPlay);
}

// 2. Fetch Ayahs Text (Uthmani), Transliteration, Translation, and Audio
async function fetchAyahData(autoPlayAfterLoad = false) {
  if (!state.selectedSurah) return;
  const surahId = state.selectedSurah.number;
  const reciter = state.selectedReciter || 'Husary_128kbps';

  setStatus(`Loading ${state.selectedSurah.englishName}...`, '#fbbf24');
  dom.renderStatusMessage.textContent = `Loading Surah ${state.selectedSurah.englishName}...`;

  const surahPadded = surahId.toString().padStart(3, '0');

  try {
    const multiEditionEndpoint = `https://api.alquran.cloud/v1/surah/${surahId}/editions/quran-uthmani,en.transliteration,en.sahih`;
    const res = await fetch(multiEditionEndpoint);
    const json = await res.json();

    if (json.code === 200 && json.data && json.data.length === 3) {
      const uthmaniData = json.data[0].ayahs;
      const translitData = json.data[1].ayahs;
      const translationData = json.data[2].ayahs;

      state.ayahData = [];
      for (let i = 0; i < uthmaniData.length; i++) {
        const numInSurah = uthmaniData[i].numberInSurah;
        const ayahPadded = numInSurah.toString().padStart(3, '0');
        const everyAyahUrl = `https://everyayah.com/data/Husary_128kbps/${surahPadded}${ayahPadded}.mp3`;

        state.ayahData.push({
          numberInSurah: numInSurah,
          globalAyahNumber: uthmaniData[i].number,
          arabic: uthmaniData[i].text,
          transliteration: translitData[i] ? translitData[i].text : '',
          translation: translationData[i] ? translationData[i].text : '',
          audioUrl: everyAyahUrl
        });
      }
    } else {
      throw new Error('Fallback to individual endpoints');
    }
  } catch (err) {
    console.warn('Multi-edition fetch failed, falling back:', err);
    try {
      const [uRes, trRes, enRes] = await Promise.all([
        fetch(`https://api.alquran.cloud/v1/surah/${surahId}/quran-uthmani`),
        fetch(`https://api.alquran.cloud/v1/surah/${surahId}/en.transliteration`),
        fetch(`https://api.alquran.cloud/v1/surah/${surahId}/en.sahih`)
      ]);
      const [uJson, trJson, enJson] = await Promise.all([
        uRes.json(),
        trRes.json(),
        enRes.json()
      ]);

      const count = uJson.data.ayahs.length;
      state.ayahData = [];
      for (let i = 0; i < count; i++) {
        const numInSurah = i + 1;
        const ayahPadded = numInSurah.toString().padStart(3, '0');
        const everyAyahUrl = `https://everyayah.com/data/Husary_128kbps/${surahPadded}${ayahPadded}.mp3`;

        state.ayahData.push({
          numberInSurah: numInSurah,
          globalAyahNumber: uJson.data.ayahs[i].number,
          arabic: uJson.data.ayahs[i].text,
          transliteration: trJson.data.ayahs[i] ? trJson.data.ayahs[i].text : '',
          translation: enJson.data.ayahs[i] ? enJson.data.ayahs[i].text : '',
          audioUrl: everyAyahUrl
        });
      }
    } catch (e2) {
      console.error('Failed to load ayah data completely:', e2);
      setStatus('Failed to load Quran texts.', '#ef4444');
      return;
    }
  }

  setStatus('Quran data loaded', '#10b981');
  dom.renderStatusMessage.textContent = 'Ready to preview or export 720p HD video';
  state.currentAyahIndex = 0;
  renderAyahQueue();
  drawCanvasFrame();

  if (autoPlayAfterLoad) {
    // Start playback immediately with scene on
    playAyahAudio(0);
  }
}

function getSelectedAyahSubset() {
  const start = Math.max(1, state.startAyah);
  const end = Math.min(state.ayahData.length, Math.max(start, state.endAyah));
  return state.ayahData.slice(start - 1, end);
}

function renderAyahQueue() {
  const subset = getSelectedAyahSubset();
  if (dom.ayahQueueCount) {
    dom.ayahQueueCount.textContent = `${subset.length} Ayahs selected (${state.startAyah} - ${state.endAyah})`;
  }

  if (!dom.ayahQueueContainer) return;

  dom.ayahQueueContainer.innerHTML = subset
    .map((item, idx) => {
      const isCurrent = idx === state.currentAyahIndex;
      return `
        <div class="ayah-item-card ${isCurrent ? 'current' : ''}" data-index="${idx}">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.3rem;">
            <span style="font-size:0.75rem; color:var(--gold-light); font-weight:600;">Ayah ${item.numberInSurah}</span>
            <span style="font-size:0.7rem; color:var(--text-muted);">${state.selectedSurah?.englishName || ''}</span>
          </div>
          <div class="ayah-item-arabic font-arabic">${item.arabic}</div>
          <div class="ayah-item-translit">${item.transliteration}</div>
          <div class="ayah-item-trans">${item.translation}</div>
        </div>
      `;
    })
    .join('');

  // Add click to jump to verse
  const cards = dom.ayahQueueContainer.querySelectorAll('.ayah-item-card');
  cards.forEach((card) => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.getAttribute('data-index'), 10);
      jumpToAyahIndex(idx);
    });
  });

  updateHud();
}

// ==========================================
// Reciter Metadata & Credits Knowledge Base
// ==========================================
const RECITERS_METADATA = {
  'Husary_128kbps': {
    name: 'Sheikh Mahmoud Khalil Al-Husary',
    arabicName: 'الشيخ محمود خليل الحصري',
    title: 'Grand Sheikh of Quran Masters (Public Domain)',
    origin: 'Egypt (Al-Azhar)',
    riwayah: "Hafs 'an 'Asim (Murattal)",
    style: 'Immaculate classical Tajweed with crystal-clear articulation (Copyright-Free / Public Domain)',
    avatar: '📜',
    bio: 'Renowned worldwide for precise, unhurried Tajweed that guarantees 100% YouTube Content ID claim-free uploads.',
    courtesy: 'EveryAyah Public Domain Audio Archive (Husary_128kbps)'
  },
  'ar.alafasy': {
    name: 'Sheikh Mishary Rashid Alafasy',
    arabicName: 'الشيخ مشاري بن راشد العفاسي',
    title: 'Imam & Renowned Qari',
    origin: 'Grand Mosque of Kuwait',
    riwayah: "Hafs 'an 'Asim",
    style: 'Soul-stirring Melodic Murattal with immaculate Tajweed',
    avatar: '🕌',
    bio: 'Globally celebrated for heartfelt, emotional recitations that inspire spiritual peace and deep contemplation.',
    courtesy: 'Audio recorded by EveryAyah & Al Quran Cloud API'
  },
  'ar.abdulbasitabdulsamad': {
    name: 'Sheikh AbdulBaset AbdulSamad',
    arabicName: 'الشيخ عبد الباسط عبد الصمد',
    title: 'The Golden Throat (صوت مكة)',
    origin: 'Egypt (Golden Era of Recitation)',
    riwayah: "Hafs 'an 'Asim (Murattal)",
    style: 'Majestic classical resonance with legendary breath control',
    avatar: '✨',
    bio: 'One of the most revered Quranic masters of the 20th century, inspiring Muslims across all continents.',
    courtesy: 'Egyptian Radio Archives / EveryAyah / Al Quran Cloud API'
  },
  'ar.mahermuaiqly': {
    name: 'Sheikh Maher Al-Muaiqly',
    arabicName: 'الشيخ ماهر بن حمد المعيقلي',
    title: 'Imam of Masjid al-Haram, Makkah',
    origin: 'Kingdom of Saudi Arabia (Holy Kaaba)',
    riwayah: "Hafs 'an 'Asim",
    style: 'Deep, comforting, rhythmic recitation echoing from the Kaaba',
    avatar: '🕋',
    bio: 'Beloved Imam of the Grand Mosque in Makkah whose emotional Taraweeh recitations move millions.',
    courtesy: 'Masjid al-Haram Audio Archives / Al Quran Cloud API'
  },
  'ar.minshawi': {
    name: 'Sheikh Mohamed Siddiq Al-Minshawi',
    arabicName: 'الشيخ محمد صديق المنشاوي',
    title: 'The Weeping Voice (الصوت الباكي)',
    origin: 'Egypt (Sohag)',
    riwayah: "Hafs 'an 'Asim (Murattal)",
    style: 'Profoundly moving, spiritually humble, sorrowful and reverent',
    avatar: '🕊️',
    bio: 'Famous for an intensely sincere, tearful delivery that touches the depths of the human heart.',
    courtesy: 'Audio archive courtesy of Egyptian Radio & EveryAyah'
  },
  'ar.shaatree': {
    name: 'Sheikh Abu Bakr Al-Shatri',
    arabicName: 'الشيخ أبو بكر الشاطري',
    title: 'Renowned Imam & Qari',
    origin: 'Saudi Arabia (Jeddah)',
    riwayah: "Hafs 'an 'Asim",
    style: 'Smooth, serene, deeply calming contemporary recitation',
    avatar: '🌙',
    bio: 'Known for his unique, soothing cadence that promotes inner stillness and effortless reflection.',
    courtesy: 'Audio courtesy of EveryAyah & Quran Central'
  },
  'ar.abdurrahmaansudais': {
    name: 'Sheikh Abdur-Rahman As-Sudais',
    arabicName: 'الشيخ عبد الرحمن السديس',
    title: 'Chief Imam of Masjid al-Haram, Makkah',
    origin: 'Kingdom of Saudi Arabia',
    riwayah: "Hafs 'an 'Asim",
    style: 'Passionate, powerful, unmistakable voice of the Holy Kaaba',
    avatar: '🕋',
    bio: 'Chief of the Presidency for the Two Holy Mosques, leading prayers at the Kaaba for over four decades.',
    courtesy: 'Masjid al-Haram Audio Archives / Al Quran Cloud API'
  }
};

// Clipboard Helper with Reliable Fallback and Visual Feedback
async function copyToClipboard(text, btnElement, successLabel = 'Copied!') {
  if (!text) return;
  let copied = false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      copied = true;
    }
  } catch (err) {
    console.warn('navigator.clipboard failed, attempting fallback:', err);
  }

  if (!copied) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      copied = document.execCommand('copy');
      document.body.removeChild(textarea);
    } catch (e) {
      console.error('Fallback copy failed:', e);
    }
  }

  if (btnElement) {
    const originalHtml = btnElement.innerHTML;
    btnElement.classList.add('copied');
    btnElement.innerHTML = `<span>✓</span> ${successLabel}`;
    setTimeout(() => {
      btnElement.classList.remove('copied');
      btnElement.innerHTML = originalHtml;
    }, 1800);
  }
}

// Generate Titles, Detailed Descriptions, Reciter Credits & Hashtags Kit
function generateCaptionsKit() {
  const mode = state.activeMode;
  const platform = state.captionsPlatform || 'youtube';
  const titleStyle = state.captionsTitleStyle || 'emotional';
  const reciterKey = state.selectedReciter || 'ar.alafasy';
  const reciterMeta = RECITERS_METADATA[reciterKey] || RECITERS_METADATA['ar.alafasy'];

  let title = '';
  let description = '';
  let creditsFormatted = '';
  let hashtags = [];

  if (mode === 'nature') {
    // PURE NATURE LOOP - EXCLUSIVELY FOR MIND RELAXATION & PEACEFUL ENVIRONMENTS
    // Strictly no quranic terminology per user instruction
    const mins = Math.max(1, Math.round((state.natureTargetSeconds || 300) / 60));
    const audioLabels = {
      oceanWaves: { name: 'Ocean Waves & Rhythmic Surf', emoji: '🌊', ambience: 'Deep Sleep & Calming Ocean Waves' },
      forestRain: { name: 'Peaceful Forest Rain & Soft Drops', emoji: '🌧️', ambience: 'Gentle Rain for Relaxation & Sleep' },
      mountainStream: { name: 'Babbling Mountain Stream & Forest Birds', emoji: '🏞️', ambience: 'Natural Stream Sounds for Focus & Study' },
      nightCampfire: { name: 'Warm Crackling Campfire & Night Breeze', emoji: '🔥', ambience: 'Cozy Fireplace Atmosphere for Deep Peace' },
      gentleWind: { name: 'Gentle Forest Wind & Swaying Leaves', emoji: '🍃', ambience: 'Soothing Breeze for Meditation & Stress Relief' },
      silent: { name: 'Silent Video (Pure Scenic Nature Loop)', emoji: '🔇', ambience: 'Pure Natural Visual Relaxation Loop' }
    };
    const audioInfo = audioLabels[state.natureAudioMode] || audioLabels.oceanWaves;

    if (titleStyle === 'emotional') {
      title = `${mins} Min Peaceful Nature Loop & ${audioInfo.name} 🌿 Calming Mind Relaxation, Deep Sleep & Stress Relief`;
    } else if (titleStyle === 'seo') {
      title = `${mins} Minute Mind Relaxation Video (${audioInfo.name}) | 720p HD Pure Scenic Background Loop`;
    } else {
      title = `Play this peaceful nature video to calm your mind & sleep peacefully ${audioInfo.emoji} Nature Ambiance`;
    }

    creditsFormatted = `🌿 SOUNDSCAPE & VISUAL ATTRIBUTION:
• Soundscape: ${audioInfo.emoji} ${audioInfo.name}
• Environment: ${audioInfo.ambience}
• Video Scenery: 100% Royalty-Free Nature Landscape Loop (Pexels / Licensed)
• Format: 1280x720 HD (16:9 Landscape format)
• Purpose: Pure Mind Relaxation, Peaceful Environment, Sleep & Meditation`;

    hashtags = [
      '#NatureLoop',
      '#MindRelaxation',
      '#PeacefulEnvironment',
      '#RelaxingNature',
      '#DeepSleep',
      '#CalmAmbience',
      '#StressRelief',
      '#NatureSounds',
      '#Meditation',
      '#StudyAmbience',
      '#SleepSounds',
      '#ScenicNature',
      '#PeaceOfMind',
      '#RelaxingVideo'
    ];

    if (platform === 'youtube') {
      description = `🌿 ${mins} Minutes of Pure Peaceful Nature for Mind Relaxation, Calm Environment & Deep Sleep.

Immerse yourself in clean, uninterrupted natural scenery paired with soothing ambient ${audioInfo.name.toLowerCase()}. This pure blank video loop is crafted exclusively to create a serene, peaceful environment—perfect for relaxing after a long day, deep restorative sleep, stress relief, reading, or quiet focus.

✨ VIDEO HIGHLIGHTS:
• Duration: ${mins} Minutes (${state.natureTargetSeconds || 300} seconds continuous loop)
• Visuals: Blank, uninterrupted natural scenery without distracting text or overlays
• Soundscape: ${audioInfo.emoji} ${audioInfo.name}
• Optimal Usage: Relaxation, Deep Sleep, Insomnia Relief, Meditation, Yoga, Study & Office Focus

${creditsFormatted}

💆 HOW TO USE:
Dim your room lights, set volume to a comfortable level, and let the gentle natural visuals and soothing soundscape bring calm and serenity to your mind.

If you enjoyed this peaceful ambiance, please Like, Share, and Subscribe for more relaxing nature environments!

${hashtags.join(' ')}`;
    } else if (platform === 'shorts') {
      description = `🌿 ${mins} Min Mind Relaxation Loop | ${audioInfo.name} for instant peace & deep calm. 
Take a deep breath and let the stress melt away. ✨

${creditsFormatted}

${hashtags.slice(0, 10).join(' ')}`;
    } else {
      description = `🌿 Need a moment of calm? Here is a peaceful ${mins}-minute nature loop with soothing ${audioInfo.name.toLowerCase()} for deep mind relaxation and serenity.

${creditsFormatted}

${hashtags.slice(0, 8).join(' ')}`;
    }
  } else if (mode === 'awareness') {
    // 365 DAYS QURAN SHORTS
    const dayItem = (typeof AWARENESS_365_DAYS !== 'undefined')
      ? (AWARENESS_365_DAYS.find(d => d.key === state.currentAwarenessKey) || AWARENESS_365_DAYS[0])
      : { day: 1, title: 'The Opening Dua for Guidance', surah: 'Al-Faatiha', surahNumber: 1, ayahStart: 5, ayahEnd: 6, category: 'Supplication' };

    const surahClean = (dayItem.surah || 'AlFaatiha').replace(/[^a-zA-Z]/g, '');
    const reciterTag = reciterMeta.name.replace(/Sheikh\s*/i, '').replace(/[^a-zA-Z]/g, '');

    if (titleStyle === 'emotional') {
      title = `Day ${dayItem.day}/365: The Verse That Brought Tears To My Eyes 🤲 Surah ${dayItem.surah} | ${reciterMeta.name}`;
    } else if (titleStyle === 'seo') {
      title = `Day ${dayItem.day} of 365: Surah ${dayItem.surah} (${dayItem.title}) | Recited by ${reciterMeta.name} #Shorts`;
    } else {
      title = `Stop scrolling & listen to this Quran verse right now ✨ Day ${dayItem.day} Daily Reminder`;
    }

    creditsFormatted = `🎙️ RECITER CREDITS & ATTRIBUTION:
• Qari / Reciter: ${reciterMeta.name} (${reciterMeta.arabicName})
• Role: ${reciterMeta.title} (${reciterMeta.origin})
• Riwayah: ${reciterMeta.riwayah}
• Style: ${reciterMeta.style}
• Audio Archive: ${reciterMeta.courtesy}
• Video Production: ProEase Quran Shorts Studio (9:16 Portrait HD)`;

    hashtags = [
      '#QuranShorts',
      '#DailyQuran',
      `#Surah${surahClean}`,
      `#${reciterTag}`,
      '#IslamicReminder',
      '#QuranRecitation',
      '#Islam',
      '#Muslim',
      '#QuranDaily',
      '#Peace',
      '#FYP',
      '#ViralQuran',
      '#ReelsIslam',
      '#Tajweed'
    ];

    if (platform === 'youtube' || platform === 'shorts') {
      description = `⚡ Day ${dayItem.day} of 365 Days of Quran Awareness: "${dayItem.title}"
📖 Surah ${dayItem.surah}, Verses ${dayItem.ayahStart}–${dayItem.ayahEnd || dayItem.ayahStart}

Listen to this powerful reminder recited by ${reciterMeta.name}. Take 30 seconds to reflect on this divine guidance today.

${creditsFormatted}

🤲 "Remind, for indeed the reminder benefits the believers." [Quran 51:55]
Hit Subscribe for your daily Quran reminder (365 Days Series)!

${hashtags.join(' ')}`;
    } else {
      description = `✨ Day ${dayItem.day} of 365: Surah ${dayItem.surah} • "${dayItem.title}"
Recited with beauty by ${reciterMeta.name}.

${creditsFormatted}

${hashtags.slice(0, 8).join(' ')}`;
    }
  } else {
    // QURAN RECITATION MODE - FULL CONTINUOUS SURAH
    const surah = state.selectedSurah || {
      number: 1,
      englishName: 'Al-Faatiha',
      englishNameTranslation: 'The Opening',
      name: 'سُورَةُ ٱلْفَاتِحَةِ',
      numberOfAyahs: 7,
      revelationType: 'Meccan'
    };

    const surahClean = (surah.englishName || 'AlFaatiha').replace(/[^a-zA-Z]/g, '');
    const reciterTag = reciterMeta.name.replace(/Sheikh\s*/i, '').replace(/[^a-zA-Z]/g, '');

    if (titleStyle === 'emotional') {
      title = `Heart-Melting Surah ${surah.englishName} Full Recitation | ${reciterMeta.name} 4K | Beautiful Quran For Soul 🕊️`;
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
• Bio: ${reciterMeta.bio}
• Audio Courtesy: ${reciterMeta.courtesy}`;

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
      '#Tilawat',
      '#BeautifulQuran',
      '#QuranVerses'
    ];

    if (platform === 'youtube') {
      description = `✨ Heart-Melting Complete Recitation of Surah ${surah.englishName} (${surah.englishNameTranslation || ''}) by ${reciterMeta.name}

Listen to the complete recitation of Surah ${surah.englishName} recited with immaculate Tajweed and soulful melody. May this holy recitation illuminate your heart, bring tranquility to your spirit, and fill your home with divine barakah.

📖 SURAH DETAILS:
• Surah Name: ${surah.englishName} (${surah.name || ''})
• Meaning: ${surah.englishNameTranslation || ''}
• Surah Number: ${surah.number}
• Total Verses: ${surah.numberOfAyahs} Ayahs (Full Surah Continuous)
• Revelation Type: ${surah.revelationType || 'Meccan'}

${creditsFormatted}

🎬 VIDEO PRODUCTION & TECHNICAL SPECS:
• Studio: ProEase Quran Video Studio
• Video Quality: 1280x720 HD (16:9 Landscape Format)
• Audio: 320kbps Synchronized Crystal-Clear Audio
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

// Update the Video Captions, Details & Reciter Credits UI Panel
function updateCaptionsSection() {
  if (!dom.sectionVideoCaptions) return;
  const kit = generateCaptionsKit();
  const mode = state.activeMode;

  // 1. Update Mode Badge
  if (dom.captionsModeBadge) {
    if (mode === 'nature') {
      dom.captionsModeBadge.innerHTML = '<span>🌿</span> Mind Relaxation & Peaceful Ambiance';
      dom.captionsModeBadge.style.background = 'rgba(16, 185, 129, 0.2)';
      dom.captionsModeBadge.style.color = '#6ee7b7';
      dom.captionsModeBadge.style.borderColor = 'rgba(16, 185, 129, 0.45)';
    } else if (mode === 'awareness') {
      dom.captionsModeBadge.innerHTML = '<span>⚡</span> 9:16 Shorts · Daily Awareness';
      dom.captionsModeBadge.style.background = 'rgba(245, 158, 11, 0.2)';
      dom.captionsModeBadge.style.color = '#fef08a';
      dom.captionsModeBadge.style.borderColor = 'rgba(245, 158, 11, 0.45)';
    } else {
      dom.captionsModeBadge.innerHTML = '<span>📖</span> Quran Recitation · Full Surah';
      dom.captionsModeBadge.style.background = 'rgba(245, 158, 11, 0.18)';
      dom.captionsModeBadge.style.color = 'var(--gold-light)';
      dom.captionsModeBadge.style.borderColor = 'rgba(245, 158, 11, 0.4)';
    }
  }

  // 2. Update Title input
  if (dom.captionTitleInput) {
    dom.captionTitleInput.value = kit.title;
  }

  // 3. Update Title chips active state
  if (dom.titleOptionsChips) {
    dom.titleOptionsChips.querySelectorAll('.title-chip').forEach((chip) => {
      chip.classList.toggle('active', chip.getAttribute('data-style') === (state.captionsTitleStyle || 'emotional'));
    });
  }

  // 4. Update Platform tabs active state
  if (dom.captionsPlatformTabs) {
    dom.captionsPlatformTabs.querySelectorAll('.platform-tab-btn').forEach((tab) => {
      tab.classList.toggle('active', tab.getAttribute('data-platform') === (state.captionsPlatform || 'youtube'));
    });
  }

  // 5. Update Reciter / Nature soundscape card
  if (dom.reciterCreditsLabel) {
    dom.reciterCreditsLabel.innerHTML = mode === 'nature'
      ? '<span>🌿</span> Ambient Soundscape & Visual Attribution'
      : '<span>🎙️</span> Reciter Credits & Attribution';
  }

  if (mode === 'nature') {
    const mins = Math.max(1, Math.round((state.natureTargetSeconds || 300) / 60));
    const audioLabels = {
      oceanWaves: { title: '🌊 Soothing Ocean Waves & Rhythmic Surf', desc: 'Synthesized binaural oceanic wave acoustics' },
      forestRain: { title: '🌧️ Peaceful Forest Rain & Soft Drops', desc: 'Calming pink noise acoustic rainfall on leaves' },
      mountainStream: { title: '🏞️ Babbling Mountain Stream & Forest Birds', desc: 'Resonant mountain brook and water ripple frequencies' },
      nightCampfire: { title: '🔥 Warm Crackling Campfire & Night Breeze', desc: 'Deep warm wood crackle & gentle evening wind' },
      gentleWind: { title: '🍃 Gentle Forest Wind & Swaying Leaves', desc: 'Whispering soft pine foliage and mountain airflow' },
      silent: { title: '🔇 Silent Video (Pure Scenic Nature Loop)', desc: 'Pure visual relaxation with zero audio tracks' }
    };
    const currentAudio = audioLabels[state.natureAudioMode] || audioLabels.oceanWaves;

    if (dom.reciterAvatarIcon) dom.reciterAvatarIcon.textContent = '🌿';
    if (dom.reciterCreditName) dom.reciterCreditName.textContent = currentAudio.title;
    if (dom.reciterCreditMeta) dom.reciterCreditMeta.textContent = `${currentAudio.desc} • 100% Royalty-Free Nature Visuals • Mind Relaxation & Sleep`;

    if (dom.specPillSurah) dom.specPillSurah.textContent = `🌿 ${mins} Min Mind Relaxation Loop`;
    if (dom.specPillResolution) dom.specPillResolution.textContent = '📺 1280×720 HD (16:9 Landscape)';
    if (dom.specPillAyahs) dom.specPillAyahs.textContent = '🍃 Clean Blank Video (No Overlays)';
    if (dom.specPillLicense) dom.specPillLicense.textContent = '⚖️ 100% Royalty-Free Pexels Scenery';
  } else if (mode === 'awareness') {
    const dayItem = (typeof AWARENESS_365_DAYS !== 'undefined')
      ? (AWARENESS_365_DAYS.find(d => d.key === state.currentAwarenessKey) || AWARENESS_365_DAYS[0])
      : { day: 1, title: 'The Opening Dua for Guidance', surah: 'Al-Faatiha', ayahStart: 5, category: 'Supplication' };

    if (dom.reciterAvatarIcon) dom.reciterAvatarIcon.textContent = kit.reciterMeta.avatar;
    if (dom.reciterCreditName) dom.reciterCreditName.textContent = kit.reciterMeta.name;
    if (dom.reciterCreditMeta) dom.reciterCreditMeta.textContent = `${kit.reciterMeta.title} • ${kit.reciterMeta.origin} • Riwayah ${kit.reciterMeta.riwayah} • ${kit.reciterMeta.style}`;

    if (dom.specPillSurah) dom.specPillSurah.textContent = `⚡ Day ${dayItem.day}: ${dayItem.title}`;
    if (dom.specPillResolution) dom.specPillResolution.textContent = '📱 720×1280 HD (9:16 Portrait)';
    if (dom.specPillAyahs) dom.specPillAyahs.textContent = `🔢 Surah ${dayItem.surah}:${dayItem.ayahStart}`;
    if (dom.specPillLicense) dom.specPillLicense.textContent = '⚖️ Verified Attribution';
  } else {
    const surah = state.selectedSurah || { englishName: 'Al-Faatiha', englishNameTranslation: 'The Opening', numberOfAyahs: 7 };
    if (dom.reciterAvatarIcon) dom.reciterAvatarIcon.textContent = kit.reciterMeta.avatar;
    if (dom.reciterCreditName) dom.reciterCreditName.textContent = kit.reciterMeta.name;
    if (dom.reciterCreditMeta) dom.reciterCreditMeta.textContent = `${kit.reciterMeta.title} • ${kit.reciterMeta.origin} • Riwayah ${kit.reciterMeta.riwayah} • ${kit.reciterMeta.style}`;

    if (dom.specPillSurah) dom.specPillSurah.textContent = `📖 Surah ${surah.englishName} (${surah.englishNameTranslation || ''})`;
    if (dom.specPillResolution) dom.specPillResolution.textContent = '📺 1280×720 HD (16:9 Landscape)';
    if (dom.specPillAyahs) dom.specPillAyahs.textContent = `🔢 ${surah.numberOfAyahs} Verses (Full Surah)`;
    if (dom.specPillLicense) dom.specPillLicense.textContent = '⚖️ Verified Attribution';
  }

  // 6. Update Description Textarea
  if (dom.captionDescriptionTextarea) {
    dom.captionDescriptionTextarea.value = kit.description;
  }

  // 7. Update Hashtags Container
  if (dom.hashtagsContainer) {
    dom.hashtagsContainer.innerHTML = kit.hashtags
      .map((tag) => `<span class="hashtag-pill" data-tag="${tag}">${tag}</span>`)
      .join('');

    dom.hashtagsContainer.querySelectorAll('.hashtag-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        const tag = pill.getAttribute('data-tag');
        copyToClipboard(tag, pill, 'Copied!');
      });
    });
  }
}

function updateHud() {
  const subset = getSelectedAyahSubset();
  if (state.activeMode === 'nature') {
    const mins = (state.natureTargetSeconds / 60).toFixed(0);
    dom.hudAyahInfo.innerHTML = `<span>🌿 Long Nature Loop</span> • <span>${mins} Min Target</span>`;
  } else if (state.currentAwarenessKey && AWARENESS_THEMES[state.currentAwarenessKey]) {
    const theme = AWARENESS_THEMES[state.currentAwarenessKey];
    dom.hudAyahInfo.innerHTML = `<span>${theme.bannerText}</span> • <span>${state.selectedSurah.englishName}</span>`;
  } else if (subset.length > 0 && subset[state.currentAyahIndex]) {
    const cur = subset[state.currentAyahIndex];
    dom.hudAyahInfo.innerHTML = `<span>Surah ${state.selectedSurah.englishName}</span> • <span>Ayah ${cur.numberInSurah} (${state.currentAyahIndex + 1} of ${subset.length})</span>`;
  }

  // Keep Captions & Reciter Credits metadata in sync
  updateCaptionsSection();
}

function jumpToAyahIndex(index) {
  const subset = getSelectedAyahSubset();
  if (index >= 0 && index < subset.length) {
    state.currentAyahIndex = index;
    renderAyahQueue();
    drawCanvasFrame();
    if (state.isPlaying && !state.isRecording) {
      playAyahAudio(state.currentAyahIndex);
    }
  }
}

// 3. 1080p Canvas Rendering Engine (1920x1080)
function drawCanvasFrame() {
  const canvas = dom.renderCanvas;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // A. Draw Background Video or Animated Fallback
  const video = dom.bgVideoSource;
  let videoDrawn = false;

  if (video && video.readyState >= 2 && video.videoWidth > 0 && !video.ended) {
    try {
      const vRatio = video.videoWidth / video.videoHeight;
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

      ctx.drawImage(video, drawX, drawY, drawW, drawH);
      videoDrawn = true;
    } catch (e) {
      videoDrawn = false;
    }
  }

  if (!videoDrawn) {
    drawProceduralCanvasBackground(ctx, width, height);
  }

  // Pure blank video for Nature mode:
  // "for nature loop videos, it will be just blank videos with background videos from royalty free videos,
  // nature loop videos are to upload for mind relaxation and create peaceful environments only,
  // it has nothing to do with quranic videos."
  if (state.activeMode === 'nature') {
    if (state.isPlaying || state.isRecording) {
      updateTimelineProgress();
    }
    return;
  }

  // B. Dark Vignette / Shadow Overlay across screen for text contrast
  const vignette = ctx.createRadialGradient(width / 2, height / 2, width * 0.25, width / 2, height / 2, width * 0.75);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0.15)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  // C. Top Header Badge: Awareness Banner OR Surah Pill
  drawTopHeaderPill(ctx, width);

  // D. On-Screen Dynamic Text Overlay (Lighter Glass Box & Mathematically Centered)
  if (state.activeMode === 'nature' && state.natureTextDisplay === 'pureNature') {
    // Pure nature view: No text overlay box!
  } else if (state.activeMode === 'nature' && state.natureTextDisplay === 'dhikr') {
    // Dhikr mode
    drawDhikrOverlayCard(ctx, width, height);
  } else {
    // Normal Quran Recitation Text
    const subset = getSelectedAyahSubset();
    if (subset.length > 0 && subset[state.currentAyahIndex]) {
      const currentAyah = subset[state.currentAyahIndex];
      drawAyahOverlayCard(ctx, width, height, currentAyah);
    }
  }

  // E. Bottom Audio Visualizer Bar
  drawAudioWaveforms(ctx, width, height);

  // F. Smooth Timeline Progress Update
  if (state.isPlaying || state.isRecording) {
    updateTimelineProgress();
  }
}

// Procedural background drawing with Animated Series Engine (60fps Canvas Loops)
function drawProceduralCanvasBackground(ctx, width, height) {
  const time = performance.now() * 0.001;
  const type = state.proceduralType || 'gold';

  if (type === 'animated-lanterns') {
    // Night sky with glowing golden swinging lanterns
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#030712');
    bgGrad.addColorStop(0.5, '#0f172a');
    bgGrad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Twinkling stars
    for (let i = 0; i < 45; i++) {
      const sx = ((i * 137.5) % width);
      const sy = ((i * 219.3) % (height * 0.6));
      const sAlpha = 0.3 + 0.7 * Math.abs(Math.sin(time * 2 + i));
      ctx.fillStyle = `rgba(254, 240, 138, ${sAlpha})`;
      ctx.fillRect(sx, sy, 2, 2);
    }

    // 3 Hanging Ornate Islamic Lanterns
    const lanternPositions = [
      { x: width * 0.22, cordH: height * 0.16, scale: 0.9, phase: 0 },
      { x: width * 0.5, cordH: height * 0.22, scale: 1.1, phase: 1.2 },
      { x: width * 0.78, cordH: height * 0.17, scale: 0.95, phase: 2.4 }
    ];

    lanternPositions.forEach((l) => {
      const sway = Math.sin(time * 1.4 + l.phase) * 0.04;
      ctx.save();
      ctx.translate(l.x, 0);
      ctx.rotate(sway);

      // Cord
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, l.cordH);
      ctx.stroke();

      // Lantern body
      ctx.translate(0, l.cordH);
      const s = l.scale;

      // Glow behind lantern
      const flicker = 0.4 + 0.15 * Math.sin(time * 6 + l.phase);
      const glow = ctx.createRadialGradient(0, 20 * s, 2, 0, 20 * s, 65 * s);
      glow.addColorStop(0, `rgba(251, 191, 36, ${flicker})`);
      glow.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 20 * s, 65 * s, 0, Math.PI * 2);
      ctx.fill();

      // Top Dome
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(-16 * s, 0);
      ctx.lineTo(0, -14 * s);
      ctx.lineTo(16 * s, 0);
      ctx.closePath();
      ctx.fill();

      // Glass cage
      ctx.fillStyle = 'rgba(254, 240, 138, 0.85)';
      ctx.beginPath();
      ctx.moveTo(-18 * s, 0);
      ctx.lineTo(18 * s, 0);
      ctx.lineTo(12 * s, 36 * s);
      ctx.lineTo(-12 * s, 36 * s);
      ctx.closePath();
      ctx.fill();

      // Bottom point
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.moveTo(-12 * s, 36 * s);
      ctx.lineTo(0, 48 * s);
      ctx.lineTo(12 * s, 36 * s);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    });
  } else if (type === 'animated-dunes') {
    // Starry desert night with golden undulating dunes and glowing crescent
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#020617');
    bgGrad.addColorStop(0.6, '#1e1b4b');
    bgGrad.addColorStop(1, '#451a03');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Glowing Crescent Moon at top right
    const moonX = width * 0.82;
    const moonY = height * 0.14;
    const moonGlow = ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, 55);
    moonGlow.addColorStop(0, 'rgba(254, 240, 138, 0.5)');
    moonGlow.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 55, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(moonX, moonY, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(moonX - 8, moonY - 5, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Dunes
    const duneY1 = height * 0.72;
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.moveTo(0, duneY1);
    for (let x = 0; x <= width; x += 25) {
      const y = duneY1 + Math.sin(x * 0.0035 + time * 0.4) * 35;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.fill();

    const duneY2 = height * 0.82;
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.moveTo(0, duneY2);
    for (let x = 0; x <= width; x += 25) {
      const y = duneY2 + Math.cos(x * 0.004 - time * 0.3) * 45;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.fill();
  } else if (type === 'animated-sakura') {
    // Dawn pastel anime sky with falling pink cherry petals
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#1e1b4b');
    skyGrad.addColorStop(0.4, '#4a044e');
    skyGrad.addColorStop(0.8, '#831843');
    skyGrad.addColorStop(1, '#f472b6');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Falling Sakura Petals
    ctx.fillStyle = 'rgba(251, 207, 232, 0.85)';
    for (let i = 0; i < 35; i++) {
      const px = ((i * 123 + time * 45) % (width + 60)) - 30;
      const py = ((i * 247 + time * 70) % (height + 60)) - 30;
      const rot = time * 2 + i;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (type === 'animated-cosmic') {
    // Deep cosmic space with galaxy nebula
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#020617');
    bgGrad.addColorStop(0.5, '#1e1b4b');
    bgGrad.addColorStop(1, '#09090b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Nebula swirl
    const nebX = width * 0.5 + Math.sin(time * 0.5) * 40;
    const nebY = height * 0.4 + Math.cos(time * 0.5) * 40;
    const neb = ctx.createRadialGradient(nebX, nebY, 20, nebX, nebY, width * 0.7);
    neb.addColorStop(0, 'rgba(147, 51, 234, 0.28)');
    neb.addColorStop(0.5, 'rgba(6, 182, 212, 0.15)');
    neb.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = neb;
    ctx.fillRect(0, 0, width, height);
  } else if (type === 'animated-aurora') {
    // Polar night sky with flowing emerald aurora curtains
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#020617');
    bgGrad.addColorStop(0.5, '#052e16');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Aurora ribbons
    for (let r = 0; r < 3; r++) {
      const aurY = height * (0.25 + r * 0.15);
      const aurGrad = ctx.createLinearGradient(0, aurY - 80, 0, aurY + 120);
      aurGrad.addColorStop(0, 'rgba(16, 185, 129, 0)');
      aurGrad.addColorStop(0.5, r === 1 ? 'rgba(6, 182, 212, 0.28)' : 'rgba(52, 211, 153, 0.35)');
      aurGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx.fillStyle = aurGrad;
      ctx.beginPath();
      ctx.moveTo(0, aurY);
      for (let x = 0; x <= width; x += 30) {
        const y = aurY + Math.sin(x * 0.005 + time * 1.5 + r) * 50;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.fill();
    }
  } else if (type === 'animated-particles') {
    // Sacred golden radiant particle vortex
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#030712');
    bgGrad.addColorStop(0.5, '#170c02');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    const glowX = width / 2;
    const glowY = height * 0.45;
    const coreGlow = ctx.createRadialGradient(glowX, glowY, 10, glowX, glowY, Math.min(width, height) * 0.6);
    coreGlow.addColorStop(0, 'rgba(251, 191, 36, 0.25)');
    coreGlow.addColorStop(0.5, 'rgba(217, 119, 6, 0.12)');
    coreGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = coreGlow;
    ctx.beginPath();
    ctx.arc(glowX, glowY, Math.min(width, height) * 0.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'animated-ghibli') {
    // Sunlit anime meadow with rolling green hills and floating dandelion motes
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.7);
    skyGrad.addColorStop(0, '#0284c7');
    skyGrad.addColorStop(0.6, '#38bdf8');
    skyGrad.addColorStop(1, '#bae6fd');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Drifting anime fluffy clouds
    for (let c = 0; c < 3; c++) {
      const cx = ((time * 18 + c * width * 0.38) % (width + 240)) - 120;
      const cy = height * (0.12 + c * 0.08);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.beginPath();
      ctx.arc(cx, cy, 38, 0, Math.PI * 2);
      ctx.arc(cx + 30, cy - 10, 48, 0, Math.PI * 2);
      ctx.arc(cx + 65, cy, 34, 0, Math.PI * 2);
      ctx.fill();
    }

    // Rolling emerald meadow hills
    const hillY1 = height * 0.68;
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.moveTo(0, hillY1);
    for (let x = 0; x <= width; x += 25) {
      const y = hillY1 + Math.sin(x * 0.003 + 1.2) * 45;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.fill();

    const hillY2 = height * 0.78;
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.moveTo(0, hillY2);
    for (let x = 0; x <= width; x += 25) {
      const y = hillY2 + Math.cos(x * 0.0035 + 2.5) * 35;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.fill();
  } else if (type === 'animated-oasis') {
    // Twilight desert oasis with palm silhouettes and glowing reflection
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0c0a2a');
    bgGrad.addColorStop(0.45, '#3b0764');
    bgGrad.addColorStop(0.75, '#c2410c');
    bgGrad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Glowing crescent
    const cX = width * 0.78;
    const cY = height * 0.16;
    ctx.save();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(cX, cY, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cX - 7, cY - 4, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Palm tree silhouettes
    ctx.fillStyle = '#090514';
    const trunkX = width * 0.18;
    const trunkY = height * 0.65;
    ctx.beginPath();
    ctx.moveTo(trunkX - 8, height);
    ctx.quadraticCurveTo(trunkX - 2, trunkY + 40, trunkX, trunkY);
    ctx.lineTo(trunkX + 8, trunkY);
    ctx.quadraticCurveTo(trunkX + 6, trunkY + 40, trunkX + 8, height);
    ctx.closePath();
    ctx.fill();

    // Fronds
    for (let f = 0; f < 6; f++) {
      const ang = (f * Math.PI) / 3 - 0.4;
      ctx.beginPath();
      ctx.moveTo(trunkX + 4, trunkY);
      const tipX = trunkX + 4 + Math.cos(ang) * 55;
      const tipY = trunkY + Math.sin(ang) * 35 + 10;
      ctx.quadraticCurveTo(trunkX + 4 + Math.cos(ang) * 30, trunkY - 15, tipX, tipY);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#090514';
      ctx.stroke();
    }
  } else if (type === 'animated-clouds') {
    // Pastel Twilight Cloud Drift
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#1e1b4b');
    bgGrad.addColorStop(0.5, '#701a75');
    bgGrad.addColorStop(0.85, '#d97706');
    bgGrad.addColorStop(1, '#451a03');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Drifting pastel cloud banks
    for (let b = 0; b < 4; b++) {
      const cy = height * (0.35 + b * 0.14);
      const cx = ((time * 12 * (b + 1) + b * width * 0.28) % (width + 300)) - 150;
      ctx.fillStyle = b % 2 === 0 ? 'rgba(253, 186, 116, 0.25)' : 'rgba(244, 114, 182, 0.22)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 95, 30, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === 'animated-mosque') {
    // Islamic Mosque Silhouette & Golden Twilight
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#020617');
    bgGrad.addColorStop(0.55, '#1e1b4b');
    bgGrad.addColorStop(0.85, '#92400e');
    bgGrad.addColorStop(1, '#090514');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Central Dome silhouette
    const domeCX = width / 2;
    const domeCY = height * 0.72;
    ctx.fillStyle = '#070514';
    ctx.beginPath();
    ctx.arc(domeCX, domeCY, 65, Math.PI, 0);
    ctx.lineTo(domeCX + 65, height);
    ctx.lineTo(domeCX - 65, height);
    ctx.closePath();
    ctx.fill();

    // Dome finial crescent
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(domeCX, domeCY - 65);
    ctx.lineTo(domeCX, domeCY - 82);
    ctx.stroke();

    // Minarets on sides
    [-width * 0.28, width * 0.28].forEach((offset) => {
      const mX = domeCX + offset;
      ctx.fillStyle = '#070514';
      ctx.fillRect(mX - 10, height * 0.58, 20, height * 0.42);
      ctx.beginPath();
      ctx.moveTo(mX - 13, height * 0.58);
      ctx.lineTo(mX, height * 0.52);
      ctx.lineTo(mX + 13, height * 0.58);
      ctx.closePath();
      ctx.fill();
    });
  } else if (type === 'sea') {
    const seaGrad = ctx.createLinearGradient(0, 0, 0, height);
    seaGrad.addColorStop(0, '#041629');
    seaGrad.addColorStop(0.5, '#072e4a');
    seaGrad.addColorStop(1, '#02101e');
    ctx.fillStyle = seaGrad;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(6, 182, 212, 0.08)';
    ctx.beginPath();
    ctx.moveTo(0, height * 0.65);
    for (let x = 0; x <= width; x += 30) {
      const y = height * 0.65 + Math.sin(x * 0.003 + time * 1.5) * 45;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.fill();
  } else if (type === 'forest') {
    const forestGrad = ctx.createLinearGradient(0, 0, width, height);
    forestGrad.addColorStop(0, '#051b14');
    forestGrad.addColorStop(0.5, '#092d22');
    forestGrad.addColorStop(1, '#03120d');
    ctx.fillStyle = forestGrad;
    ctx.fillRect(0, 0, width, height);
  } else {
    // Golden Sacred Aura
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#061325');
    bgGrad.addColorStop(0.5, '#0a2336');
    bgGrad.addColorStop(1, '#030d1b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
  }

  // Floating particles
  state.particles.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.alpha;
    ctx.fill();
    ctx.globalAlpha = 1.0;

    p.x += p.speedX;
    p.y += p.speedY;
    if (p.y < 0) p.y = height;
    if (p.y > height) p.y = 0;
    if (p.x < 0) p.x = width;
    if (p.x > width) p.x = 0;
  });
}

// Draw Top Header (Clean Social Shorts Kicker, Responsive to Landscape & Portrait)
function drawTopHeaderPill(ctx, width) {
  ctx.save();
  const isLandscape = width > 800;

  let title = '';
  let subtitle = '';

  if (state.showAwarenessBanner && state.currentAwarenessKey) {
    const dayItem = AWARENESS_365_MAP?.get(state.currentAwarenessKey) || AWARENESS_THEMES[state.currentAwarenessKey];
    if (dayItem) {
      title = dayItem.bannerText || dayItem.title;
    }
  } else if (state.activeMode === 'nature') {
    title = '🌿 NATURE CONTEMPLATION';
  } else if (state.selectedSurah) {
    const subset = getSelectedAyahSubset();
    const curAyahNum = subset[state.currentAyahIndex]?.numberInSurah || 1;
    title = `SURAH ${state.selectedSurah.englishName.toUpperCase()}`;
    subtitle = `VERSE ${curAyahNum} OF ${state.selectedSurah.numberOfAyahs}`;
  }

  if (title) {
    const centerX = width / 2;
    const headerY = isLandscape ? 45 : 75;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = '#fbbf24';
    ctx.font = isLandscape ? '700 16px Inter, sans-serif' : '700 15px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, centerX, headerY);

    if (subtitle) {
      ctx.fillStyle = '#cbd5e1';
      ctx.font = isLandscape ? '600 13px Inter, sans-serif' : '600 12px Inter, sans-serif';
      ctx.fillText(subtitle, centerX, headerY + (isLandscape ? 20 : 22));
    }
  }

  ctx.restore();
}

// Draw Dynamic Three-Line Quran Recitation Text (No Card Box, Wordings Highlighted, Responsive to Landscape & Portrait)
function drawAyahOverlayCard(ctx, canvasWidth, canvasHeight, ayah) {
  ctx.save();
  const isLandscape = canvasWidth > canvasHeight;

  // A. Seamless Cinematic Scrim (NO harsh box border - video background shines through edge-to-edge)
  const contrast = (state.boxLightness || 65) / 100;
  const scrimTop = isLandscape ? canvasHeight * 0.16 : canvasHeight * 0.28;
  const scrimBottom = isLandscape ? canvasHeight * 0.90 : canvasHeight * 0.86;
  const scrim = ctx.createLinearGradient(0, scrimTop, 0, scrimBottom);
  scrim.addColorStop(0, 'rgba(0, 0, 0, 0)');
  scrim.addColorStop(0.2, `rgba(0, 0, 0, ${0.45 * contrast + 0.1})`);
  scrim.addColorStop(0.5, `rgba(0, 0, 0, ${0.68 * contrast + 0.15})`);
  scrim.addColorStop(0.8, `rgba(0, 0, 0, ${0.45 * contrast + 0.1})`);
  scrim.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, scrimTop, canvasWidth, scrimBottom - scrimTop);

  // B. Mathematical Vertical and Horizontal Layout
  const maxTextWidth = isLandscape ? Math.min(canvasWidth * 0.85, 1020) : Math.min(canvasWidth * 0.86, 600);
  const centerX = canvasWidth / 2;

  // 1. Measure Arabic lines & height
  const arabicFontSize = state.fontSizeArabic || (isLandscape ? 44 : 38);
  ctx.font = `bold ${arabicFontSize}px 'Amiri', 'Scheherazade New', serif`;
  const verseMarker = `  ۝${toArabicNumerals(ayah.numberInSurah)}`;
  const arabicWithVerseNumber = `${ayah.arabic}${verseMarker}`;
  const arabicLines = wrapText(ctx, arabicWithVerseNumber, maxTextWidth);
  const arabicLineHeight = Math.round(arabicFontSize * 1.55);
  const arabicTotalH = arabicLines.length * arabicLineHeight;

  // 2. Measure Transliteration lines & height
  const translitFontSize = isLandscape ? 22 : 20;
  ctx.font = `italic 600 ${translitFontSize}px 'Inter', sans-serif`;
  const translitLines = wrapText(ctx, `"${ayah.transliteration}"`, maxTextWidth).slice(0, 4);
  const translitLineHeight = isLandscape ? 30 : 28;
  const translitTotalH = translitLines.length * translitLineHeight;

  // 3. Measure Translation lines & height
  const transFontSize = isLandscape ? 20 : 18;
  ctx.font = `500 ${transFontSize}px 'Inter', sans-serif`;
  const transLines = wrapText(ctx, ayah.translation, maxTextWidth).slice(0, 5);
  const transLineHeight = isLandscape ? 28 : 26;
  const transTotalH = transLines.length * transLineHeight;

  // Spacing constants
  const dividerH = isLandscape ? 24 : 28;
  const gapBetween = isLandscape ? 14 : 18;
  const totalContentHeight = arabicTotalH + dividerH + translitTotalH + gapBetween + transTotalH;

  // Compute start Y position
  let currentY = Math.round((canvasHeight - totalContentHeight) / 2 + (isLandscape ? 16 : 10));

  // Audio progress
  let progress = 0;
  if (state.isPlaying && state.audioContext && state.currentAyahAudioStartTime > 0 && state.currentAyahDuration > 0) {
    const elapsed = Math.max(0, state.audioContext.currentTime - state.currentAyahAudioStartTime);
    progress = Math.min(0.999, elapsed / state.currentAyahDuration);
  }
  const activeLineIdx = state.isPlaying ? Math.min(arabicLines.length - 1, Math.floor(progress * arabicLines.length)) : 0;
  const theme = state.overlayTheme || 'goldGlow';

  // C. Render Arabic Lines with Highlighted Wordings
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  for (let i = 0; i < arabicLines.length; i++) {
    const isLineActive = (i === activeLineIdx && state.isPlaying) || theme === 'goldGlow';
    const lineStr = arabicLines[i];
    const lineMeasure = ctx.measureText(lineStr);

    // Glowing highlight capsule behind active wording
    if (isLineActive) {
      const pillW = Math.min(maxTextWidth + 40, lineMeasure.width + 48);
      const pillX = (canvasWidth - pillW) / 2;
      const pillY = currentY - 4;
      const highlightGlow = ctx.createLinearGradient(pillX, 0, pillX + pillW, 0);
      highlightGlow.addColorStop(0, 'rgba(251, 191, 36, 0)');
      highlightGlow.addColorStop(0.5, 'rgba(251, 191, 36, 0.28)');
      highlightGlow.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = highlightGlow;
      roundRect(ctx, pillX, pillY, pillW, arabicLineHeight - 4, 14, true, false);
    }

    // Highlighted Arabic calligraphy with glowing luminous halo
    ctx.font = `bold ${arabicFontSize}px 'Amiri', 'Scheherazade New', serif`;
    if (isLineActive) {
      ctx.fillStyle = '#fde047'; // Radiant highlighted gold
      ctx.shadowColor = 'rgba(251, 191, 36, 0.95)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 2;
    } else {
      ctx.fillStyle = '#ffffff'; // Pure luminous white
      ctx.shadowColor = 'rgba(0, 0, 0, 0.98)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 2;
    }

    ctx.fillText(lineStr, centerX, currentY);
    currentY += arabicLineHeight;
  }

  // D. Render Decorative Center Divider Line with Center Gem
  currentY += isLandscape ? 6 : 8;
  const dividerW = isLandscape ? 360 : 280;
  const dividerGrad = ctx.createLinearGradient(centerX - dividerW / 2, 0, centerX + dividerW / 2, 0);
  dividerGrad.addColorStop(0, 'rgba(251, 191, 36, 0)');
  dividerGrad.addColorStop(0.5, 'rgba(251, 191, 36, 0.95)');
  dividerGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = dividerGrad;
  ctx.fillRect(centerX - dividerW / 2, currentY + 6, dividerW, 2);

  // Center diamond emblem
  ctx.fillStyle = '#fbbf24';
  ctx.font = '600 13px Inter, sans-serif';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 8;
  ctx.fillText('◈', centerX, currentY + 2);
  currentY += dividerH;

  // E. Render Line 2: English Transliteration (Highlighted Warm Amber Gold)
  ctx.font = `italic 600 ${translitFontSize}px 'Inter', sans-serif`;
  ctx.fillStyle = '#fef08a';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 2;

  for (let i = 0; i < translitLines.length; i++) {
    ctx.fillText(translitLines[i], centerX, currentY);
    currentY += translitLineHeight;
  }

  currentY += gapBetween;

  // F. Render Line 3: English Translation (Highlighted Crisp Pure White)
  ctx.font = `500 ${transFontSize}px 'Inter', sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.98)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 2;

  for (let i = 0; i < transLines.length; i++) {
    ctx.fillText(transLines[i], centerX, currentY);
    currentY += transLineHeight;
  }

  ctx.restore();
}

// Draw Peaceful Dhikr Overlay (No Box, Highlighted Wordings for Long Nature Loops)
function drawDhikrOverlayCard(ctx, canvasWidth, canvasHeight) {
  const centerX = canvasWidth / 2;
  const maxTextWidth = 600;

  ctx.save();

  // Subtle seamless scrim behind text
  const contrast = (state.boxLightness || 65) / 100;
  const scrim = ctx.createLinearGradient(0, canvasHeight * 0.32, 0, canvasHeight * 0.82);
  scrim.addColorStop(0, 'rgba(0, 0, 0, 0)');
  scrim.addColorStop(0.3, `rgba(0, 0, 0, ${0.45 * contrast + 0.1})`);
  scrim.addColorStop(0.5, `rgba(0, 0, 0, ${0.65 * contrast + 0.15})`);
  scrim.addColorStop(0.7, `rgba(0, 0, 0, ${0.45 * contrast + 0.1})`);
  scrim.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, canvasHeight * 0.32, canvasWidth, canvasHeight * 0.5);

  const dhikr = DHIKR_LIST[state.dhikrIndex % DHIKR_LIST.length];
  let currentY = Math.round(canvasHeight * 0.44);

  // Arabic Dhikr (Large, Highlighted Radiant Gold)
  ctx.font = "bold 48px 'Amiri', 'Scheherazade New', serif";
  ctx.fillStyle = '#fde047';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(251, 191, 36, 0.95)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 2;
  ctx.fillText(dhikr.arabic, centerX, currentY);
  currentY += 78;

  // Divider
  const divW = 260;
  const divGrad = ctx.createLinearGradient(centerX - divW / 2, 0, centerX + divW / 2, 0);
  divGrad.addColorStop(0, 'rgba(251, 191, 36, 0)');
  divGrad.addColorStop(0.5, 'rgba(251, 191, 36, 0.95)');
  divGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = divGrad;
  ctx.fillRect(centerX - divW / 2, currentY + 6, divW, 2);
  currentY += 32;

  // Transliteration (Highlighted Warm Gold)
  ctx.font = "italic 600 23px 'Inter', sans-serif";
  ctx.fillStyle = '#fef08a';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 2;
  ctx.fillText(`"${dhikr.transliteration}"`, centerX, currentY);
  currentY += 46;

  // Translation (Highlighted Pure White)
  ctx.font = "500 20px 'Inter', sans-serif";
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.98)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 2;
  const transLines = wrapText(ctx, dhikr.translation, maxTextWidth);
  for (let i = 0; i < transLines.length; i++) {
    ctx.fillText(transLines[i], centerX, currentY);
    currentY += 30;
  }

  ctx.restore();
}

// Convert English digits to Eastern Arabic digits for verse end symbol
function toArabicNumerals(num) {
  const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num
    .toString()
    .split('')
    .map((d) => digits[parseInt(d, 10)] || d)
    .join('');
}

// Text wrapping algorithm for canvas
function wrapText(ctx, text, maxWidth) {
  if (!text) return [];
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];

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
  if (currentLine) lines.push(currentLine);
  return lines;
}

// Canvas Rounded Rectangle helper
function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

// Draw Audio Waveforms Visualizer Bar (Positioned for 9:16 Portrait Shorts)
function drawAudioWaveforms(ctx, width, height) {
  const barCount = 36;
  const barWidth = 6;
  const barGap = 6;
  const totalW = barCount * (barWidth + barGap);
  const startX = (width - totalW) / 2;
  const baseY = height - 90;
  const isAudioActive = state.isPlaying || state.isRecording;
  const time = performance.now() * 0.005;

  ctx.save();
  for (let i = 0; i < barCount; i++) {
    let barH = 5;
    if (isAudioActive) {
      const wave = Math.sin(time + i * 0.35) * Math.cos(time * 0.7 + i * 0.2);
      barH = Math.max(5, Math.abs(wave) * 36);
    }
    const x = startX + i * (barWidth + barGap);
    const y = baseY - barH;

    const grad = ctx.createLinearGradient(0, y, 0, baseY);
    grad.addColorStop(0, '#fbbf24');
    grad.addColorStop(1, 'rgba(16, 185, 129, 0.8)');
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, barWidth, barH, 3, true, false);
  }
  ctx.restore();
}

// 4. Video & Audio Playback Synchronization Engine
function startRenderLoop() {
  if (state.animationFrameId) cancelAnimationFrame(state.animationFrameId);

  const loop = (timestamp) => {
    checkMultiSceneTransition(timestamp);
    checkTargetDurationLimit(timestamp);
    checkDhikrTransition(timestamp);
    drawCanvasFrame();
    state.animationFrameId = requestAnimationFrame(loop);
  };
  state.animationFrameId = requestAnimationFrame(loop);
}

// Check Dhikr rotation in Long Nature Loop mode
function checkDhikrTransition(now) {
  if (state.activeMode !== 'nature' || state.natureTextDisplay !== 'dhikr') return;
  if (!state.lastDhikrSwitchTime) state.lastDhikrSwitchTime = now;
  if (now - state.lastDhikrSwitchTime > 12000) {
    state.lastDhikrSwitchTime = now;
    state.dhikrIndex = (state.dhikrIndex + 1) % DHIKR_LIST.length;
  }
}

// Multi-Scene Auto-Transitioning (Switch camera views every X seconds so viewers never get bored)
function checkMultiSceneTransition(now) {
  const cycleIntervalSec = state.activeMode === 'nature' ? state.natureCycleSpeed : 12;
  if (cycleIntervalSec <= 0) return; // Single Scene Loop
  if (!state.isPlaying && !state.isRecording) return;

  if (!state.lastSceneSwitchTime) {
    state.lastSceneSwitchTime = now;
    return;
  }

  if (now - state.lastSceneSwitchTime > cycleIntervalSec * 1000) {
    state.lastSceneSwitchTime = now;
    const candidates = PRESET_VIDEOS.filter(
      (v) => !v.videoUrl.startsWith('procedural') && (state.selectedCategory === 'all' || v.category === state.selectedCategory)
    );

    if (candidates.length > 1) {
      state.sceneIndex = (state.sceneIndex + 1) % candidates.length;
      const nextVid = candidates[state.sceneIndex];
      if (nextVid && nextVid.videoUrl !== state.currentBackgroundVideoUrl) {
        loadBackgroundVideo(nextVid.videoUrl);
        if (dom.presetGrid) {
          dom.presetGrid.querySelectorAll('.preset-item').forEach((el) => {
            if (el.getAttribute('data-url') === nextVid.videoUrl) {
              el.classList.add('active');
            } else {
              el.classList.remove('active');
            }
          });
        }
      }
    }
  }
}

// Check Target Video Duration Limit
function checkTargetDurationLimit(now) {
  if (!state.isRecording || !state.totalTargetSeconds) return;
  if (!state.playbackStartTime) return;

  const elapsedSec = (now - state.playbackStartTime) / 1000;
  const elapsedFmt = formatTime(elapsedSec);
  const targetFmt = formatTime(state.totalTargetSeconds);

  if (dom.hudRecTime) {
    dom.hudRecTime.textContent = `REC ${elapsedFmt} / ${targetFmt}`;
  }

  if (elapsedSec >= state.totalTargetSeconds) {
    onSequenceFinished();
  }
}

// 365 Days Curated Quran Awareness Shorts System (Curated Daily Social Posting)
const AWARENESS_365_MAP = new Map(AWARENESS_365_DAYS.map((d) => [d.key, d]));

function getFiltered365Days() {
  const query = (state.awarenessSearchQuery || '').toLowerCase().trim();
  const cat = state.awarenessSelectedCategory || 'all';

  return AWARENESS_365_DAYS.filter((item) => {
    // Category match
    if (cat !== 'all') {
      if (cat === 'animated') {
        if (item.backgroundCategory !== 'animated' && !item.videoUrl.startsWith('animated')) return false;
      } else if (item.category !== cat) {
        return false;
      }
    }
    // Search match
    if (query) {
      const matchDay = item.day.toString() === query || query === `day ${item.day}` || query === `day${item.day}`;
      const matchTitle = item.title.toLowerCase().includes(query);
      const matchSurah = item.surahName.toLowerCase().includes(query);
      const matchQuote = item.quote.toLowerCase().includes(query);
      return matchDay || matchTitle || matchSurah || matchQuote;
    }
    return true;
  });
}

function renderAwareness365() {
  if (!dom.awarenessGrid) return;
  const filtered = getFiltered365Days();
  const perPage = 12;
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  state.awarenessPage = Math.min(Math.max(1, state.awarenessPage || 1), totalPages);

  const startIdx = (state.awarenessPage - 1) * perPage;
  const pageItems = filtered.slice(startIdx, startIdx + perPage);

  if (dom.awarenessDayCountBadge) {
    dom.awarenessDayCountBadge.textContent = `${filtered.length} / 365 Days`;
  }
  if (dom.awarenessPageInfo) {
    const endDisplay = Math.min(startIdx + perPage, filtered.length);
    dom.awarenessPageInfo.textContent = filtered.length > 0 
      ? `Showing Days ${startIdx + 1}–${endDisplay} of ${filtered.length}`
      : 'No days found matching search';
  }
  if (dom.awarenessPageNumber) {
    dom.awarenessPageNumber.textContent = `Page ${state.awarenessPage} of ${totalPages}`;
  }

  if (pageItems.length === 0) {
    dom.awarenessGrid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 1.5rem; text-align: center; color: var(--text-secondary); background: rgba(0,0,0,0.2); border-radius: 10px;">
        <p style="margin-bottom:0.5rem; font-weight:600; color:#fef08a;">No awareness days match "${state.awarenessSearchQuery}"</p>
        <p style="font-size:0.75rem;">Try searching for "Day 1", "patience", "mercy", "jannah", or choose a category above.</p>
      </div>
    `;
    return;
  }

  dom.awarenessGrid.innerHTML = pageItems
    .map((item) => {
      const isActive = state.currentAwarenessKey === item.key;
      const isAnimated = item.backgroundCategory === 'animated' || item.videoUrl.startsWith('animated');
      const badgeIcon = isAnimated ? '🎨 Animated' : '🌊 Cinematic';

      return `
        <button class="awareness-card ${isActive ? 'active-theme' : ''}" data-day="${item.day}" data-theme="${item.key}">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem;">
            <span class="awareness-day-badge">DAY ${item.day} / 365</span>
            <span style="font-size:0.65rem; color:#6ee7b7; font-weight:600;">${badgeIcon}</span>
          </div>
          <div class="awareness-header" style="color: #fde047;">
            ${item.title.replace(`DAY ${item.day} • `, '')}
          </div>
          <div class="awareness-verse">${item.surahName} (${item.surahNumber}:${item.startAyah}${item.endAyah > item.startAyah ? `-${item.endAyah}` : ''})</div>
          <div class="awareness-snippet">"${item.quote}"</div>
          <span class="awareness-badge">${isAnimated ? '🎨 ' + item.videoUrl.replace('animated-', '').toUpperCase() : '🎬 9:16 Shorts Ready'}</span>
        </button>
      `;
    })
    .join('');

  dom.awarenessGrid?.querySelectorAll('.awareness-card').forEach((card) => {
    card.addEventListener('click', () => {
      const dayNum = parseInt(card.getAttribute('data-day'), 10);
      const dayItem = AWARENESS_365_DAYS.find((d) => d.day === dayNum);
      if (dayItem) {
        applyAwarenessDay(dayItem);
      }
    });
  });
}

async function applyAwarenessDay(item) {
  state.currentAwarenessKey = item.key;
  state.awarenessCurrentDay = item.day;

  // Highlight card
  if (dom.awarenessGrid) {
    dom.awarenessGrid.querySelectorAll('.awareness-card').forEach((c) => {
      c.classList.toggle('active-theme', c.getAttribute('data-theme') === item.key);
    });
  }

  // Ensure 9:16 Portrait Shorts resolution (720x1280)
  setCanvasDimensions(720, 1280);

  setStatus(`Loaded Day ${item.day} / 365: ${item.title}...`, '#fbbf24');
  dom.renderStatusMessage.textContent = `⚡ Day ${item.day}/365: ${item.title} • Click "Process & Play Video" to record`;

  // Reset completion state so download is only available after full processing
  state.isProcessingComplete = false;
  state.lastRecordedBlob = null;
  if (dom.btnGenerateRecord) {
    dom.btnGenerateRecord.disabled = true;
    dom.btnGenerateRecord.classList.add('btn-download-disabled');
    dom.btnGenerateRecord.classList.remove('btn-download-ready');
    dom.btnRecordText.textContent = '🔒 Download (Complete Processing First)';
  }
  if (dom.directDownloadCard) {
    dom.directDownloadCard.classList.add('hidden');
  }

  // 1. Select Surah & Range
  selectSurah(item.surahNumber, item.startAyah, item.endAyah, false);

  // 2. Set overlay theme
  state.overlayTheme = item.themeStyle || 'goldGlow';
  if (dom.overlayTheme) {
    dom.overlayTheme.value = state.overlayTheme;
  }

  // 3. Set matching animated or cinematic video background
  loadBackgroundVideo(item.videoUrl);

  // 4. Update HUD
  updateHud();
}

// Apply Curated Thematic Awareness Shorts (Backwards Compatible)
async function applyAwarenessTheme(themeKey) {
  const dayItem = AWARENESS_365_MAP.get(themeKey);
  if (dayItem) {
    applyAwarenessDay(dayItem);
    return;
  }
  const legacy = AWARENESS_THEMES[themeKey];
  if (!legacy) return;

  state.currentAwarenessKey = themeKey;
  setCanvasDimensions(720, 1280); // 9:16 Portrait for Shorts

  // Highlight card
  document.querySelectorAll('.awareness-card').forEach((c) => {
    if (c.getAttribute('data-theme') === themeKey) {
      c.classList.add('active-theme');
    } else {
      c.classList.remove('active-theme');
    }
  });

  setStatus(`Loading Awareness Short: ${legacy.title}...`, '#fbbf24');
  dom.renderStatusMessage.textContent = `⚡ Active Theme: ${legacy.title}`;

  selectSurah(legacy.surahNumber, legacy.startAyah, legacy.endAyah, false);

  state.overlayTheme = legacy.themeStyle;
  if (dom.overlayTheme) {
    dom.overlayTheme.value = legacy.themeStyle;
  }

  loadBackgroundVideo(legacy.videoUrl);
  updateHud();
}

// Audio Buffer Cache for Zero-CORS, Studio-Quality Web Audio Playback
const audioBufferCache = new Map();

async function getAyahAudioBuffer(rawUrl) {
  if (audioBufferCache.has(rawUrl)) {
    return audioBufferCache.get(rawUrl);
  }
  setupAudioContext();

  const fetchUrl = rawUrl.startsWith('http')
    ? `/api/proxy?url=${encodeURIComponent(rawUrl)}`
    : rawUrl;

  try {
    const res = await fetch(fetchUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arrayBuf = await res.arrayBuffer();
    const audioBuf = await state.audioContext.decodeAudioData(arrayBuf);
    audioBufferCache.set(rawUrl, audioBuf);
    return audioBuf;
  } catch (err) {
    console.warn('Proxy fetch failed, attempting direct fetch:', err);
    const res = await fetch(rawUrl);
    if (!res.ok) throw new Error(`Audio request failed (HTTP ${res.status})`);
    const arrayBuf = await res.arrayBuffer();
    const audioBuf = await state.audioContext.decodeAudioData(arrayBuf);
    audioBufferCache.set(rawUrl, audioBuf);
    return audioBuf;
  }
}

// Play single Ayah Audio with Web Audio API (Directly Routed to Destination Stream & Speakers)
async function playAyahAudio(index) {
  const generation = state.playbackGeneration;
  const subset = getSelectedAyahSubset();
  if (index < 0 || index >= subset.length) {
    onSequenceFinished();
    return;
  }

  state.currentAyahIndex = index;
  renderAyahQueue();
  updateHud();

  const currentAyah = subset[index];
  if (!currentAyah || !currentAyah.audioUrl) {
    stopPlayback();
    setStatus('Audio URL missing. Recording stopped without skipping the verse.', '#ef4444');
    return;
  }

  setupAudioContext();

  // Stop previous buffer source if playing
  if (state.currentBufferSource) {
    try {
      state.currentBufferSource.onended = null;
      state.currentBufferSource.stop();
      state.currentBufferSource.disconnect();
    } catch (e) {}
    state.currentBufferSource = null;
  }

  dom.btnPlayText.textContent = 'Stop Video';
  dom.btnPreviewPlay.classList.add('btn-secondary');
  state.isPlaying = true;

  if (state.isRecording) {
    const totalAyahs = subset.length;
    const pct = Math.round(((index + 1) / totalAyahs) * 100);
    dom.btnRecordText.textContent = `⏳ Processing: Verse ${index + 1}/${totalAyahs} (${pct}%)...`;
    dom.renderStatusMessage.textContent = `🔴 Processing video: Verse ${index + 1} of ${totalAyahs} (${pct}%) • Full sequence must complete before download`;
    dom.btnGenerateRecord.disabled = true;
    dom.btnGenerateRecord.classList.add('btn-download-disabled');
    dom.btnGenerateRecord.classList.remove('btn-download-ready');
    if (dom.directDownloadCard) {
      dom.directDownloadCard.classList.add('hidden');
    }
  } else {
    dom.renderStatusMessage.textContent = `▶ Ayah ${index + 1} of ${subset.length} • Playing...`;
  }

  try {
    const audioBuffer = await getAyahAudioBuffer(currentAyah.audioUrl);
    if (!state.isPlaying || generation !== state.playbackGeneration) return;

    const source = state.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    const speed = state.processingSpeed || 1.0;
    source.playbackRate.setValueAtTime(speed, state.audioContext.currentTime);

    // Connect to BOTH the user's speakers AND the recording stream destination!
    source.connect(state.audioDestinationNode);
    source.connect(state.audioContext.destination);

    state.currentBufferSource = source;
    state.currentAyahDuration = audioBuffer.duration / speed;
    state.currentAyahAudioStartTime = state.audioContext.currentTime;

    source.onended = () => {
      if (state.isPlaying) {
        playAyahAudio(index + 1);
      }
    };

    source.start(0);

    if (dom.bgVideoSource && dom.bgVideoSource.paused) {
      dom.bgVideoSource.play().catch(() => {});
    }
  } catch (err) {
    if (generation !== state.playbackGeneration) return;
    console.error('Play audio failed:', err);
    stopPlayback();
    setStatus('Audio could not be loaded. Please retry; no verses were skipped.', '#ef4444');
  }
}

function updateTimelineProgress() {
  if (state.activeMode === 'nature') {
    const targetDuration = state.natureTargetSeconds || 300;
    const elapsed = Math.max(0, (performance.now() - (state.playbackStartTime || performance.now())) / 1000);
    const progressRatio = Math.min(1, elapsed / targetDuration);

    if (dom.timelineFill) dom.timelineFill.style.width = `${Math.min(100, Math.max(0, progressRatio * 100))}%`;
    if (dom.timeCurrent) dom.timeCurrent.textContent = formatTime(elapsed);
    if (dom.timeTotal) dom.timeTotal.textContent = formatTime(targetDuration);

    if (state.isRecording) {
      if (dom.hudRecTime) dom.hudRecTime.textContent = `REC ${formatTime(elapsed)} / ${formatTime(targetDuration)}`;
      if (dom.renderStatusMessage) {
        dom.renderStatusMessage.textContent = `🔴 Recording pure blank nature video (${formatTime(elapsed)} / ${formatTime(targetDuration)})`;
      }
    }

    // Dynamic scene / camera angle cycle
    if (state.natureCycleSpeed > 0 && state.isPlaying) {
      const timeSinceLastSwitch = (performance.now() - (state.lastSceneSwitchTime || performance.now())) / 1000;
      if (timeSinceLastSwitch >= state.natureCycleSpeed) {
        cycleNextNatureScene();
        state.lastSceneSwitchTime = performance.now();
      }
    }

    // Auto-finish and trigger direct download once target duration is reached
    if (state.isRecording && elapsed >= targetDuration) {
      onSequenceFinished();
    }
    return;
  }

  const subset = getSelectedAyahSubset();
  if (!subset.length) return;

  const currentDuration = state.currentAyahDuration || 5;
  let elapsed = 0;
  if (state.isPlaying && state.audioContext && state.currentAyahAudioStartTime > 0) {
    elapsed = Math.max(0, state.audioContext.currentTime - state.currentAyahAudioStartTime);
  }
  elapsed = Math.min(currentDuration, elapsed);

  const totalAyahs = subset.length;
  const progressRatio = (state.currentAyahIndex + elapsed / currentDuration) / totalAyahs;

  dom.timelineFill.style.width = `${Math.min(100, Math.max(0, progressRatio * 100))}%`;
  dom.timeCurrent.textContent = formatTime(elapsed);
  dom.timeTotal.textContent = formatTime(currentDuration);

  if (state.isRecording) {
    const totalElapsedSec = (performance.now() - state.playbackStartTime) / 1000;
    dom.hudRecTime.textContent = `PROCESSING ${formatTime(totalElapsedSec)}`;
  }
}

// Automatically cycle to the next curated nature background scene
function cycleNextNatureScene() {
  if (state.activeMode !== 'nature') return;
  const list = NATURE_PRESET_VIDEOS;
  if (!list.length) return;
  state.sceneIndex = ((state.sceneIndex || 0) + 1) % list.length;
  const nextVideo = list[state.sceneIndex];
  if (nextVideo && nextVideo.videoUrl) {
    loadBackgroundVideo(nextVideo.videoUrl);
    if (dom.naturePresetGrid) {
      dom.naturePresetGrid.querySelectorAll('.preset-item').forEach((el) => {
        el.classList.toggle('active-nature', el.getAttribute('data-url') === nextVideo.videoUrl);
      });
    }
  }
}

// Web Audio Ambient Synthesizer for Nature Relaxation Loops
function startNatureAmbientAudio(mode = 'oceanWaves') {
  setupAudioContext();
  stopNatureAmbientAudio();

  if (mode === 'silent') return;

  const ctx = state.audioContext;
  const sampleRate = ctx.sampleRate;
  state.natureActiveNodes = [];

  if (mode === 'oceanWaves') {
    // Lowpass pink/brown noise modulated by 0.1Hz LFO to emulate rolling ocean surf
    const bufferSize = sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99 * b0 + white * 0.05;
      b1 = 0.95 * b1 + white * 0.09;
      b2 = 0.85 * b2 + white * 0.15;
      output[i] = (b0 + b1 + b2) * 0.35;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, ctx.currentTime);

    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.1, ctx.currentTime);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(240, ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.7, ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(state.audioDestinationNode);
    gain.connect(ctx.destination);

    whiteNoise.start();
    lfo.start();
    state.natureActiveNodes.push(whiteNoise, lfo);
  } else if (mode === 'forestRain') {
    // Bandpass pink noise for gentle rain shower
    const bufferSize = sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.22;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100, ctx.currentTime);
    filter.Q.setValueAtTime(0.85, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.6, ctx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(state.audioDestinationNode);
    gain.connect(ctx.destination);

    noise.start();
    state.natureActiveNodes.push(noise);
  } else if (mode === 'mountainStream') {
    // Flowing water stream + periodic high-frequency chirping forest birds
    const bufferSize = sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.25;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(850, ctx.currentTime);
    filter.Q.setValueAtTime(1.1, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, ctx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(state.audioDestinationNode);
    gain.connect(ctx.destination);

    noise.start();
    state.natureActiveNodes.push(noise);

    // Occasional gentle soft birdsong synthesizer
    state.birdInterval = setInterval(() => {
      if (!state.isPlaying || state.activeMode !== 'nature') return;
      try {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        const now = ctx.currentTime;
        const startFreq = 2600 + Math.random() * 800;
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(startFreq * 1.25, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(startFreq * 0.9, now + 0.16);

        oscGain.gain.setValueAtTime(0.001, now);
        oscGain.gain.linearRampToValueAtTime(0.04, now + 0.03);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(oscGain);
        oscGain.connect(state.audioDestinationNode);
        oscGain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.25);
      } catch (e) {}
    }, 4500);
  } else if (mode === 'nightCampfire') {
    // Low frequency warm drone with occasional crackle pops
    const bufferSize = sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.15;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.65, ctx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(state.audioDestinationNode);
    gain.connect(ctx.destination);

    noise.start();
    state.natureActiveNodes.push(noise);

    // Random campfire crackles
    state.crackleInterval = setInterval(() => {
      if (!state.isPlaying || state.activeMode !== 'nature') return;
      try {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        const now = ctx.currentTime;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600 + Math.random() * 1200, now);

        oscGain.gain.setValueAtTime(0.05, now);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

        osc.connect(oscGain);
        oscGain.connect(state.audioDestinationNode);
        oscGain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.05);
      } catch (e) {}
    }, 350);
  } else if (mode === 'gentleWind') {
    // Soft sweeping wind breeze through pines
    const bufferSize = sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.2;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320, ctx.currentTime);
    filter.Q.setValueAtTime(1.5, ctx.currentTime);

    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.06, ctx.currentTime);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(180, ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.65, ctx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(state.audioDestinationNode);
    gain.connect(ctx.destination);

    noise.start();
    lfo.start();
    state.natureActiveNodes.push(noise, lfo);
  }
}

function stopNatureAmbientAudio() {
  if (state.birdInterval) {
    clearInterval(state.birdInterval);
    state.birdInterval = null;
  }
  if (state.crackleInterval) {
    clearInterval(state.crackleInterval);
    state.crackleInterval = null;
  }
  if (state.natureActiveNodes && state.natureActiveNodes.length) {
    state.natureActiveNodes.forEach((node) => {
      try {
        node.stop();
        node.disconnect();
      } catch (e) {}
    });
    state.natureActiveNodes = [];
  }
  if (state.natureAudioNode) {
    try {
      state.natureAudioNode.stop();
      state.natureAudioNode.disconnect();
    } catch (e) {}
    state.natureAudioNode = null;
  }
}

function setupAudioContext() {
  if (!state.audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    state.audioContext = new AudioCtx();
    state.audioDestinationNode = state.audioContext.createMediaStreamDestination();
  }
  if (state.audioContext.state === 'suspended') {
    state.audioContext.resume().catch(error => setStatus('Enable audio playback in your browser: ' + error.message, '#ef4444'));
  }
}

function stopPlayback() {
  state.playbackGeneration++;
  state.isPreparing = false;
  state.pendingAutoDownload = false;
  state.isPlaying = false;
  if (state.currentBufferSource) {
    try {
      state.currentBufferSource.onended = null;
      state.currentBufferSource.stop();
      state.currentBufferSource.disconnect();
    } catch (e) {}
    state.currentBufferSource = null;
  }
  stopNatureAmbientAudio();

  const isQuran = state.activeMode === 'quran';
  dom.btnPlayText.textContent = isQuran ? 'Process & Play Recitation (16:9)' : 'Process & Play Video';
  dom.btnPreviewPlay.classList.remove('btn-secondary');

  // If stopped prematurely before finishing, keep download gated
  if (state.isRecording) {
    state.isProcessingComplete = false;
    finishRecording();
  }
}

function onSequenceFinished() {
  // If target video duration was set (e.g. in Long Nature Loop mode) and not yet reached, loop
  if (state.isRecording && state.totalTargetSeconds > 0) {
    const elapsedSec = (performance.now() - state.playbackStartTime) / 1000;
    if (elapsedSec < state.totalTargetSeconds) {
      playAyahAudio(0);
      return;
    }
  }

  state.isPlaying = false;
  dom.btnPlayText.textContent = state.activeMode === 'quran' ? 'Process & Play Recitation (16:9)' : 'Process & Play Video';
  dom.btnPreviewPlay.classList.remove('btn-secondary');

  if (state.isRecording) {
    state.isProcessingComplete = true; // Full sequence finished successfully!
    state.pendingAutoDownload = true;
    finishRecording();
    dom.renderStatusMessage.textContent = '✅ Video processing 100% complete! Finalizing complete video...';
    setStatus('Video processing complete! Finalizing video...', '#10b981');
  } else {
    dom.renderStatusMessage.textContent = 'Sequence finished';
    state.currentAyahIndex = 0;
    renderAyahQueue();
    drawCanvasFrame();
  }
}

function getExportFileName(ext = 'mp4') {
  if (state.activeMode === 'nature') {
    const mins = Math.max(1, Math.round(state.natureTargetSeconds / 60));
    return `ProEase_Nature_Loop_${mins}Min_Landscape_720p.${ext}`;
  } else if (state.activeMode === 'awareness' || state.currentAwarenessKey) {
    const key = state.currentAwarenessKey || `Day_${state.awarenessCurrentDay}`;
    return `ProEase_Shorts_${key}_Portrait_720p.${ext}`;
  } else if (state.selectedSurah) {
    const sName = (state.selectedSurah.englishName || 'Surah').replace(/[^a-zA-Z0-9]/g, '_');
    return `ProEase_Quran_${sName}_FullSurah_Landscape_720p.${ext}`;
  }
  return `ProEase_Studio_720p.${ext}`;
}

function updatePreparedDownload(mimeType) {
  if (!state.recordedChunks.length) return;
  const currentBlob = new Blob(state.recordedChunks, { type: mimeType });
  const isMp4 = mimeType.includes('mp4');
  const ext = isMp4 ? 'mp4' : 'webm';
  const fileName = getExportFileName(ext);
  const sizeMB = (currentBlob.size / (1024 * 1024)).toFixed(1);

  if (state.lastRecordedUrl) {
    try { URL.revokeObjectURL(state.lastRecordedUrl); } catch (e) {}
  }
  const videoUrl = URL.createObjectURL(currentBlob);
  state.lastRecordedBlob = currentBlob;
  state.lastRecordedUrl = videoUrl;
  state.lastRecordedFilename = fileName;

  const isLandscape = dom.renderCanvas.width > dom.renderCanvas.height;
  const orientationLabel = isLandscape ? '16:9 Landscape' : '9:16 Portrait';

  if (state.isProcessingComplete) {
    dom.btnGenerateRecord.disabled = false;
    dom.btnGenerateRecord.classList.remove('btn-download-disabled');
    dom.btnGenerateRecord.classList.add('btn-download-ready');
    dom.btnRecordText.textContent = `📥 Download ${orientationLabel} Video (${sizeMB} MB)`;

    if (dom.directDownloadCard) {
      dom.directDownloadCard.classList.remove('hidden');
      dom.directDownloadStatus.textContent = `${orientationLabel} video ready (${sizeMB} MB) • Synchronized audio`;
      dom.directDownloadDetails.textContent = isLandscape
        ? '16:9 Landscape recitation video of entire surah with synchronized text and audio.'
        : '9:16 Portrait viral shorts video with highlighted wordings and synchronized audio.';
      dom.btnDirectDownloadAnchor.href = videoUrl;
      dom.btnDirectDownloadAnchor.download = fileName;
      dom.btnDirectDownloadAnchorText.textContent = `Save ${orientationLabel} Video (${sizeMB} MB)`;
    }
  }
}

function executeDirectDownload() {
  if (state.isFinalizing || !state.isProcessingComplete || (!state.lastRecordedBlob && !state.recordedChunks.length)) {
    setStatus('⚠️ Video must complete full processing before downloading.', '#fbbf24');
    dom.renderStatusMessage.textContent = '⚠️ Video must complete full processing before downloading. Click "Process & Play Video" to start.';
    return;
  }
  const mimeType = state.mediaMimeType || 'video/mp4';
  const blob = state.lastRecordedBlob || new Blob(state.recordedChunks, { type: mimeType });
  const isMp4 = mimeType.includes('mp4');
  const ext = isMp4 ? 'mp4' : 'webm';
  const fileName = state.lastRecordedFilename || getExportFileName(ext);
  const videoUrl = state.lastRecordedUrl || URL.createObjectURL(blob);
  const sizeMB = (blob.size / (1024 * 1024)).toFixed(1);
  const isLandscape = dom.renderCanvas.width > dom.renderCanvas.height;
  const orientationLabel = isLandscape ? '16:9 Landscape' : '9:16 Portrait';

  // Direct synchronous browser download (not blocked by browser pop-up blockers)
  const a = document.createElement('a');
  a.href = videoUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => a.remove(), 100);

  dom.renderStatusMessage.textContent = `✅ ${orientationLabel} video downloaded: ${fileName} (${sizeMB} MB)`;
  setStatus(`${orientationLabel} video downloaded (${sizeMB} MB)`, '#10b981');

  if (dom.directDownloadCard) {
    dom.directDownloadCard.classList.remove('hidden');
    dom.directDownloadStatus.textContent = `${orientationLabel} video downloaded (${sizeMB} MB)`;
    dom.btnDirectDownloadAnchor.href = videoUrl;
    dom.btnDirectDownloadAnchor.download = fileName;
    dom.btnDirectDownloadAnchorText.textContent = `Download Again (${sizeMB} MB)`;
  }
  if (dom.exportResultBox) {
    dom.exportResultBox.classList.remove('hidden');
    document.getElementById('exportTitle').textContent = `🎉 ${orientationLabel} Video Ready (${sizeMB} MB)`;
    document.getElementById('exportSubtitle').textContent = `${fileName} • ${orientationLabel} video with highlighted wordings and synchronized audio.`;
    dom.btnDownloadVideo.href = videoUrl;
    dom.btnDownloadVideo.download = fileName;
  }
}

// 5. In-Memory Direct Video Synthesis & Instant Download Pipeline
function startProcessingAndRecording() {
  if (state.isRecording || state.isFinalizing) return false;
  if (typeof MediaRecorder === 'undefined' || !dom.renderCanvas?.captureStream) {
    setStatus('Video recording is not supported in this browser. Use a current Chrome, Edge or Safari browser over HTTPS.', '#ef4444');
    return false;
  }
  try { return initializeRecording(); }
  catch (error) {
    state.isRecording = false;
    state.canvasStream?.getTracks().forEach(track => track.stop());
    dom.hudRecordingIndicator?.classList.add('hidden');
    dom.btnGenerateRecord.disabled = true;
    setStatus('Cannot start recording: ' + error.message, '#ef4444');
    return false;
  }
}

function initializeRecording() {

  setupAudioContext();

  state.isRecording = true;
  state.isProcessingComplete = false; // Strictly false until sequence finishes completely
  state.recordedChunks = [];
  state.pendingAutoDownload = false;
  state.lastRecordedBlob = null;
  state.lastRecordedFilename = '';
  if (state.lastRecordedUrl) URL.revokeObjectURL(state.lastRecordedUrl);
  state.lastRecordedUrl = null;
  state.playbackStartTime = performance.now();
  state.lastSceneSwitchTime = performance.now();

  dom.exportResultBox.classList.add('hidden');
  if (dom.directDownloadCard) dom.directDownloadCard.classList.add('hidden');
  dom.hudRecordingIndicator.classList.remove('hidden');

  // Strict aspect ratio enforcement:
  // - Shorts / Awareness: 9:16 Portrait (720x1280)
  // - Quran Recitation: 16:9 Landscape (1280x720)
  // - Nature: 16:9 Landscape (1280x720)
  if (state.activeMode === 'awareness') {
    setCanvasDimensions(720, 1280);
  } else {
    setCanvasDimensions(1280, 720);
  }

  dom.btnGenerateRecord.classList.add('recording');
  dom.btnGenerateRecord.disabled = true;
  dom.btnGenerateRecord.classList.add('btn-download-disabled');
  dom.btnGenerateRecord.classList.remove('btn-download-ready');
  dom.btnRecordText.textContent = '⏳ Processing... (Complete First)';
  dom.renderStatusMessage.textContent = '🔴 Processing video • Please wait for full sequence to finish to unlock download';

  // Capture Canvas stream at 30 fps
  drawCanvasFrame();
  const canvasStream = dom.renderCanvas.captureStream(30);
  state.canvasStream = canvasStream;

  // Get Audio destination track from Web Audio
  const audioTracks = state.audioDestinationNode.stream.getAudioTracks();

  // Combine video and audio tracks
  const combinedStream = new MediaStream();
  canvasStream.getVideoTracks().forEach((vt) => combinedStream.addTrack(vt));
  audioTracks.forEach((at) => combinedStream.addTrack(at));

  // Determine optimal supported MIME type
  let mimeType = 'video/webm;codecs=vp9,opus';
  if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a.40.2')) {
    mimeType = 'video/mp4;codecs=avc1,mp4a.40.2';
  } else if (MediaRecorder.isTypeSupported('video/mp4')) {
    mimeType = 'video/mp4';
  } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
    mimeType = 'video/webm;codecs=vp9,opus';
  } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
    mimeType = 'video/webm;codecs=vp8,opus';
  } else if (MediaRecorder.isTypeSupported('video/webm')) {
    mimeType = 'video/webm';
  }
  state.mediaMimeType = mimeType;

  try {
    state.mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000
    });
  } catch (e) {
    console.warn('Fallback to standard MediaRecorder:', e);
    state.mediaRecorder = new MediaRecorder(combinedStream);
  }

  mimeType = state.mediaRecorder.mimeType || mimeType;
  state.mediaMimeType = mimeType;
  state.mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      state.recordedChunks.push(event.data);
      // Finalize the Blob once, after the final dataavailable event.
    }
  };

  state.mediaRecorder.onerror = () => {
    state.isProcessingComplete = false;
    state.pendingAutoDownload = false;
    stopPlayback();
    setStatus('The browser could not finish recording. Please retry.', '#ef4444');
  };
  state.mediaRecorder.onstop = () => {
    state.isFinalizing = false;
    state.canvasStream?.getTracks().forEach(track => track.stop());
    state.canvasStream = null;
    if (!state.recordedChunks.length) {
      state.isProcessingComplete = false;
      state.pendingAutoDownload = false;
      setStatus('No video frames were recorded. Please retry.', '#ef4444');
      return;
    }
    updatePreparedDownload(mimeType);
    if (state.pendingAutoDownload) {
      state.pendingAutoDownload = false;
      executeDirectDownload();
    }
  };

  state.mediaRecorder.start(1000);
  return true;
}

function finishRecording() {
  if (!state.isRecording) return;
  state.isRecording = false;

  dom.btnGenerateRecord.classList.remove('recording');
  dom.hudRecordingIndicator.classList.add('hidden');

  if (state.currentBufferSource) {
    try {
      state.currentBufferSource.onended = null;
      state.currentBufferSource.stop();
      state.currentBufferSource.disconnect();
    } catch (e) {}
    state.currentBufferSource = null;
  }
  stopNatureAmbientAudio();

  state.isFinalizing = true;
  dom.btnGenerateRecord.disabled = true;
  dom.btnRecordText.textContent = 'Finalizing video…';
  if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
    try { state.mediaRecorder.stop(); }
    catch (error) {
      state.isFinalizing = false;
      state.isProcessingComplete = false;
      state.pendingAutoDownload = false;
      setStatus('Could not finalize the recording: ' + error.message, '#ef4444');
    }
  } else { state.isFinalizing = false; }
  if (!state.isProcessingComplete) {
    dom.renderStatusMessage.textContent = 'Recording stopped before completion. Press Process & Play to restart.';
    dom.btnRecordText.textContent = 'Record again to finish';
  }

}

function processAndDeliverVideo(mimeType) {
  updatePreparedDownload(mimeType);
  executeDirectDownload();
}

async function startFullVideoProcessAndPlay() {
  if (state.isPreparing || state.isRecording || state.isFinalizing) return;
  const subset = getSelectedAyahSubset();
  if (!subset.length && state.activeMode !== 'nature') {
    setStatus('Please select a valid Surah and Ayahs first.', '#fbbf24'); return;
  }
  const generation = ++state.playbackGeneration;
  state.isPreparing = true;
  try {
    setupAudioContext();
    if (state.audioContext.state === 'suspended') await state.audioContext.resume();
    if (state.activeMode !== 'nature') {
      for (let i = 0; i < subset.length; i += 4) {
        setStatus(`Preparing verse audio ${Math.min(i + 4, subset.length)}/${subset.length}…`, '#fbbf24');
        await Promise.all(subset.slice(i, i + 4).map(verse => getAyahAudioBuffer(verse.audioUrl)));
        if (generation !== state.playbackGeneration) return;
      }
    }
    if (generation !== state.playbackGeneration) return;
    if (!startProcessingAndRecording()) return;
    state.currentAyahIndex = 0;
    state.isPlaying = true;
    if (state.activeMode === 'nature') {
      // All ambient modes, including silent, must start the nature timeline.
      if (state.natureAudioMode !== 'silent') startNatureAmbientAudio(state.natureAudioMode);
      dom.btnPlayText.textContent = 'Stop Video';
    } else { await playAyahAudio(0); }
  } catch (error) {
    if (generation !== state.playbackGeneration) return;
    stopPlayback();
    setStatus('Could not prepare recording: ' + error.message, '#ef4444');
  } finally { if (generation === state.playbackGeneration) state.isPreparing = false; }
}

// 6. Video Presets & Background Selection
function renderVideoPresets(category = 'all') {
  if (!dom.presetGrid) return;
  state.selectedCategory = category;
  const filtered = category === 'all'
    ? PRESET_VIDEOS
    : PRESET_VIDEOS.filter((p) => p.category === category);

  dom.presetGrid.innerHTML = filtered
    .map(
      (p, idx) => `
    <div class="preset-item ${state.currentBackgroundVideoUrl === p.videoUrl || (!state.currentBackgroundVideoUrl && idx === 0) ? 'active' : ''}" data-url="${p.videoUrl}" data-id="${p.id}" data-category="${p.category}">
      <img src="${p.thumb}" alt="${p.title}" loading="lazy" />
      <span class="video-duration-badge">⏱️ ${p.durationBadge || 'HD'}</span>
      <div class="preset-label">${p.title}</div>
    </div>
  `
    )
    .join('');

  if (!dom.presetGrid) return;

  if (!dom.presetGrid.querySelector('.preset-item.active') && dom.presetGrid.children[0]) {
    dom.presetGrid.children[0].classList.add('active');
  }

  dom.presetGrid.querySelectorAll('.preset-item').forEach((item) => {
    item.addEventListener('click', () => {
      dom.presetGrid.querySelectorAll('.preset-item').forEach((el) => el.classList.remove('active'));
      item.classList.add('active');
      const url = item.getAttribute('data-url');
      loadBackgroundVideo(url);
    });
  });
}

function loadBackgroundVideo(url) {
  state.currentBackgroundVideoUrl = url;
  const video = dom.bgVideoSource;
  if (!video) return;

  video.pause();
  video.removeAttribute('src');
  video.load();

  if (url.startsWith('procedural') || url.startsWith('animated-')) {
    state.proceduralType = url.replace('procedural-', '');
    initParticles();
    drawCanvasFrame();
    return;
  }

  video.crossOrigin = 'anonymous';
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.autoplay = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');

  video.onloadeddata = () => {
    video.play().catch(() => {});
    drawCanvasFrame();
  };

  video.oncanplay = () => {
    video.play().catch(() => {});
    drawCanvasFrame();
  };

  video.onerror = () => {
    console.warn('Direct video load failed, attempting proxy:', url);
    if (!video.src.includes('/api/proxy') && !url.startsWith('blob:')) {
      video.src = `/api/proxy?url=${encodeURIComponent(url)}`;
      video.load();
      video.play().catch(() => {});
    }
  };

  video.src = url;
  video.load();
  video.play().catch((err) => {
    console.warn('Background video play attempt:', err);
  });
}

// 7. Pexels Video API Integration (With Duration Filters & Badges)
async function searchPexelsVideos() {
  if (!dom.pexelsApiKey || !dom.pexelsQuery || !dom.pexelsResults) return;
  const apiKey = dom.pexelsApiKey.value.trim() || DEFAULT_PEXELS_API_KEY;
  if (!apiKey) { dom.pexelsResults.textContent = 'Enter your own Pexels API key to search videos.'; return; }
  const query = dom.pexelsQuery.value.trim() || 'ocean waves';
  const durationFilter = dom.pexelsDurationFilter ? dom.pexelsDurationFilter.value : 'all';

  localStorage.setItem('pexels_api_key', apiKey);
  dom.pexelsApiKey.value = apiKey;

  dom.pexelsResults.innerHTML = '<div style="grid-column: span 3; font-size:0.75rem; color:#9ca3af; text-align:center;">Searching Pexels HD Videos...</div>';

  try {
    const endpoint = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&orientation=landscape&per_page=15`;
    const res = await fetch(endpoint, {
      headers: {
        Authorization: apiKey
      }
    });

    if (!res.ok) throw new Error(`Pexels API error ${res.status}`);

    const data = await res.json();
    if (!data.videos || data.videos.length === 0) {
      dom.pexelsResults.innerHTML = '<div style="grid-column: span 3; font-size:0.75rem; color:#ef4444; text-align:center;">No videos found for this search. Try "sea", "forest", or "river".</div>';
      return;
    }

    // Filter by duration if requested
    let videos = data.videos;
    if (durationFilter === 'long') {
      videos = videos.filter((v) => (v.duration || 0) >= 25);
    } else if (durationFilter === 'extended') {
      videos = videos.filter((v) => (v.duration || 0) >= 45);
    }
    if (videos.length === 0) {
      videos = data.videos; // Fallback to all if strict filter is empty
    }

    // Sort by duration descending so longest videos show first
    videos.sort((a, b) => (b.duration || 0) - (a.duration || 0));

    if (!dom.pexelsResults) return;

    dom.pexelsResults.innerHTML = videos
      .map((v) => {
        const videoFile =
          v.video_files.find((f) => f.quality === 'hd' && f.width >= 1280 && f.width <= 1920) ||
          v.video_files.find((f) => f.width >= 1280) ||
          v.video_files[0];
        const videoLink = videoFile ? videoFile.link : '';
        const title = v.user?.name ? `By ${v.user.name}` : 'Pexels Video';
        const durSec = v.duration || 30;
        const durText = durSec >= 60 ? `${Math.floor(durSec / 60)}m ${durSec % 60}s` : `${durSec}s`;

        return `
          <div class="preset-item" data-url="${videoLink}">
            <img src="${v.image}" alt="${title}" loading="lazy" />
            <span class="video-duration-badge">⏱️ ${durText}</span>
            <div class="preset-label">${title}</div>
          </div>
        `;
      })
      .join('');

    dom.pexelsResults.querySelectorAll('.preset-item').forEach((item) => {
      item.addEventListener('click', () => {
        dom.pexelsResults.querySelectorAll('.preset-item').forEach((el) => el.classList.remove('active'));
        item.classList.add('active');
        const url = item.getAttribute('data-url');
        loadBackgroundVideo(url);
      });
    });
  } catch (err) {
    console.error('Pexels API error:', err);
    if (dom.pexelsResults) {
      dom.pexelsResults.innerHTML = `<div style="grid-column: span 3; font-size:0.75rem; color:#ef4444; text-align:center;">Error: ${err.message}</div>`;
    }
  }
}

// 8. Custom Video Upload
function handleVideoUpload(file) {
  if (!file || !file.type.startsWith('video/')) {
    alert('Please upload a valid MP4 or WebM video file.');
    return;
  }
  const fileUrl = URL.createObjectURL(file);
  dom.uploadFileName.style.display = 'block';
  dom.uploadFileName.textContent = `Selected: ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`;
  loadBackgroundVideo(fileUrl);
}

// 8b. Render Curated Nature Loops for Mind Relaxation & Peaceful Atmospheres
function renderNaturePresets(category = 'all') {
  if (!dom.naturePresetGrid) return;
  state.natureSelectedCategory = category;
  const filtered = category === 'all'
    ? NATURE_PRESET_VIDEOS
    : NATURE_PRESET_VIDEOS.filter((p) => p.category === category);

  dom.naturePresetGrid.innerHTML = filtered
    .map(
      (p, idx) => `
    <div class="preset-item ${state.currentBackgroundVideoUrl === p.videoUrl || (!state.currentBackgroundVideoUrl && idx === 0) ? 'active-nature' : ''}" data-url="${p.videoUrl}" data-id="${p.id}" data-category="${p.category}">
      <img src="${p.thumb}" alt="${p.title}" loading="lazy" />
      <span class="video-duration-badge" style="color:#6ee7b7; border-color:rgba(16,185,129,0.3);">⏱️ ${p.durationBadge || 'HD'}</span>
      <div class="preset-label" style="font-weight:600;">${p.title}</div>
    </div>
  `
    )
    .join('');

  if (!dom.naturePresetGrid.querySelector('.preset-item.active-nature') && dom.naturePresetGrid.children[0]) {
    dom.naturePresetGrid.children[0].classList.add('active-nature');
  }

  dom.naturePresetGrid.querySelectorAll('.preset-item').forEach((item) => {
    item.addEventListener('click', () => {
      dom.naturePresetGrid.querySelectorAll('.preset-item').forEach((el) => el.classList.remove('active-nature'));
      item.classList.add('active-nature');
      const url = item.getAttribute('data-url');
      loadBackgroundVideo(url);
      renderNatureQueueSummary();
    });
  });
}

// Search Pexels Nature Videos for Relaxation
async function searchNaturePexelsVideos() {
  if (!dom.naturePexelsResults) return;
  const apiKey = (dom.pexelsApiKey ? dom.pexelsApiKey.value.trim() : '') || DEFAULT_PEXELS_API_KEY;
  if (!apiKey) { dom.naturePexelsResults.textContent = 'Enter your own Pexels API key to search videos.'; return; }
  const query = (dom.naturePexelsQuery ? dom.naturePexelsQuery.value.trim() : '') || 'ocean waves relaxation';

  dom.naturePexelsResults.innerHTML = '<div style="grid-column: span 3; font-size:0.75rem; color:#6ee7b7; text-align:center;">Searching peaceful nature scenes...</div>';

  try {
    const endpoint = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&orientation=landscape&per_page=12`;
    const res = await fetch(endpoint, {
      headers: {
        Authorization: apiKey
      }
    });

    if (!res.ok) throw new Error(`Pexels API error ${res.status}`);

    const data = await res.json();
    if (!data.videos || data.videos.length === 0) {
      dom.naturePexelsResults.innerHTML = '<div style="grid-column: span 3; font-size:0.75rem; color:#ef4444; text-align:center;">No nature scenes found. Try "waves", "forest", or "waterfall".</div>';
      return;
    }

    const videos = data.videos;
    videos.sort((a, b) => (b.duration || 0) - (a.duration || 0));

    dom.naturePexelsResults.innerHTML = videos
      .map((v) => {
        const videoFile =
          v.video_files.find((f) => f.quality === 'hd' && f.width >= 1280 && f.width <= 1920) ||
          v.video_files.find((f) => f.width >= 1280) ||
          v.video_files[0];
        const videoLink = videoFile ? videoFile.link : '';
        const title = v.user?.name ? `By ${v.user.name}` : 'Nature Loop';
        const durSec = v.duration || 30;
        const durText = durSec >= 60 ? `${Math.floor(durSec / 60)}m ${durSec % 60}s` : `${durSec}s`;

        return `
          <div class="preset-item" data-url="${videoLink}">
            <img src="${v.image}" alt="${title}" loading="lazy" />
            <span class="video-duration-badge" style="color:#6ee7b7;">⏱️ ${durText}</span>
            <div class="preset-label">${title}</div>
          </div>
        `;
      })
      .join('');

    dom.naturePexelsResults.querySelectorAll('.preset-item').forEach((item) => {
      item.addEventListener('click', () => {
        dom.naturePexelsResults.querySelectorAll('.preset-item').forEach((el) => el.classList.remove('active-nature'));
        item.classList.add('active-nature');
        const url = item.getAttribute('data-url');
        loadBackgroundVideo(url);
        renderNatureQueueSummary();
      });
    });
  } catch (err) {
    console.error('Nature Pexels search error:', err);
    if (dom.naturePexelsResults) {
      dom.naturePexelsResults.innerHTML = `<div style="grid-column: span 3; font-size:0.75rem; color:#ef4444; text-align:center;">Search failed: ${err.message}</div>`;
    }
  }
}

function handleNatureVideoUpload(file) {
  if (!file || !file.type.startsWith('video/')) {
    alert('Please upload a valid MP4 or WebM nature video file.');
    return;
  }
  const fileUrl = URL.createObjectURL(file);
  if (dom.natureUploadFileName) {
    dom.natureUploadFileName.style.display = 'block';
    dom.natureUploadFileName.textContent = `Selected: ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`;
  }
  loadBackgroundVideo(fileUrl);
  renderNatureQueueSummary();
}

// Helper: Format Time in MM:SS
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function setStatus(text, color) {
  if (dom.globalStatus) {
    dom.globalStatus.innerHTML = `<span style="width:7px; height:7px; background:${color}; border-radius:50%; display:inline-block;"></span> ${text}`;
  }
}

// 9. Particle Background Engine (Offline Fallbacks)
function initParticles() {
  state.particles = [];
  const type = state.proceduralType || 'gold';
  const count = type === 'sea' ? 85 : type === 'forest' ? 90 : 75;
  const maxX = dom.renderCanvas?.width || 1280;
  const maxY = dom.renderCanvas?.height || 720;

  for (let i = 0; i < count; i++) {
    state.particles.push({
      x: Math.random() * maxX,
      y: Math.random() * maxY,
      radius: Math.random() * 2.8 + 1.0,
      speedX: (Math.random() - 0.5) * 0.8,
      speedY: -Math.random() * 1.2 - 0.2,
      color: type === 'sea' ? '#67e8f9' : type === 'forest' ? '#6ee7b7' : '#fef08a',
      alpha: Math.random() * 0.6 + 0.2
    });
  }
}

// 10. Studio Mode Switcher (Contextual Options based on Video Type)
function switchStudioMode(mode) {
  state.activeMode = mode;
  state.isProcessingComplete = false;
  state.lastRecordedBlob = null;
  state.recordedChunks = [];

  // Reset download button to locked/disabled state until new mode video is processed
  if (dom.btnGenerateRecord) {
    dom.btnGenerateRecord.disabled = true;
    dom.btnGenerateRecord.classList.add('btn-download-disabled');
    dom.btnGenerateRecord.classList.remove('btn-download-ready');
    dom.btnRecordText.textContent = '🔒 Download (Complete Processing First)';
  }
  if (dom.directDownloadCard) {
    dom.directDownloadCard.classList.add('hidden');
  }

  // 1. Update mode buttons and sidebar category buttons
  dom.modeBtnQuran?.classList.toggle('active', mode === 'quran');
  dom.modeBtnAwareness?.classList.toggle('active', mode === 'awareness');
  dom.modeBtnNature?.classList.toggle('active', mode === 'nature');

  // 2. Update all sidebar video type and category buttons
  document.querySelectorAll('.video-type-card, .category-nav-btn').forEach((card) => {
    const isMatch = card.getAttribute('data-type') === mode;
    card.classList.toggle('active', isMatch);
  });

  // 3. Update header mode badge, resolution tag & Canvas Dimensions:
  // - Quran Recitation: 16:9 Landscape (1280x720)
  // - Awareness Shorts: 9:16 Portrait (720x1280)
  // - Nature: 16:9 Landscape (1280x720)
  if (mode === 'quran') {
    setCanvasDimensions(1280, 720);
    if (dom.activeModeBadge) dom.activeModeBadge.textContent = '16:9 Landscape';
    if (dom.headerActiveModeText) dom.headerActiveModeText.textContent = 'Quran Recitation · 16:9 Landscape';
    if (dom.headerResTag) dom.headerResTag.textContent = '1280 × 720';
  } else if (mode === 'awareness') {
    setCanvasDimensions(720, 1280);
    if (dom.activeModeBadge) dom.activeModeBadge.textContent = '9:16 Portrait';
    if (dom.headerActiveModeText) dom.headerActiveModeText.textContent = 'Quran Shorts · 9:16 Portrait';
    if (dom.headerResTag) dom.headerResTag.textContent = '720 × 1280';
  } else if (mode === 'nature') {
    setCanvasDimensions(1280, 720);
    if (dom.activeModeBadge) dom.activeModeBadge.textContent = '16:9 Landscape';
    if (dom.headerActiveModeText) dom.headerActiveModeText.textContent = 'Nature Loops · 16:9 Landscape';
    if (dom.headerResTag) dom.headerResTag.textContent = '1280 × 720';
  }

  // 4. DYNAMICALLY HIDE / SHOW SECTIONS BASED ON VIDEO TYPE!
  if (mode === 'quran') {
    // Show RECITATION options ONLY:
    dom.sectionQuran?.classList.remove('mode-hidden');
    dom.sectionVideo?.classList.remove('mode-hidden');
    dom.sectionOverlay?.classList.remove('mode-hidden');

    // Strictly hide Shorts options and Nature Loop controls
    dom.sectionAwareness?.classList.add('mode-hidden');
    dom.sectionNatureLoop?.classList.add('mode-hidden');

    if (dom.videoSectionHeading) {
      dom.videoSectionHeading.innerHTML = `
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
        Video Background Scenes
      `;
    }

    if (dom.btnPlayText) dom.btnPlayText.textContent = 'Process & Play Full Surah (16:9)';
    if (dom.ayahQueueTitle) dom.ayahQueueTitle.textContent = 'Ayahs in Recitation Sequence';
    state.currentAwarenessKey = null;

    // Recite entire selected Surah continuously from Ayah 1 to end
    if (state.selectedSurah) {
      state.startAyah = 1;
      state.endAyah = state.selectedSurah.numberOfAyahs;
    }
    renderAyahQueue();
  } else if (mode === 'awareness') {
    // Show SHORTS options ONLY:
    dom.sectionAwareness?.classList.remove('mode-hidden');
    dom.sectionOverlay?.classList.remove('mode-hidden');

    // Strictly hide Full Quran recitation selection, Nature Loop controls, and video presets
    dom.sectionQuran?.classList.add('mode-hidden');
    dom.sectionNatureLoop?.classList.add('mode-hidden');
    dom.sectionVideo?.classList.add('mode-hidden');

    if (dom.btnPlayText) dom.btnPlayText.textContent = 'Process & Play Short (9:16)';
    if (dom.ayahQueueTitle) dom.ayahQueueTitle.textContent = '⚡ Active Quran Short Verse & Scene Details';

    if (!state.currentAwarenessKey) {
      if (typeof AWARENESS_365_DAYS !== 'undefined' && AWARENESS_365_DAYS.length > 0) {
        applyAwarenessDay(AWARENESS_365_DAYS[0]);
      }
    } else {
      if (typeof AWARENESS_365_DAYS !== 'undefined') {
        const existing = AWARENESS_365_DAYS.find(d => d.key === state.currentAwarenessKey);
        if (existing) applyAwarenessDay(existing);
        else if (AWARENESS_365_DAYS.length > 0) applyAwarenessDay(AWARENESS_365_DAYS[0]);
      }
    }
  } else if (mode === 'nature') {
    // Show NATURE LOOP options ONLY:
    dom.sectionNatureLoop?.classList.remove('mode-hidden');

    // Strictly hide Quran recitation, Shorts, and overlay sections!
    dom.sectionQuran?.classList.add('mode-hidden');
    dom.sectionAwareness?.classList.add('mode-hidden');
    dom.sectionVideo?.classList.add('mode-hidden');
    dom.sectionOverlay?.classList.add('mode-hidden');

    renderNaturePresets(state.natureSelectedCategory || 'all');

    // Ensure active video is a nature video
    const isCurrentNature = NATURE_PRESET_VIDEOS.some((v) => v.videoUrl === state.currentBackgroundVideoUrl);
    if (!isCurrentNature && NATURE_PRESET_VIDEOS.length > 0) {
      loadBackgroundVideo(NATURE_PRESET_VIDEOS[0].videoUrl);
    }

    const mins = Math.max(1, Math.round(state.natureTargetSeconds / 60));
    if (dom.btnPlayText) dom.btnPlayText.textContent = 'Process & Play Nature Loop (16:9)';
    if (dom.ayahQueueTitle) dom.ayahQueueTitle.textContent = '🌿 Mind Relaxation Nature Loop Sequence & Soundscape';
    renderNatureQueueSummary();
  }

  updateHud();
  drawCanvasFrame();
}

// Render Long Nature Loop Summary in Queue Area
function renderNatureQueueSummary() {
  const mins = Math.max(1, Math.round(state.natureTargetSeconds / 60));
  if (dom.ayahQueueCount) dom.ayahQueueCount.textContent = `${mins} Min Video Target`;

  const audioLabels = {
    oceanWaves: '🌊 Ambient Ocean Waves & Surf',
    forestRain: '🌧️ Gentle Forest Rain & Soft Drops',
    mountainStream: '🏞️ Babbling Mountain Stream & Forest Birds',
    nightCampfire: '🔥 Warm Crackling Campfire & Night Breeze',
    gentleWind: '🍃 Gentle Forest Wind & Swaying Leaves',
    silent: '🔇 Silent Video (Pure Scenic Visual)'
  };

  const activeVideo = NATURE_PRESET_VIDEOS.find((v) => v.videoUrl === state.currentBackgroundVideoUrl) ||
    PRESET_VIDEOS.find((v) => v.videoUrl === state.currentBackgroundVideoUrl) || {
    title: 'Natural Scene Loop',
    thumb: 'https://images.pexels.com/videos/34693119/nature-ocean-sea-slow-motion-34693119.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
    durationBadge: 'HD'
  };

  if (!dom.ayahQueueContainer) return;

  dom.ayahQueueContainer.innerHTML = `
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:0.75rem;">
      <div style="background:rgba(30,41,59,0.5); border:1px solid rgba(16,185,129,0.3); border-radius:10px; padding:0.9rem;">
        <div style="font-size:0.72rem; color:var(--emerald-light); font-weight:600; text-transform:uppercase;">⏱️ Target Duration</div>
        <div style="font-size:1.15rem; font-weight:700; color:#fff; margin-top:0.2rem;">${mins} Minutes (${state.natureTargetSeconds}s)</div>
        <div style="font-size:0.7rem; color:var(--text-secondary); margin-top:0.25rem;">Camera angle shift: ${state.natureCycleSpeed > 0 ? `Every ${state.natureCycleSpeed}s` : 'Single Continuous Loop'}</div>
      </div>
      <div style="background:rgba(30,41,59,0.5); border:1px solid rgba(16,185,129,0.3); border-radius:10px; padding:0.9rem;">
        <div style="font-size:0.72rem; color:var(--emerald-light); font-weight:600; text-transform:uppercase;">🎵 Relaxation Soundscape</div>
        <div style="font-size:0.85rem; font-weight:600; color:#fff; margin-top:0.2rem;">${audioLabels[state.natureAudioMode] || 'Ambient Audio'}</div>
        <div style="font-size:0.7rem; color:#6ee7b7; margin-top:0.25rem;">Format: 100% Blank Scenic Video (Mind Relaxation)</div>
      </div>
      <div style="background:rgba(30,41,59,0.5); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:0.9rem; display:flex; align-items:center; gap:0.75rem;">
        <img src="${activeVideo.thumb}" alt="${activeVideo.title}" style="width:70px; height:45px; object-fit:cover; border-radius:6px; border:1px solid rgba(16,185,129,0.3);" />
        <div>
          <div style="font-size:0.72rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Active Nature Scene</div>
          <div style="font-size:0.82rem; font-weight:600; color:#f8fafc;">${activeVideo.title}</div>
        </div>
      </div>
    </div>
  `;
}

// 11. Event Listeners Setup
function setupEventListeners() {
  // Mode Buttons in Header
  dom.modeBtnQuran?.addEventListener('click', () => switchStudioMode('quran'));
  dom.modeBtnAwareness?.addEventListener('click', () => switchStudioMode('awareness'));
  dom.modeBtnNature?.addEventListener('click', () => switchStudioMode('nature'));

  // 365 Days Awareness Controls
  if (dom.awareness365Search) {
    dom.awareness365Search.addEventListener('input', (e) => {
      state.awarenessSearchQuery = e.target.value;
      state.awarenessPage = 1;
      renderAwareness365();
    });
  }
  if (dom.btnSearchAwarenessClear) {
    dom.btnSearchAwarenessClear.addEventListener('click', () => {
      if (dom.awareness365Search) dom.awareness365Search.value = '';
      state.awarenessSearchQuery = '';
      state.awarenessPage = 1;
      renderAwareness365();
    });
  }
  if (dom.awarenessCatChips) {
    dom.awarenessCatChips.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        dom.awarenessCatChips.querySelectorAll('button').forEach((b) => b.classList.remove('active-chip'));
        btn.classList.add('active-chip');
        state.awarenessSelectedCategory = btn.getAttribute('data-cat') || 'all';
        state.awarenessPage = 1;
        renderAwareness365();
      });
    });
  }
  if (dom.btnAwarenessPrevPage) {
    dom.btnAwarenessPrevPage.addEventListener('click', () => {
      if ((state.awarenessPage || 1) > 1) {
        state.awarenessPage--;
        renderAwareness365();
      }
    });
  }
  if (dom.btnAwarenessNextPage) {
    dom.btnAwarenessNextPage.addEventListener('click', () => {
      const filtered = getFiltered365Days();
      const totalPages = Math.ceil(filtered.length / 12);
      if ((state.awarenessPage || 1) < totalPages) {
        state.awarenessPage++;
        renderAwareness365();
      }
    });
  }
  if (dom.btnAwarenessJumpToday) {
    dom.btnAwarenessJumpToday.addEventListener('click', () => {
      const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
      const targetDay = Math.min(365, Math.max(1, dayOfYear));
      const item = AWARENESS_365_DAYS.find((d) => d.day === targetDay) || AWARENESS_365_DAYS[0];
      state.awarenessPage = Math.ceil(targetDay / 12);
      renderAwareness365();
      applyAwarenessDay(item);
    });
  }
  if (dom.btnAwarenessRandom) {
    dom.btnAwarenessRandom.addEventListener('click', () => {
      const randDay = Math.floor(Math.random() * 365) + 1;
      const item = AWARENESS_365_DAYS.find((d) => d.day === randDay) || AWARENESS_365_DAYS[0];
      state.awarenessPage = Math.ceil(randDay / 12);
      renderAwareness365();
      applyAwarenessDay(item);
    });
  }
  if (dom.btnAwarenessPrevDay) {
    dom.btnAwarenessPrevDay.addEventListener('click', () => {
      const cur = state.awarenessCurrentDay || 1;
      const prev = cur > 1 ? cur - 1 : 365;
      const item = AWARENESS_365_DAYS.find((d) => d.day === prev);
      if (item) applyAwarenessDay(item);
    });
  }
  if (dom.btnAwarenessNextDay) {
    dom.btnAwarenessNextDay.addEventListener('click', () => {
      const cur = state.awarenessCurrentDay || 1;
      const next = cur < 365 ? cur + 1 : 1;
      const item = AWARENESS_365_DAYS.find((d) => d.day === next);
      if (item) applyAwarenessDay(item);
    });
  }

  // Video Type & Category Buttons in Sidebar
  document.querySelectorAll('.video-type-card, .category-nav-btn').forEach((card) => {
    card.addEventListener('click', () => {
      const type = card.getAttribute('data-type');
      if (type) switchStudioMode(type);
    });
  });

  // Awareness Reciter Select
  if (dom.awarenessReciterSelect) {
    dom.awarenessReciterSelect.addEventListener('change', (e) => {
      state.selectedReciter = e.target.value;
      if (dom.reciterSelect) dom.reciterSelect.value = e.target.value;
      updateCaptionsSection();
      fetchAyahData(state.isPlaying);
    });
  }

  // Awareness Cards Clicks
  document.querySelectorAll('.awareness-card').forEach((card) => {
    card.addEventListener('click', () => {
      const themeKey = card.getAttribute('data-theme');
      if (themeKey) {
        applyAwarenessTheme(themeKey);
      }
    });
  });

  // Long Nature Loop Duration Chips
  if (dom.natureDurationChips) {
    dom.natureDurationChips.querySelectorAll('.nature-duration-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        dom.natureDurationChips.querySelectorAll('.nature-duration-chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');

        const secVal = chip.getAttribute('data-seconds');
        if (secVal === 'custom') {
          if (dom.customDurationRow) dom.customDurationRow.classList.remove('hidden');
          const mins = parseInt(dom.customMinutesInput ? dom.customMinutesInput.value : '5', 10) || 5;
          state.natureTargetSeconds = mins * 60;
        } else {
          if (dom.customDurationRow) dom.customDurationRow.classList.add('hidden');
          state.natureTargetSeconds = parseInt(secVal, 10) || 300;
        }
        updateHud();
      });
    });
  }

  if (dom.customMinutesInput) {
    dom.customMinutesInput.addEventListener('input', (e) => {
      const mins = Math.max(1, Math.min(60, parseInt(e.target.value, 10) || 5));
      state.natureTargetSeconds = mins * 60;
      updateHud();
    });
  }

  if (dom.sceneCycleSpeed) {
    dom.sceneCycleSpeed.addEventListener('change', (e) => {
      state.natureCycleSpeed = parseInt(e.target.value, 10);
      renderNatureQueueSummary();
    });
  }

  if (dom.natureAudioMode) {
    dom.natureAudioMode.addEventListener('change', (e) => {
      state.natureAudioMode = e.target.value;
      if (state.isPlaying && state.activeMode === 'nature') {
        startNatureAmbientAudio(state.natureAudioMode);
      }
      renderNatureQueueSummary();
    });
  }

  // Nature Source Tabs
  dom.natureTabPresets?.addEventListener('click', () => {
    dom.natureTabPresets?.classList.add('active');
    dom.natureTabPexels?.classList.remove('active');
    dom.natureTabUpload?.classList.remove('active');
    dom.natureContentPresets?.classList.remove('hidden');
    dom.natureContentPexels?.classList.add('hidden');
    dom.natureContentUpload?.classList.add('hidden');
  });

  dom.natureTabPexels?.addEventListener('click', () => {
    dom.natureTabPresets?.classList.remove('active');
    dom.natureTabPexels?.classList.add('active');
    dom.natureTabUpload?.classList.remove('active');
    dom.natureContentPresets?.classList.add('hidden');
    dom.natureContentPexels?.classList.remove('hidden');
    dom.natureContentUpload?.classList.add('hidden');
    if (!dom.naturePexelsResults?.children?.length) {
      searchNaturePexelsVideos();
    }
  });

  dom.natureTabUpload?.addEventListener('click', () => {
    dom.natureTabPresets?.classList.remove('active');
    dom.natureTabPexels?.classList.remove('active');
    dom.natureTabUpload?.classList.add('active');
    dom.natureContentPresets?.classList.add('hidden');
    dom.natureContentPexels?.classList.add('hidden');
    dom.natureContentUpload?.classList.remove('hidden');
  });

  // Nature Category Chips
  if (dom.natureCategoryChips) {
    dom.natureCategoryChips.querySelectorAll('.quick-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        dom.natureCategoryChips.querySelectorAll('.quick-btn').forEach((b) => b.classList.remove('active-chip'));
        btn.classList.add('active-chip');
        const cat = btn.getAttribute('data-category') || 'all';
        renderNaturePresets(cat);
      });
    });
  }

  // Nature Pexels Search
  dom.btnSearchNaturePexels?.addEventListener('click', searchNaturePexelsVideos);
  dom.naturePexelsQuery?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchNaturePexelsVideos();
  });
  document.querySelectorAll('.nature-pexels-tag').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tag = btn.getAttribute('data-tag');
      if (tag && dom.naturePexelsQuery) {
        dom.naturePexelsQuery.value = tag;
        searchNaturePexelsVideos();
      }
    });
  });

  // Nature Video Drag & Drop Upload
  dom.natureDropzone?.addEventListener('click', () => dom.natureVideoFileInput?.click());
  dom.natureVideoFileInput?.addEventListener('change', (e) => {
    if (e.target.files?.length) handleNatureVideoUpload(e.target.files[0]);
  });
  dom.natureDropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (dom.natureDropzone) dom.natureDropzone.style.borderColor = 'var(--emerald-light)';
  });
  dom.natureDropzone?.addEventListener('dragleave', () => {
    if (dom.natureDropzone) dom.natureDropzone.style.borderColor = '#4b5563';
  });
  dom.natureDropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    if (dom.natureDropzone) dom.natureDropzone.style.borderColor = '#4b5563';
    if (e.dataTransfer?.files?.length) handleNatureVideoUpload(e.dataTransfer.files[0]);
  });

  // Box Lightness Slider
  if (dom.boxLightnessSlider) {
    dom.boxLightnessSlider.addEventListener('input', (e) => {
      state.boxLightness = parseInt(e.target.value, 10);
      if (dom.boxLightnessValue) dom.boxLightnessValue.textContent = `${state.boxLightness}% Light`;
      drawCanvasFrame();
    });
  }

  // Awareness Top Banner Toggle
  if (dom.awarenessBannerToggle) {
    dom.awarenessBannerToggle.addEventListener('change', (e) => {
      state.showAwarenessBanner = e.target.value === 'true';
      drawCanvasFrame();
    });
  }

  // Surah selector and search filter
  if (dom.surahSearch) {
    dom.surahSearch.addEventListener('input', (e) => {
      renderSurahDropdown(e.target.value);
      if (dom.surahSelect && dom.surahSelect.value) {
        selectSurah(dom.surahSelect.value);
      }
    });
  }

  if (dom.surahSelect) {
    dom.surahSelect.addEventListener('change', (e) => {
      state.currentAwarenessKey = null; // Clear awareness specific lock
      selectSurah(e.target.value);
    });
  }

  // Ayah range inputs (guarded if present)
  if (dom.startAyah) {
    dom.startAyah.addEventListener('change', (e) => {
      state.startAyah = Math.max(1, parseInt(e.target.value, 10) || 1);
      if (state.endAyah < state.startAyah) {
        state.endAyah = state.startAyah;
        if (dom.endAyah) dom.endAyah.value = state.endAyah;
      }
      state.currentAyahIndex = 0;
      renderAyahQueue();
      drawCanvasFrame();
    });
  }

  if (dom.endAyah) {
    dom.endAyah.addEventListener('change', (e) => {
      state.endAyah = Math.max(state.startAyah, parseInt(e.target.value, 10) || state.startAyah);
      state.currentAyahIndex = 0;
      renderAyahQueue();
      drawCanvasFrame();
    });
  }

  // Quick range buttons (safely checked if present)
  if (dom.btnFullSurah) {
    dom.btnFullSurah.addEventListener('click', () => {
      if (state.selectedSurah) {
        state.startAyah = 1;
        state.endAyah = state.selectedSurah.numberOfAyahs;
        if (dom.startAyah) dom.startAyah.value = state.startAyah;
        if (dom.endAyah) dom.endAyah.value = state.endAyah;
        state.currentAyahIndex = 0;
        renderAyahQueue();
        drawCanvasFrame();
      }
    });
  }

  if (dom.btnAyah1to3) {
    dom.btnAyah1to3.addEventListener('click', () => {
      if (state.selectedSurah) {
        state.startAyah = 1;
        state.endAyah = Math.min(3, state.selectedSurah.numberOfAyahs);
        if (dom.startAyah) dom.startAyah.value = state.startAyah;
        if (dom.endAyah) dom.endAyah.value = state.endAyah;
        state.currentAyahIndex = 0;
        renderAyahQueue();
        drawCanvasFrame();
      }
    });
  }

  if (dom.btnAyah1to5) {
    dom.btnAyah1to5.addEventListener('click', () => {
      if (state.selectedSurah) {
        state.startAyah = 1;
        state.endAyah = Math.min(5, state.selectedSurah.numberOfAyahs);
        if (dom.startAyah) dom.startAyah.value = state.startAyah;
        if (dom.endAyah) dom.endAyah.value = state.endAyah;
        state.currentAyahIndex = 0;
        renderAyahQueue();
        drawCanvasFrame();
      }
    });
  }

  if (dom.btnAyah1to7) {
    dom.btnAyah1to7.addEventListener('click', () => {
      if (state.selectedSurah) {
        state.startAyah = 1;
        state.endAyah = Math.min(7, state.selectedSurah.numberOfAyahs);
        if (dom.startAyah) dom.startAyah.value = state.startAyah;
        if (dom.endAyah) dom.endAyah.value = state.endAyah;
        state.currentAyahIndex = 0;
        renderAyahQueue();
        drawCanvasFrame();
      }
    });
  }

  // Processing Speed selector
  if (dom.processingSpeedSelect) {
    dom.processingSpeedSelect.addEventListener('change', (e) => {
      state.processingSpeed = parseFloat(e.target.value) || 1.0;
    });
  }

  // Reciter selector
  if (dom.reciterSelect) {
    dom.reciterSelect.addEventListener('change', (e) => {
      state.selectedReciter = e.target.value;
      if (dom.awarenessReciterSelect) dom.awarenessReciterSelect.value = e.target.value;
      updateCaptionsSection();
      state.isProcessingComplete = false;
      state.lastRecordedBlob = null;
      state.recordedChunks = [];
      if (dom.btnGenerateRecord) {
        dom.btnGenerateRecord.disabled = true;
        dom.btnGenerateRecord.classList.add('btn-download-disabled');
        dom.btnGenerateRecord.classList.remove('btn-download-ready');
        if (dom.btnRecordText) dom.btnRecordText.textContent = '🔒 Download (Complete Processing First)';
      }
      if (dom.directDownloadCard) {
        dom.directDownloadCard.classList.add('hidden');
      }
      fetchAyahData();
    });
  }

  // Typography & Overlay Theme
  dom.fontSizeArabic?.addEventListener('change', (e) => {
    state.fontSizeArabic = parseInt(e.target.value, 10);
    drawCanvasFrame();
  });

  dom.overlayTheme?.addEventListener('change', (e) => {
    state.overlayTheme = e.target.value;
    drawCanvasFrame();
  });

  // Background selection tabs
  dom.tabPresets?.addEventListener('click', () => {
    dom.tabPresets?.classList.add('active');
    dom.tabPexels?.classList.remove('active');
    dom.tabUpload?.classList.remove('active');
    dom.contentPresets?.classList.remove('hidden');
    dom.contentPexels?.classList.add('hidden');
    dom.contentUpload?.classList.add('hidden');
  });

  dom.tabPexels?.addEventListener('click', () => {
    dom.tabPresets?.classList.remove('active');
    dom.tabPexels?.classList.add('active');
    dom.tabUpload?.classList.remove('active');
    dom.contentPresets?.classList.add('hidden');
    dom.contentPexels?.classList.remove('hidden');
    dom.contentUpload?.classList.add('hidden');
  });

  dom.tabUpload?.addEventListener('click', () => {
    dom.tabPresets?.classList.remove('active');
    dom.tabPexels?.classList.remove('active');
    dom.tabUpload?.classList.add('active');
    dom.contentPresets?.classList.add('hidden');
    dom.contentPexels?.classList.add('hidden');
    dom.contentUpload?.classList.remove('hidden');
  });

  // Pexels Search
  dom.btnSearchPexels?.addEventListener('click', searchPexelsVideos);
  dom.pexelsQuery?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchPexelsVideos();
  });
  dom.pexelsDurationFilter?.addEventListener('change', searchPexelsVideos);
  document.querySelectorAll('.pexels-tag').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tag = btn.getAttribute('data-tag');
      if (tag && dom.pexelsQuery) {
        dom.pexelsQuery.value = tag;
        searchPexelsVideos();
      }
    });
  });

  // File Upload Drag and Drop
  dom.dropzone?.addEventListener('click', () => dom.videoFileInput?.click());
  dom.videoFileInput?.addEventListener('change', (e) => {
    if (e.target.files?.length) handleVideoUpload(e.target.files[0]);
  });
  dom.dropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (dom.dropzone) dom.dropzone.style.borderColor = 'var(--gold-light)';
  });
  dom.dropzone?.addEventListener('dragleave', () => {
    if (dom.dropzone) dom.dropzone.style.borderColor = '#4b5563';
  });
  dom.dropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    if (dom.dropzone) dom.dropzone.style.borderColor = '#4b5563';
    if (e.dataTransfer?.files?.length) handleVideoUpload(e.dataTransfer.files[0]);
  });

  // Playback & Recording Action Buttons
  dom.btnPreviewPlay?.addEventListener('click', () => {
    if (state.isPlaying) {
      stopPlayback();
    } else {
      startFullVideoProcessAndPlay();
    }
  });

  dom.btnStopPlay?.addEventListener('click', () => {
    if (state.isRecording) {
      state.isProcessingComplete = false;
      finishRecording();
    }
    stopPlayback();
    if (dom.renderStatusMessage) {
      dom.renderStatusMessage.textContent = '⏹️ Playback stopped. Processing must run to completion to unlock download.';
    }
  });

  dom.btnGenerateRecord?.addEventListener('click', () => {
    if (state.isRecording) {
      setStatus('⚠️ Video is currently processing. The video must complete processing first before downloading.', '#fbbf24');
      if (dom.renderStatusMessage) dom.renderStatusMessage.textContent = '⏳ Video processing in progress... Please wait for the sequence to complete.';
      return;
    }
    if (!state.isProcessingComplete || !state.lastRecordedBlob) {
      setStatus('⚠️ Video processing must complete first before downloading. Click "Process & Play Video" to start.', '#fbbf24');
      if (dom.renderStatusMessage) dom.renderStatusMessage.textContent = '⚠️ Video must complete full processing before download is unlocked.';
      return;
    }
    executeDirectDownload();
  });

  if (dom.btnDirectDownloadAnchor) {
    dom.btnDirectDownloadAnchor.addEventListener('click', (e) => {
      if (state.isRecording) {
        e.preventDefault();
        setStatus('⚠️ Video is currently processing. Please wait until completion.', '#fbbf24');
        return;
      }
      if (!state.isProcessingComplete || !state.lastRecordedBlob) {
        e.preventDefault();
        setStatus('⚠️ Video processing must complete first before downloading.', '#fbbf24');
        return;
      }
      if (!dom.btnDirectDownloadAnchor.href || dom.btnDirectDownloadAnchor.getAttribute('href') === '#') {
        e.preventDefault();
        executeDirectDownload();
      }
    });
  }

  // Timeline seek interaction
  dom.timelineTrack?.addEventListener('click', (e) => {
    const rect = dom.timelineTrack.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const subset = getSelectedAyahSubset();
    const targetIndex = Math.min(subset.length - 1, Math.floor(ratio * subset.length));
    jumpToAyahIndex(targetIndex);
  });

  // Natural Background Category Chips
  if (dom.categoryChips) {
    dom.categoryChips.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        dom.categoryChips.querySelectorAll('button').forEach((b) => b.classList.remove('active-chip'));
        btn.classList.add('active-chip');
        const cat = btn.getAttribute('data-category') || 'all';
        renderVideoPresets(cat);
      });
    });
  }

  // ============================================================
  // Video Captions, Details & Reciter Credits Event Listeners
  // ============================================================

  // Copy Title Button
  dom.btnCopyTitle?.addEventListener('click', () => {
    const titleVal = dom.captionTitleInput ? dom.captionTitleInput.value : '';
    copyToClipboard(titleVal, dom.btnCopyTitle, 'Copied Title!');
  });

  // Copy Reciter Credits Button
  dom.btnCopyCredits?.addEventListener('click', () => {
    const kit = generateCaptionsKit();
    copyToClipboard(kit.creditsFormatted, dom.btnCopyCredits, 'Copied Credits!');
  });

  // Copy Description Button
  dom.btnCopyDescription?.addEventListener('click', () => {
    const descVal = dom.captionDescriptionTextarea ? dom.captionDescriptionTextarea.value : '';
    copyToClipboard(descVal, dom.btnCopyDescription, 'Copied Description!');
  });

  // Copy Hashtags Button
  dom.btnCopyHashtags?.addEventListener('click', () => {
    const kit = generateCaptionsKit();
    copyToClipboard(kit.hashtags.join(' '), dom.btnCopyHashtags, 'Copied Tags!');
  });

  // Copy Complete Publishing Kit Button (Title + Description + Credits + Tags)
  dom.btnCopyFullKit?.addEventListener('click', () => {
    const kit = generateCaptionsKit();
    const titleVal = dom.captionTitleInput?.value || kit.title;
    const descVal = dom.captionDescriptionTextarea?.value || kit.description;
    const fullKitText = `[TITLE]\n${titleVal}\n\n[DESCRIPTION]\n${descVal}\n\n[CREDITS & ATTRIBUTION]\n${kit.creditsFormatted}\n\n[HASHTAGS]\n${kit.hashtags.join(' ')}`;
    copyToClipboard(fullKitText, dom.btnCopyFullKit, 'Full Kit Copied! 🚀');
  });

  // Title Options Chips (Emotional / SEO / Social Hook)
  if (dom.titleOptionsChips) {
    dom.titleOptionsChips.querySelectorAll('.title-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const style = chip.getAttribute('data-style');
        if (!style) return;
        state.captionsTitleStyle = style;
        dom.titleOptionsChips.querySelectorAll('.title-chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        updateCaptionsSection();
      });
    });
  }

  // Captions Platform Tabs (YouTube / TikTok & Reels / Social X)
  if (dom.captionsPlatformTabs) {
    dom.captionsPlatformTabs.querySelectorAll('.platform-tab-btn').forEach((tab) => {
      tab.addEventListener('click', () => {
        const platform = tab.getAttribute('data-platform');
        if (!platform) return;
        state.captionsPlatform = platform;
        dom.captionsPlatformTabs.querySelectorAll('.platform-tab-btn').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        updateCaptionsSection();
      });
    });
  }
}

// Resilient App Initialization
function bootApp() {
  initDom();
  initParticles();
  renderVideoPresets('all');
  renderNaturePresets('all');
  if (PRESET_VIDEOS && PRESET_VIDEOS.length > 0) {
    loadBackgroundVideo(PRESET_VIDEOS[0].videoUrl);
  }
  setupEventListeners();

  // Initialize studio with default Quran Recitation options
  switchStudioMode('quran');

  // Restore or set default Pexels Key
  const savedKey = localStorage.getItem('pexels_api_key') || DEFAULT_PEXELS_API_KEY;
  if (dom.pexelsApiKey) {
    dom.pexelsApiKey.value = savedKey;
  }
  // Pre-load Pexels natural video search
  searchPexelsVideos();

  // Load Quran metadata
  fetchSurahList();

  // Start continuous canvas rendering loop
  startRenderLoop();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}
