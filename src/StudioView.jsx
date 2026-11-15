import {recorderMime} from './browser-renderer.js';
import React, { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpRight, AudioLines, BookOpen, Check, CheckCheck, ChevronDown, ChevronRight, CircleHelp, Clapperboard, Copy, Download, ExternalLink, Film, Globe, ImagePlus, Layers, Leaf, Link2, LoaderCircle, Maximize2, Menu, Monitor, Pause, Play, Plus, RefreshCw, Search, ShieldCheck, Settings2, SlidersHorizontal, Smartphone, Sparkles, Square, Type, Upload, WandSparkles, X, Youtube } from 'lucide-react';
import { publicationTarget } from './publication.js';
const MODES = [{
  id: 'lessons',
  name: 'Quran Lessons',
  short: 'Lessons',
  icon: Sparkles,
  description: 'A verse. A little perspective.'
}, {
  id: 'quran',
  name: 'Full Surahs',
  short: 'Full Surahs',
  icon: BookOpen,
  description: 'Let every verse be heard.'
}, {
  id: 'reflection',
  name: 'P.T.P Reflection',
  short: 'Reflection',
  icon: Leaf,
  description: 'A moment to breathe and reflect.'
}, {
  id: 'nature',
  name: 'Nature Loop',
  short: 'Nature',
  icon: Film,
  description: 'Let the scenery tell the story.'
}];
const titleCase = text => text.toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
function Dialog({
  title,
  subtitle,
  children,
  onClose
}) {
  const panel = useRef(null),
    close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement,
      overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    const keydown = event => {
      if (event.key === 'Escape') close.current();
      if (event.key === 'Tab') {
        const nodes = [...panel.current.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')];
        const first = nodes[0],
          last = nodes.at(-1);
        if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', keydown);
      previous?.focus();
    };
  }, []);
  return <div className="dialog-backdrop" onMouseDown={event => {
    if (event.target === event.currentTarget) onClose();
  }}><section className="studio-dialog" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={panel}><div className="dialog-heading"><div><span className="eyebrow">PROEASE STUDIO</span><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={19} /></button></div>{children}</section></div>;
}
function PlatformMark({
  id,
  large = false
}) {
  return <span className={`platform-mark ${id} ${large ? 'large' : ''}`}>{id === 'youtube' ? <Youtube size={large ? 24 : 18} /> : id === 'facebook' ? <span>f</span> : <Film size={18} />}</span>;
}
export default function StudioView(props) {
  const {
    activeMode,
    setActiveMode,
    reflectionQuote,
    setReflectionQuote,
    reflectionTextLines,
    setReflectionTextLines,
    reflectionVoiceoverScript,
    setReflectionVoiceoverScript,
    reflectionFontSize,
    setReflectionFontSize,
    arabicFontScale,
    setArabicFontScale,
    translationFontScale,
    setTranslationFontScale,
    fontPreset,
    applyFontPreset,
    socialChannels,
    autoPostOnFinish,
    setAutoPostEnabled,
    showSocialModal,
    setShowSocialModal,
    connectingChannel,
    setConnectingChannel,
    authConnectingTab,
    setAuthConnectingTab,
    verifyingToken,
    authError,
    setAuthError,
    authStatusInfo,
    publishModalData,
    publishedHistory,
    previewVoiceover,
    surahs,
    selectedSurah,
    setSelectedSurah,
    selectedLesson,
    setSelectedLesson,
    lessonCategory,
    setLessonCategory,
    lessonSearch,
    setLessonSearch,
    selectedReciter,
    setSelectedReciter,
    ayahData,
    currentAyahIndex,
    isPlaying,
    selectedVideoUrl,
    setSelectedVideoUrl,
    bgCategory,
    setBgCategory,
    processingSpeed,
    setProcessingSpeed,
    statusText,
    downloadUrl,
    aspectRatio,
    setAspectRatio,
    copiedField,
    shareStatus,
    setShareStatus,
    showAiModal,
    setShowAiModal,
    logoUrl,
    setLogoUrl,
    bgTab,
    setBgTab,
    pexelsApiKey,
    setPexelsApiKey,
    pexelsQuery,
    setPexelsQuery,
    pexelsResults,
    pexelsSearching,
    searchPexels,
    canvasRef,
    videoRef,
    audioRefA,
    audioRefB,
    isBackendRendering,
    handleBackendVideoRender,
    startPlaybackOrRecording,
    stopPlayback,
    filteredLessons,
    filteredPresets,
    captionsKit,
    copyToClipboard,
    publishToConnectedAccounts,
    handleToggleAutoPost,
    handleDisconnectSocial,
    handleVerifyAndSaveToken,
    handleLaunchOAuthPopup,
    handleNativeShare,
    renderEngine,setRenderEngine,serviceState,saveServiceConfig,serviceConfig,tikTokCreator,tikTokSettings,setTikTokSettings,
    completedAsset,
    updateAsset,
    isPublishing,
    inspectorTab,
    setInspectorTab,
    workspaceTab,
    setWorkspaceTab,
    mobileMenuOpen,
    setMobileMenuOpen,
    setLoadVersion,
    loadError,
    renderPhase,
    authForm,
    setAuthForm,
    QURAN_LESSONS,
    PRESET_VIDEOS,
    RECITERS_METADATA,
    buildPtpReflectionPackage,
    generateAIShortsScript
  } = props;
  const [showHelp, setShowHelp] = useState(false),
    [reflectionPrompt, setReflectionPrompt] = useState(reflectionQuote),
    [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showServiceSettings,setShowServiceSettings]=useState(false);
  const [serviceForm,setServiceForm]=useState(()=>serviceConfig());
  const [serviceError,setServiceError]=useState('');
  const DISPLAY={youtube:'YouTube',facebook:'Facebook',instagram:'Instagram',tiktok:'TikTok'};
  const outputFormat=renderEngine==='browser'?(recorderMime().includes('mp4')?'MP4':'WebM'):'MP4';
  const stageRef = useRef(null);
  useEffect(() => {
    if (publishModalData) setShowUploadDialog(true);
  }, [publishModalData?.operationId]);
  const mode = MODES.find(item => item.id === activeMode);
  const projectTitle = activeMode === 'lessons' ? titleCase(selectedLesson.title) : activeMode === 'quran' ? selectedSurah ? `Surah ${selectedSurah.englishName}` : 'A new recitation' : activeMode === 'reflection' ? 'A moment of reflection' : 'A little closer to nature';
  const connected = socialChannels.filter(channel => channel.connected),
    selected = connected.filter(channel => channel.autoPost);
  const canExport = !isBackendRendering && !isPlaying && !isPublishing && (['nature', 'reflection'].includes(activeMode) || ayahData.length > 0);
  const assetLocked = isPublishing || (completedAsset && Object.values(completedAsset.outcomes).some(outcome => ['uploaded', 'review', 'processing'].includes(outcome.status)));
  const pending = selected.filter(channel => !['uploaded', 'review'].includes(completedAsset?.outcomes[publicationTarget(channel)]?.status));
  const chooseMode = id => {
    setActiveMode(id);
    setWorkspaceTab('studio');
    setInspectorTab('content');
    setMobileMenuOpen(false);
    setAspectRatio(['lessons', 'reflection'].includes(id) ? '9:16' : '16:9');
  };
  const chooseBackground = file => {
    if (!file) return;
    if (!['video/mp4', 'video/webm'].includes(file.type)) {
      setShareStatus('Choose an MP4 or WebM video.');
      return;
    }
    if (file.size > 70 * 1024 * 1024) {
      setShareStatus('Choose a background under 70 MB.');
      return;
    }
    setSelectedVideoUrl(URL.createObjectURL(file));
    setShareStatus('Background added to your next video.');
  };
  const chooseLogo = file => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setShareStatus('Choose a PNG, JPG or WebP logo under 5 MB.');
      return;
    }
    setLogoUrl(URL.createObjectURL(file));
  };
  const updateCaption = (key, value) => {
    if (completedAsset && !assetLocked) updateAsset({
      ...completedAsset,
      metadata: {
        ...completedAsset.metadata,
        [key]: value
      }
    });
  };
  const connect = channel => {
    setConnectingChannel(channel);
    setAuthError('');
    setAuthForm({
      token: '',
      pageId: '',
      privacy: channel.privacy || 'public'
    });
  };
  const previewLabel = activeMode === 'nature' ? 'Preview Nature Loop' : activeMode === 'reflection' ? 'Preview Short' : 'Preview Recitation';
  const captured = completedAsset?.metadata || captionsKit;
  return <div className="studio-app">
    <aside className={`app-rail ${mobileMenuOpen ? 'rail-open' : ''}`} aria-label="Main navigation">
      <a className="brand" href="#studio" onClick={event => {
        event.preventDefault();
        setWorkspaceTab('studio');
        setMobileMenuOpen(false);
      }}><span className="brand-symbol"><Layers size={21} /></span><span>quran<span className="brand-dot">.</span><small>VIDEO STUDIO</small></span></a>
      <div className="workspace-switch"><span className="workspace-avatar">P</span><span>Personal workspace<small>Your creative space</small></span><ChevronDown size={14} /></div>
      <span className="nav-caption">WORKSPACE</span><nav className="main-nav">
        <button className={workspaceTab === 'studio' ? 'selected' : ''} onClick={() => {
          setWorkspaceTab('studio');
          setMobileMenuOpen(false);
        }}><Clapperboard size={18} />Video studio<span className="nav-count">01</span></button>
        <button onClick={() => {
          setWorkspaceTab('studio');
          setInspectorTab('scene');
          setMobileMenuOpen(false);
        }}><ImagePlus size={18} />Media library</button>
        <button onClick={() => {
          setShowSocialModal(true);
          setMobileMenuOpen(false);
        }}><Link2 size={18} />Social Accounts{connected.length > 0 && <span className="nav-count">{connected.length}</span>}</button>
        <button disabled={isBackendRendering || isPlaying} className={workspaceTab === 'history' ? 'selected' : ''} onClick={() => {
          setWorkspaceTab('history');
          setMobileMenuOpen(false);
        }}><Globe size={18} />Publishing history</button>
      </nav>
      <div className="rail-note"><span className="note-spark"><Sparkles size={20} /></span><strong>Made for moments<br />that mean more.</strong><p>A little inspiration. A story worth sharing.</p><button onClick={() => setShowAiModal(true)}>Find your inspiration<ArrowUpRight size={14} /></button></div>
      <button className="rail-help" onClick={() => setShowHelp(true)}><CircleHelp size={17} />Getting started<ArrowUpRight size={14} /></button><div className="rail-footer"><span className="mini-avatar">PE</span><span>Quran Studio<small>A space to create</small></span><span className="online-dot" /></div>
    </aside>
    {mobileMenuOpen && <button className="rail-backdrop" aria-label="Close navigation" onClick={() => setMobileMenuOpen(false)} />}
    <div className="app-content" id="studio"><header className="app-topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}><Menu size={20} /></button><span>Workspace</span><ChevronRight size={14} /><strong>{workspaceTab === 'history' ? 'Publishing history' : 'Video studio'}</strong></div><div className="topbar-actions"><span className="local-badge"><span />Local workspace</span><button className="icon-button" aria-label="Open studio guide" onClick={() => setShowHelp(true)}><CircleHelp size={18} /></button><button className="icon-button" aria-label="Publishing service settings" onClick={()=>{setServiceForm(serviceConfig());setShowServiceSettings(true);}}><Settings2 size={18}/></button><span className="topbar-avatar">P</span></div></header>
      <div className="page-content"><div className="page-heading"><div><div className="eyebrow"><span />{workspaceTab === 'history' ? 'YOUR CREATIVE JOURNEY' : 'A LITTLE INTENTION. A LOT OF POSSIBILITY.'}</div><h1>{workspaceTab === 'history' ? 'Stories you’ve shared.' : 'Create something meaningful.'}</h1><p>{workspaceTab === 'history' ? 'A record of confirmed uploads from this device.' : 'Turn a moment of inspiration into a video worth pausing for.'}</p></div><button className="button button-secondary heading-action" onClick={() => workspaceTab === 'history' ? setWorkspaceTab('studio') : setShowAiModal(true)}><Plus size={16} />{workspaceTab === 'history' ? 'Back to studio' : 'Creative brief'}</button></div>
      {shareStatus && <div className="notice" role="status"><CircleHelp size={16} /><span>{shareStatus}</span><button className="icon-button" aria-label="Dismiss message" onClick={() => setShareStatus('')}><X size={15} /></button></div>}
      {workspaceTab === 'history' ? <section className="surface history-page"><div className="section-heading"><div><span className="eyebrow">PUBLISHING</span><h2>Recent activity</h2></div><span className="neutral-pill">{publishedHistory.length} uploads</span></div>{publishedHistory.length ? <div className="history-list">{publishedHistory.map(item => <div className="history-row" key={item.id}><span className="history-icon"><CheckCheck size={20} /></span><div><strong>{item.title}</strong><p>{item.channelNames}</p></div><time>{item.date}</time></div>)}</div> : <div className="empty-state"><Globe size={32} /><h3>Your next story starts here.</h3><p>Confirmed uploads will appear here once you publish a video.</p><button className="button button-primary" onClick={() => setWorkspaceTab('studio')}>Create a video<ArrowRight size={16} /></button></div>}</section> : <>
        <div className="mode-bar" role="tablist" aria-label="Studio mode">{MODES.map(item => <button role="tab" aria-label={item.name} aria-selected={activeMode === item.id} key={item.id} className={activeMode === item.id ? 'active' : ''} disabled={isBackendRendering} onClick={() => chooseMode(item.id)}><item.icon size={18} /><span>{item.short}</span>{activeMode === item.id && <span className="active-dot" />}</button>)}<span className="mode-hint">A format for every story.</span></div>
        <div className="studio-grid">
          <section className="surface inspector"><div className="inspector-heading"><div><span className="eyebrow">01 / COMPOSE</span><h2>Make it yours</h2></div><SlidersHorizontal size={18} /></div><div className="inspector-tabs" role="tablist" aria-label="Editor settings">{[{
                  id: 'content',
                  label: 'Content',
                  icon: BookOpen
                }, {
                  id: 'scene',
                  label: 'Scenery',
                  icon: ImagePlus
                }, {
                  id: 'style',
                  label: 'Style',
                  icon: Type
                }].map(tab => <button role="tab" aria-selected={inspectorTab === tab.id} key={tab.id} className={inspectorTab === tab.id ? 'active' : ''} onClick={() => setInspectorTab(tab.id)}><tab.icon size={15} />{tab.label}</button>)}</div>
            <fieldset disabled={isBackendRendering} className="inspector-body">
            {inspectorTab === 'content' && <><div className="editor-intro"><span className="soft-icon"><mode.icon size={19} /></span><div><h3>{mode.name}</h3><p>{mode.description}</p></div></div>
              {activeMode === 'lessons' && <><label className="search-field"><Search size={16} /><input aria-label="Search lessons" placeholder="Find a little inspiration…" value={lessonSearch} onChange={event => setLessonSearch(event.target.value)} /></label><label className="field"><span>Theme</span><select value={lessonCategory} onChange={event => setLessonCategory(event.target.value)}><option value="all">All themes</option>{[...new Set(QURAN_LESSONS.map(lesson => lesson.category))].map(category => <option key={category} value={category}>{titleCase(category.replace(/([A-Z])/g, ' $1'))}</option>)}</select></label><div className="lesson-list">{filteredLessons.map(lesson => <button className={`lesson-option ${selectedLesson.key === lesson.key ? 'active' : ''}`} key={lesson.key} onClick={() => setSelectedLesson(lesson)}><span className="lesson-number">{String(QURAN_LESSONS.indexOf(lesson) + 1).padStart(2, '0')}</span><span><strong>{titleCase(lesson.title)}</strong><small>{lesson.surahName} · {lesson.startAyah}–{lesson.endAyah}</small></span>{selectedLesson.key === lesson.key && <Check size={15} />}</button>)}{!filteredLessons.length && <p className="empty-copy">No lessons match. Try another theme.</p>}</div></>}
              {activeMode === 'quran' && <><label className="field"><span>Choose a Surah</span><select aria-label="Choose a Surah" value={selectedSurah?.number || ''} onChange={event => setSelectedSurah(surahs.find(surah => surah.number === Number(event.target.value)))}><option value="" disabled>{surahs.length ? 'Choose a Surah' : 'Loading Surahs…'}</option>{surahs.map(surah => <option key={surah.number} value={surah.number}>{surah.number}. {surah.englishName} · {surah.numberOfAyahs} verses</option>)}</select></label><div className="verse-note"><BookOpen size={17} /><p>The complete Surah, with Arabic, transliteration and English translation.</p></div></>}
              {activeMode === 'reflection' && <><label className="field"><span>What’s on your heart?</span><textarea rows={4} value={reflectionPrompt} onChange={event => setReflectionPrompt(event.target.value)} placeholder="A thought, a feeling, a little reminder…" /></label><button className="button button-primary button-full" onClick={() => {
                      const pack = buildPtpReflectionPackage(reflectionPrompt);
                      setReflectionQuote(reflectionPrompt);
                      setReflectionTextLines(pack.lines);
                      setReflectionVoiceoverScript(pack.voiceover);
                      setShareStatus('Reflection updated. Your preview is ready.');
                    }}><WandSparkles size={16} />Shape this reflection</button><label className="field" style={{
                      marginTop: 18
                    }}><span>On-screen text</span><textarea rows={7} value={reflectionTextLines.join('\n')} onChange={event => setReflectionTextLines(event.target.value.split('\n'))} /></label><details className="details-card"><summary>Voiceover script<ChevronDown size={14} /></summary><textarea aria-label="Voiceover script" rows={5} value={reflectionVoiceoverScript} onChange={event => setReflectionVoiceoverScript(event.target.value)} /><button className="button button-secondary button-small" onClick={previewVoiceover}><AudioLines size={14} />Listen to script</button><p className="help-copy">Voice preview only. Your export includes ambient audio.</p></details></>}
              {activeMode === 'nature' && <div className="nature-note"><Leaf size={28} /><h3>A quiet escape.</h3><p>A 15-second scenery loop with a gentle ambient soundtrack. Choose a scene and make a little room to breathe.</p><button className="button button-secondary" onClick={() => setInspectorTab('scene')}>Choose your scenery<ArrowRight size={15} /></button></div>}
              {['quran', 'lessons'].includes(activeMode) && <div className="reciter-settings"><label className="field"><span><AudioLines size={14} />Recitation</span><select aria-label="Reciter" value={selectedReciter} onChange={event => setSelectedReciter(event.target.value)}>{Object.entries(RECITERS_METADATA).map(([key, reciter]) => <option key={key} value={key}>{reciter.name.replace('Sheikh ', '')}</option>)}</select></label><label className="field"><span>Playback speed</span><select aria-label="Playback speed" value={processingSpeed} onChange={event => setProcessingSpeed(Number(event.target.value))}><option value={1}>1× Original</option><option value={1.5}>1.5× Faster</option><option value={2}>2× Faster</option></select></label><p className="help-copy">Speed also applies to your exported video.</p></div>}
              {loadError && ['quran', 'lessons'].includes(activeMode) && <div className="inline-error" role="alert"><p>{loadError}</p><button onClick={() => setLoadVersion(value => value + 1)}><RefreshCw size={14} />Try again</button></div>}
            </>}
            {inspectorTab === 'scene' && <><div className="editor-intro"><span className="soft-icon"><ImagePlus size={19} /></span><div><h3>Set the scene</h3><p>A little atmosphere goes a long way.</p></div></div><div className="small-tabs">{['presets', 'pexels', 'upload'].map(tab => <button key={tab} className={bgTab === tab ? 'active' : ''} onClick={() => setBgTab(tab)}>{tab === 'presets' ? 'Curated' : tab === 'pexels' ? 'Pexels' : 'Upload'}</button>)}</div>
              {bgTab === 'presets' && <><button className={`button button-secondary button-full ${selectedVideoUrl==='gradient'?'gradient-selected':''}`} onClick={()=>setSelectedVideoUrl('gradient')}><Leaf size={16}/>Studio gradient {selectedVideoUrl==='gradient'&&<Check size={14}/>}</button><label className="field"><span>Collection</span><select aria-label="Scene collection" value={bgCategory} onChange={event => setBgCategory(event.target.value)}><option value="all">All scenery</option>{[...new Set(PRESET_VIDEOS.map(video => video.category))].map(category => <option key={category} value={category}>{titleCase(category)}</option>)}</select></label><div className="scene-grid">{filteredPresets.map((video, index) => <button className={`scene-tile tone-${index % 4} ${video.videoUrl === selectedVideoUrl ? 'selected' : ''}`} title={video.title} aria-label={`Use ${video.title}`} key={video.id} onClick={() => setSelectedVideoUrl(video.videoUrl)}><img src={video.thumb} alt="" loading="lazy" onError={event => {
                          event.currentTarget.style.display = 'none';
                        }} /><span className="scene-shade" /><span>{video.title}</span>{video.videoUrl === selectedVideoUrl && <i><Check size={12} /></i>}</button>)}</div></>}
              {bgTab === 'pexels' && <><label className="field"><span>Your Pexels API key</span><input type="password" autoComplete="off" placeholder="Paste your key" value={pexelsApiKey} onChange={event => setPexelsApiKey(event.target.value)} /></label><label className="field"><span>Find a scene</span><input value={pexelsQuery} onChange={event => setPexelsQuery(event.target.value)} placeholder="Ocean, forest, golden hour…" onKeyDown={event => {
                        if (event.key === 'Enter') searchPexels();
                      }} /></label><button className="button button-secondary button-full" disabled={pexelsSearching} onClick={searchPexels}>{pexelsSearching ? <LoaderCircle className="spin" size={15} /> : <Search size={15} />}Search Pexels</button><div className="scene-grid">{pexelsResults.map(video => {
                        const file = video.video_files?.filter(file => file.file_type === 'video/mp4').sort((a, b) => Math.abs(a.width - 1920) - Math.abs(b.width - 1920))[0];
                        return file && <button className="scene-tile" aria-label={`Use Pexels scene ${video.id}`} key={video.id} onClick={() => setSelectedVideoUrl(file.link)}><img src={video.image} alt="Pexels scenery" /><span className="scene-shade" /><span>Scene {video.id}</span></button>;
                      })}</div><p className="help-copy">Your key is used for this session. Media courtesy of Pexels.</p></>}
              {bgTab === 'upload' && <label className="upload-zone" htmlFor="customVideoUpload" onDragOver={event => event.preventDefault()} onDrop={event => {
                    event.preventDefault();
                    chooseBackground(event.dataTransfer.files[0]);
                  }}><Upload size={28} /><strong>Bring your own scenery</strong><span>Drop a video here, or browse files</span><small>MP4 or WebM · up to 70 MB</small><input id="customVideoUpload" aria-label="Upload background video" type="file" accept="video/mp4,video/webm" onChange={event => {
                      chooseBackground(event.target.files[0]);
                      event.target.value = '';
                    }} /></label>}
              {selectedVideoUrl.startsWith('blob:') && <div className="selection-note"><Check size={15} />Your uploaded background is selected.</div>}
            </>}
            {inspectorTab === 'style' && <><div className="editor-intro"><span className="soft-icon"><Type size={19} /></span><div><h3>The finishing touches</h3><p>Simple details. Your signature.</p></div></div><span className="field-label">Typography preset</span><div className="font-presets">{['compact', 'normal', 'large', 'cinematic'].map(preset => <button className={fontPreset === preset ? 'active' : ''} key={preset} onClick={() => applyFontPreset(preset)}><span>Aa</span>{preset}</button>)}</div>{activeMode === 'reflection' ? <label className="field slider-field"><span>Reflection text<small>{reflectionFontSize}px</small></span><input type="range" min={16} max={54} value={reflectionFontSize} onChange={event => setReflectionFontSize(Number(event.target.value))} /></label> : <><label className="field slider-field"><span>Arabic text<small>{arabicFontScale.toFixed(2)}×</small></span><input type="range" min={0.65} max={1.65} step={0.05} value={arabicFontScale} onChange={event => setArabicFontScale(Number(event.target.value))} /></label><label className="field slider-field"><span>Translation<small>{translationFontScale.toFixed(2)}×</small></span><input type="range" min={0.65} max={1.65} step={0.05} value={translationFontScale} onChange={event => setTranslationFontScale(Number(event.target.value))} /></label></>}
              <div className="section-divider" /><span className="field-label">Your channel logo</span><label className="upload-zone logo-zone" htmlFor="logoUploadInput">{logoUrl ? <img src={logoUrl} alt="Channel logo" /> : <ImagePlus size={25} />}<strong>{logoUrl ? 'Replace your logo' : 'Add your signature'}</strong><span>PNG, JPG or WebP · up to 5 MB</span><input id="logoUploadInput" aria-label="Upload channel logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={event => {
                      chooseLogo(event.target.files[0]);
                      event.target.value = '';
                    }} /></label>{logoUrl && <button className="text-button" onClick={() => setLogoUrl('')}>Remove logo</button>}<p className="help-copy">Your logo appears in the bottom-right corner of the video.</p>
            </>}
            </fieldset><div className="inspector-footnote"><ShieldCheck size={13} />A little care in every frame.</div>
          </section>
          <section className="preview-column"><div className="surface preview-panel"><div className="preview-heading"><div><span className="eyebrow">02 / PREVIEW</span><h2>{projectTitle}</h2></div><span className="live-label"><span />Live preview</span></div><div className="preview-tools"><span><Monitor size={14} />{aspectRatio === '9:16' ? '1080 × 1920' : '1920 × 1080'}<i />1080p</span><div className="ratio-switch" aria-label="Video aspect ratio"><button className={aspectRatio === '9:16' ? 'active' : ''} aria-label="9:16 portrait" disabled={isBackendRendering} onClick={() => setAspectRatio('9:16')}><Smartphone size={13} />9:16</button><button className={aspectRatio === '16:9' ? 'active' : ''} aria-label="16:9 landscape" disabled={isBackendRendering} onClick={() => setAspectRatio('16:9')}><Monitor size={14} />16:9</button><button aria-label="Expand preview" onClick={() => stageRef.current.requestFullscreen?.().catch(() => setShareStatus('Full-screen preview is unavailable in this browser.'))}><Maximize2 size={13} /></button></div></div>
            <div ref={stageRef} className={`preview-stage ${aspectRatio === '9:16' ? 'portrait' : 'landscape'}`}><div className="preview-frame" style={{
                    aspectRatio: aspectRatio === '9:16' ? '9 / 16' : '16 / 9'
                  }}><video ref={videoRef} muted playsInline loop autoPlay crossOrigin="anonymous" /><canvas ref={canvasRef} width={aspectRatio === '9:16' ? 1080 : 1920} height={aspectRatio === '9:16' ? 1920 : 1080} aria-label="Video preview" /><audio ref={audioRefA} crossOrigin="anonymous" preload="auto" /><audio ref={audioRefB} crossOrigin="anonymous" preload="auto" /></div>{isBackendRendering && <div className="render-overlay"><LoaderCircle size={30} className="spin" /><strong>{renderPhase}</strong><span>{renderEngine==='browser'?'Recording the full playback. Keep this tab open.':'Good things take a little moment.'}</span></div>}</div>
            <div className="preview-transport"><button className={`play-button ${isPlaying ? 'playing' : ''}`} disabled={isBackendRendering} onClick={() => isPlaying ? stopPlayback() : startPlaybackOrRecording(false)} aria-label={isPlaying ? 'Pause preview' : previewLabel}>{isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}</button><div className="transport-copy"><strong>{isPlaying ? 'Playing your preview' : 'Take a moment. Press play.'}</strong><span>{['nature', 'reflection'].includes(activeMode) ? '15-second ambient short' : `${ayahData.length} verses · ${processingSpeed}× playback`}</span></div><button className="icon-button stop-button" aria-label="Stop" onClick={stopPlayback}><Square size={15} /></button><span className="format-tag">{aspectRatio === '9:16' ? 'PORTRAIT' : 'LANDSCAPE'}</span></div><div className="playback-track"><span style={{
                    width: isPlaying && ayahData.length && !['nature', 'reflection'].includes(activeMode) ? `${(currentAyahIndex + 1) / ayahData.length * 100}%` : '0%'
                  }} /></div><div className="preview-status" role="status">{isBackendRendering ? <LoaderCircle size={13} className="spin" /> : <span className={`status-dot ${loadError && ['quran', 'lessons'].includes(activeMode) ? 'warning' : ''}`} />}<span>{statusText}</span></div>
          </div>
          <div className="surface caption-panel"><div className="section-heading"><div><span className="eyebrow">THE WORDS THAT GO WITH IT</span><h2>Give your story a voice.</h2></div><button className="icon-button" aria-label="Copy publication captions" onClick={() => copyToClipboard(`${captured.title}\n\n${captured.description}\n\n${captured.hashtags.join(' ')}`, 'publication')}><Copy size={16} /></button></div>{completedAsset ? <><div className="caption-context"><CheckCheck size={14} /><span>Captions for <strong>{MODES.find(item => item.id === completedAsset.mode)?.short}</strong> · your completed export</span></div><label className="field"><span>Title<small>{completedAsset.metadata.title.length}/100</small></span><input aria-label="Publication title" maxLength={100} disabled={assetLocked || isPublishing} value={completedAsset.metadata.title} onChange={event => updateCaption('title', event.target.value)} /></label><label className="field"><span>Description</span><textarea aria-label="Publication description" rows={3} maxLength={4500} disabled={assetLocked || isPublishing} value={completedAsset.metadata.description} onChange={event => updateCaption('description', event.target.value)} /></label><label className="field"><span>Hashtags</span><input aria-label="Publication hashtags" disabled={assetLocked || isPublishing} value={completedAsset.metadata.hashtags.join(' ')} onChange={event => updateCaption('hashtags', event.target.value.split(/\s+/).filter(Boolean))} /></label>{assetLocked && <p className="help-copy">These captions belong to an uploaded video. Create a new export for a new post.</p>}</> : <><p className="caption-draft-title">{captionsKit.title}</p><p className="caption-draft-description">{captionsKit.description.split('\n').slice(0, 2).join(' ')}</p><div className="tag-list">{captionsKit.hashtags.slice(0, 5).map(tag => <span key={tag}>{tag}</span>)}</div><p className="help-copy">Export your video to review and edit its publishing details.</p></>}</div>
          </section>
          <aside className="export-column"><section className="surface export-panel"><div className="section-heading"><div><span className="eyebrow">03 / SHARE</span><h2>Out into the world.</h2></div><ArrowUpRight size={19} /></div><p className="muted-copy">Your next meaningful moment, ready for its audience.</p><div className="export-specs"><div><span>Quality</span><strong>Full HD <span className="tiny-tag">1080p</span></strong></div><div><span>Format</span><strong>{outputFormat} <small>{outputFormat==='MP4'?'H.264':'VP8'}</small></strong></div><div><span>Frame</span><strong>{aspectRatio} <small>{aspectRatio === '9:16' ? 'Portrait' : 'Landscape'}</small></strong></div><div><span>Audio</span><strong>{['nature', 'reflection'].includes(activeMode) ? 'Ambient' : 'Recitation'}<AudioLines size={13} /></strong></div></div><label className="field render-engine"><span>Create video with</span><select aria-label="Render engine" value={renderEngine} disabled={isBackendRendering} onChange={event=>setRenderEngine(event.target.value)}><option value="browser">This browser · no server needed</option><option value="service" disabled={!serviceState.connected}>Processing service · MP4</option></select></label><button className="button button-primary button-full export-action" disabled={!canExport} onClick={handleBackendVideoRender}>{isBackendRendering ? <LoaderCircle size={17} className="spin" /> : <Download size={17} />}<span>{isBackendRendering ? 'Creating your video…' : 'Export video'}</span>{!isBackendRendering && <ArrowRight size={15} />}</button>{isBackendRendering && <button className="text-button button-full" onClick={stopPlayback}>Cancel export</button>}<p className="export-reassurance"><ShieldCheck size={12} />Yours to download. Made to share.</p>
            {completedAsset && <div className="completed-export"><span className="completed-icon"><Check size={17} /></span><div><strong>Your export is ready.</strong><small>{MODES.find(item => item.id === completedAsset.mode)?.short} · {completedAsset.aspectRatio} · {(completedAsset.file.size / 1024 / 1024).toFixed(1)} MB</small></div><a href={downloadUrl} download={completedAsset.file.name} aria-label="Download full video"><ArrowDownToLine size={18} /></a></div>}
            {completedAsset && <button className="text-button button-full file-share" onClick={handleNativeShare}><Smartphone size={13}/>Share video file</button>}
            <div className="section-divider" />{!serviceState.connected&&<div className="service-connect-note"><p>Connect a publishing service to link your accounts. Video creation and download work without it.</p><button className="text-button" onClick={()=>{setServiceForm(serviceConfig());setShowServiceSettings(true);}}>Connect publishing service<ArrowRight size={13}/></button></div>}<div className="panel-subheading"><h3>Connected channels</h3><button className="icon-button" aria-label="Manage social accounts" onClick={() => setShowSocialModal(true)}><Plus size={17} /></button></div><div className="publish-channels">{socialChannels.map(channel => <div className="channel-row" key={channel.id}><PlatformMark id={channel.id} /><div><strong>{DISPLAY[channel.id]}</strong><small>{channel.connected ? channel.handle || 'Connected' : 'Not connected'}</small></div>{channel.connected ? <input type="checkbox" aria-label={`Publish to ${channel.name}`} checked={channel.autoPost} disabled={isPublishing} onChange={() => handleToggleAutoPost(channel.id)} /> : <button className="text-button" onClick={() => {
                      setShowSocialModal(true);
                      connect(channel);
                    }}>Connect</button>}</div>)}</div>
            {socialChannels.some(channel=>channel.id==='tiktok'&&channel.connected)&&<div className="tiktok-options">{tikTokCreator&&<p className="help-copy">Posting to {tikTokCreator.creator_nickname||'your TikTok account'} · Up to {tikTokCreator.max_video_post_duration_sec} seconds</p>}<label className="field"><span>TikTok visibility</span><select aria-label="TikTok visibility" value={tikTokSettings.privacy} onChange={event=>setTikTokSettings({...tikTokSettings,privacy:event.target.value})}><option value="" disabled>Choose who can view this video</option>{(tikTokCreator?.privacy_level_options||[]).map(privacy=><option value={privacy} key={privacy}>{({SELF_ONLY:'Only me',PUBLIC_TO_EVERYONE:'Everyone',MUTUAL_FOLLOW_FRIENDS:'Friends',FOLLOWER_OF_CREATOR:'Followers'})[privacy]||privacy}</option>)}</select></label>{[['disableComment','Allow comments','comment_disabled'],['disableDuet','Allow duets','duet_disabled'],['disableStitch','Allow stitch','stitch_disabled']].map(([key,label,restriction])=><label className="tiktok-interaction" key={key}><input type="checkbox" checked={!tikTokSettings[key]} disabled={!tikTokCreator||tikTokCreator[restriction]} onChange={event=>setTikTokSettings({...tikTokSettings,[key]:!event.target.checked})}/>{label}</label>)}</div>}<label className="autopost-option"><span><strong>Publish after export</strong><small>To your selected channels</small></span><input type="checkbox" aria-label="Automatically auto-post after export" checked={autoPostOnFinish} onChange={event => setAutoPostEnabled(event.target.checked)} /><span className="switch-track" /></label><button className="button button-secondary button-full" disabled={!completedAsset || !completedAsset.metadata.title.trim() || !pending.length || isBackendRendering || isPublishing} onClick={() => publishToConnectedAccounts()}>{isPublishing ? <LoaderCircle size={16} className="spin" /> : <Globe size={16} />}<span>{isPublishing ? 'Uploading your video…' : completedAsset&&Object.values(completedAsset.outcomes).some(outcome=>outcome.status==='processing')?'Refresh post status':'Publish video'}</span></button>{publishModalData && <button className="text-button button-full" onClick={() => setShowUploadDialog(true)}>{isPublishing ? 'View upload progress' : 'View upload results'}</button>}<p className="help-copy publish-help">{completedAsset ? 'Publish details stay with this export, even if you change the editor.' : 'Create a video, then choose where to share it.'}</p>
          </section><div className="sharing-note"><span><Leaf size={18} /></span><div><strong>Small moments. Lasting meaning.</strong><p>Take your time. Make something that feels like you.</p></div></div><div className="manual-links"><span>Prefer to upload yourself?</span><a href="https://www.tiktok.com/creator-center/upload" target="_blank" rel="noopener noreferrer">TikTok<ArrowUpRight size={12} /></a><a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer">Instagram<ArrowUpRight size={12} /></a></div></aside>
        </div><footer className="studio-footer"><span><Layers size={13} />ProEase Studio</span><span>Made with intention. Shared with purpose.</span><button onClick={() => setShowHelp(true)}>A little help<ArrowUpRight size={12} /></button></footer>
      </>}
      </div>
    </div>
    {showSocialModal && <Dialog title={connectingChannel ? 'Connect your account' : 'Your connected channels'} subtitle={connectingChannel ? 'A secure connection, a smoother way to share.' : 'Choose where your stories find their audience.'} onClose={() => {
      setShowSocialModal(false);
      setConnectingChannel(null);
      setAuthError('');
    }}>
      {authError && <div className="inline-error" role="alert">{authError}</div>}{connectingChannel ? <><button className="text-button back-link" onClick={() => {
          setConnectingChannel(null);
          setAuthError('');
        }}><ArrowLeft size={14} />All channels</button><div className="connection-provider"><PlatformMark id={connectingChannel.id} large /><div><h3>{DISPLAY[connectingChannel.id]}</h3><p>Connect the account you want to publish to.</p></div></div><div className="small-tabs"><button className={authConnectingTab === 'token' ? 'active' : ''} onClick={() => setAuthConnectingTab('token')}>Access token</button><button className={authConnectingTab === 'oauth' ? 'active' : ''} onClick={() => setAuthConnectingTab('oauth')}>Sign in</button></div>
      {authConnectingTab === 'token' ? <form onSubmit={event => {
          event.preventDefault();
          handleVerifyAndSaveToken(connectingChannel.id, authForm.token, '', '', authForm.privacy, authForm.pageId);
        }}><label className="field"><span>{`${DISPLAY[connectingChannel.id]} access token`}</span><input type="password" autoComplete="off" value={authForm.token} onChange={event => setAuthForm({
              ...authForm,
              token: event.target.value
            })} placeholder="Paste your access token" /></label>{['facebook','instagram'].includes(connectingChannel.id) && <label className="field"><span>{connectingChannel.id==='instagram'?'Instagram professional account ID':'Facebook Page ID'}</span><input value={authForm.pageId} onChange={event => setAuthForm({
              ...authForm,
              pageId: event.target.value
            })} placeholder="Your Page ID" /></label>}<label className="field"><span>Upload visibility</span><select value={authForm.privacy} onChange={event => setAuthForm({
              ...authForm,
              privacy: event.target.value
            })}><option value="public">Public</option><option value="private">{connectingChannel.id === 'facebook' ? 'Save as draft' : 'Private'}</option>{connectingChannel.id === 'youtube' && <option value="unlisted">Unlisted</option>}</select></label><p className="help-copy">{connectingChannel.id === 'youtube' ? 'Use an OAuth token with YouTube upload permission. API keys cannot upload videos.' : connectingChannel.id==='instagram'?'Use the access token for an Instagram professional account linked to your Page.':connectingChannel.id==='tiktok'?'Use a TikTok access token authorized for video.publish.':'Use a Page access token for the Page ID above.'}</p><button className="button button-primary button-full" disabled={verifyingToken}>{verifyingToken ? <LoaderCircle size={16} className="spin" /> : <ShieldCheck size={16} />}Verify & connect</button></form> : <><p className="muted-copy">Sign in on the platform’s own page to authorize your channel.</p><button className="button button-primary button-full" onClick={() => handleLaunchOAuthPopup(connectingChannel.id)}><ExternalLink size={16} />Continue to {connectingChannel.id==='tiktok'?'TikTok':connectingChannel.id === 'youtube' ? 'Google' : 'Facebook'}</button><details className="details-card"><summary>Connection setup<ChevronDown size={14} /></summary><p className="help-copy">Register this redirect URL with your provider and configure the app credentials on the server.</p><code className="callback-url">{authStatusInfo.callbackUrl || `${window.location.origin}/auth/callback`}</code><button className="text-button" onClick={() => copyToClipboard(authStatusInfo.callbackUrl || `${window.location.origin}/auth/callback`, 'callback')}>Copy redirect URL</button></details></>}</> : <><div className="account-list">{socialChannels.map(channel => <div className="account-card" key={channel.id}><PlatformMark id={channel.id} /><div><strong>{channel.name}</strong><small>{channel.connected ? `${channel.accountName} · Connected` : 'Ready to connect'}</small></div>{channel.connected ? <button className="text-button" onClick={() => handleDisconnectSocial(channel.id)}>Disconnect</button> : <button className="button button-secondary button-small" onClick={() => connect(channel)}>Connect account</button>}</div>)}</div><p className="help-copy"><ShieldCheck size={13} />Credentials stay on the server. You can disconnect at any time.</p></>}
    </Dialog>}
    {publishModalData && showUploadDialog && <Dialog title={publishModalData.isPublishing ? 'Your story is on its way.' : 'Your upload, at a glance.'} subtitle={publishModalData.videoTitle} onClose={() => setShowUploadDialog(false)}><div className="upload-results">{publishModalData.channels.map(channel => <div className={`upload-result ${channel.status}`} key={channel.id}><div className="result-heading"><PlatformMark id={channel.id} /><strong>{channel.name}</strong>{['preparing', 'uploading','processing'].includes(channel.status) ? <LoaderCircle size={18} className="spin" /> : channel.status === 'uploaded' ? <CheckCheck size={19} /> : <CircleHelp size={19} />}</div><p>{channel.stepMsg}</p>{channel.postUrl && <a href={channel.postUrl} target="_blank" rel="noopener noreferrer">{channel.status === 'uploaded' ? 'View upload' : 'Check platform'}<ArrowUpRight size={13} /></a>}</div>)}</div><button className="button button-secondary button-full" onClick={() => setShowUploadDialog(false)}>{publishModalData.isPublishing ? 'Minimize uploads' : 'Done'}</button><p className="help-copy">{publishModalData.isPublishing ? 'Uploads continue if you close this window.' : 'Only confirmed uploads are added to your publishing history.'}</p></Dialog>}
    {showAiModal && <Dialog title="A little creative direction." subtitle="A starting point for your next meaningful story." onClose={() => setShowAiModal(false)}>{(() => {
        const brief = activeMode === 'reflection' ? buildPtpReflectionPackage(reflectionQuote) : generateAIShortsScript(selectedLesson);
        return <><span className="neutral-pill">{activeMode === 'reflection' ? 'Reflection package' : 'Production brief'}</span><h3 className="brief-title">{brief.title}</h3><div className="brief-content">{activeMode === 'reflection' ? <><h4>On-screen reflection</h4><p>{brief.lines.join('\n')}</p><h4>Visual direction</h4><p>{brief.visualConcept}</p><h4>Voiceover inspiration</h4><p>{brief.voiceover}</p></> : <><h4>The idea</h4><p>{brief.coreMessage}</p><h4>Visual direction</h4><p>{brief.videoPrompt}</p><h4>Your opening</h4><p>{brief.hookScript}</p><h4>The reflection</h4><p>{brief.reflectionNotes}</p></>}</div><button className="button button-primary button-full" onClick={() => copyToClipboard(Object.entries(brief).map(([key, value]) => `${key}:\n${Array.isArray(value) ? value.join('\n') : value}`).join('\n\n'), 'brief')}><Copy size={16} />{copiedField === 'brief' ? 'Copied to clipboard' : 'Copy creative brief'}</button></>;
      })()}</Dialog>}
    {showServiceSettings&&<Dialog title="Connect your publishing service" subtitle="Create and download in your browser. Connect a service for secure account access and direct publishing." onClose={()=>setShowServiceSettings(false)}><label className="field"><span>Service URL</span><input type="url" aria-label="Service URL" placeholder="https://your-studio.onrender.com" value={serviceForm.base} onChange={event=>setServiceForm({...serviceForm,base:event.target.value})}/></label><label className="field"><span>Studio access key</span><input type="password" autoComplete="off" aria-label="Studio access key" value={serviceForm.key} onChange={event=>setServiceForm({...serviceForm,key:event.target.value})}/></label><p className="help-copy">Use the access key from your service deployment. It stays in this tab’s session and is never included in the public GitHub site.</p><p className="help-copy">App version: {import.meta.env.VITE_APP_VERSION?.slice(0,7)||'local preview'}</p>{(serviceError||serviceState.error)&&<div className="inline-error">{serviceError||serviceState.error}</div>}{serviceState.connected&&<div className="selection-note"><Check size={15}/>Publishing service connected.</div>}<button className="button button-primary button-full" onClick={()=>{try{saveServiceConfig(serviceForm.base,serviceForm.key);setServiceError('');setShareStatus('Connection settings saved. Checking publishing service…');}catch(error){setServiceError(error.message);}}}>Save connection</button></Dialog>}
    {showHelp && <Dialog title="A little help getting started." subtitle="From an idea to a story, in three simple steps." onClose={() => setShowHelp(false)}><div className="guide-steps"><div><span>01</span><section><h3>Compose your moment</h3><p>Choose a lesson, recitation, reflection or nature loop. Add scenery and adjust your text and logo.</p></section></div><div><span>02</span><section><h3>Make it feel right</h3><p>Play the preview, choose a portrait or landscape frame, then export your full-HD MP4.</p></section></div><div><span>03</span><section><h3>Share it with intention</h3><p>Review the completed video’s captions, connect YouTube, Facebook, Instagram or TikTok, and publish directly from this interface.</p></section></div></div><p className="help-copy">Recitation and preset scenery need an internet connection. Your own background videos can be uploaded in Scenery.</p></Dialog>}
  </div>;
}
