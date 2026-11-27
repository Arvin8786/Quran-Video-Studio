export function recorderMime(MediaRecorderClass=globalThis.MediaRecorder){
  if(!MediaRecorderClass?.isTypeSupported)return '';
  return ['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp8,opus','video/webm'].find(type=>MediaRecorderClass.isTypeSupported(type))||'';
}
export const NATURE_SOUND_OPTIONS=[['auto','Match the scene'],['ocean','Ocean waves'],['rain','Gentle rain'],['wind','Soft wind'],['drone','Calm tone'],['silent','No sound']];
export const NATURE_LENGTH_OPTIONS=[[15,'15 seconds'],[60,'1 minute'],[300,'5 minutes'],[600,'10 minutes'],[1800,'30 minutes'],[3600,'1 hour']];
const SCENE_SOUNDS={sea:'ocean',river:'ocean',rain:'rain',forest:'wind',mountain:'wind'};
/** Picks the soundtrack for a nature video; "auto" follows the scenery category. */
export const resolveNatureSound=(sound,category)=>sound&&sound!=='auto'?sound:(SCENE_SOUNDS[category]||'ocean');
export const formatClock=seconds=>{const total=Math.max(0,Math.round(seconds)),h=Math.floor(total/3600),m=Math.floor(total%3600/60),s=String(total%60).padStart(2,'0');return h?`${h}:${String(m).padStart(2,'0')}:${s}`:`${m}:${s}`;};
const noiseBuffers=new WeakMap();
function noiseBuffer(context,color){
  let cache=noiseBuffers.get(context);if(!cache){cache={};noiseBuffers.set(context,cache);}
  if(cache[color])return cache[color];
  const length=context.sampleRate*8,buffer=context.createBuffer(2,length,context.sampleRate);
  for(let channel=0;channel<2;channel++){
    const data=buffer.getChannelData(channel);let last=0,b0=0,b1=0,b2=0;
    for(let index=0;index<length;index++){
      const white=Math.random()*2-1;
      if(color==='brown'){last=(last+0.02*white)/1.02;data[index]=last*3.5;}
      else{b0=0.99765*b0+white*0.099046;b1=0.963*b1+white*0.2965164;b2=0.57*b2+white*1.0526913;data[index]=(b0+b1+b2+white*0.1848)*0.11;}
    }
  }
  return cache[color]=buffer;
}
/** Builds a nature soundtrack into output. Call start(time, duration?) once and stop() to end it early. */
export function createAmbient(context,output,sound='drone'){
  const nodes=[],sources=[],master=context.createGain();master.gain.value=0;master.connect(output);nodes.push(master);
  const lfo=(frequency,depth,target)=>{const osc=context.createOscillator(),amount=context.createGain();osc.frequency.value=frequency;amount.gain.value=depth;osc.connect(amount);amount.connect(target);sources.push(osc);nodes.push(amount);};
  const noise=(color,filters,level)=>{const source=context.createBufferSource();source.buffer=noiseBuffer(context,color);source.loop=true;let node=source;for(const [type,frequency,q] of filters){const filter=context.createBiquadFilter();filter.type=type;filter.frequency.value=frequency;if(q)filter.Q.value=q;node.connect(filter);node=filter;nodes.push(filter);}const gain=context.createGain();gain.gain.value=level;node.connect(gain);gain.connect(master);nodes.push(gain);sources.push(source);return {gain,filter:node};};
  if(sound==='ocean'){const {gain}=noise('brown',[['lowpass',600]],0.45);lfo(1/11,0.3,gain.gain);}
  else if(sound==='rain'){noise('pink',[['highpass',800],['lowpass',7000]],0.4);}
  else if(sound==='wind'){const {gain,filter}=noise('brown',[['bandpass',450,0.7]],0.5);lfo(1/14,0.25,gain.gain);lfo(1/23,180,filter.frequency);}
  else if(sound==='drone'){[[216,'sine',0.08],[324,'triangle',0.04]].forEach(([frequency,type,level])=>{const osc=context.createOscillator(),gain=context.createGain();osc.type=type;osc.frequency.value=frequency;gain.gain.value=level;osc.connect(gain);gain.connect(master);sources.push(osc);nodes.push(gain);});}
  // A silent clock keeps timing identical for every soundtrack, including "No sound".
  const clock=context.createConstantSource();clock.offset.value=0;clock.connect(master);sources.push(clock);
  const ended=new Promise(resolve=>{clock.onended=resolve;});
  let stopped=false;
  const stop=(at=context.currentTime)=>{if(stopped)return;stopped=true;const fade=Math.max(at,context.currentTime);try{master.gain.cancelScheduledValues(fade);master.gain.setTargetAtTime(0,fade,0.3);}catch{}for(const source of sources){try{source.stop(fade+1.2);}catch{}}};
  return {ended,sources,
    start(at=context.currentTime,duration){const peak=sound==='silent'?0:1,fade=Math.min(2,duration?duration/4:2);master.gain.setValueAtTime(0,at);master.gain.linearRampToValueAtTime(peak,at+fade);for(const source of sources)source.start(at);if(duration){master.gain.setValueAtTime(peak,at+duration-fade);master.gain.linearRampToValueAtTime(0,at+duration);for(const source of sources)source.stop(at+duration);stopped=true;}},
    stop,
    disconnect(){for(const node of [...sources,...nodes]){try{node.disconnect();}catch{}}}};
}
const abortError=()=>new DOMException('Recording cancelled.','AbortError');
export async function recordFullVideo({canvas,context,verses=[],getBuffer,speed=1,duration=15,sound='drone',signal,onVerse=()=>{},onProgress=()=>{}}){
  if(!globalThis.MediaRecorder||!canvas.captureStream)throw new Error('This browser does not support video recording. Use a current Chrome, Edge or Firefox browser.');
  const mimeType=recorderMime();if(!mimeType)throw new Error('No supported recording format was found. Try Chrome or Edge.');
  signal?.throwIfAborted();await context.resume();
  const destination=context.createMediaStreamDestination(),gain=context.createGain();gain.connect(destination);gain.connect(context.destination);
  const videoStream=canvas.captureStream(30),stream=new MediaStream([...videoStream.getVideoTracks(),...destination.stream.getAudioTracks()]);
  const sources=new Set(),chunks=[];let recorder,updateTimer,finished=false,rejectRecording;
  const stopped=new Promise((resolve,reject)=>{rejectRecording=reject;});stopped.catch(()=>{});
  const abort=()=>{rejectRecording(abortError());};signal?.addEventListener('abort',abort,{once:true});
  const visibility=()=>{
    if(document.hidden&&recorder?.state==='recording'){recorder.pause();context.suspend().catch(()=>{});onProgress('Recording paused. Return to this tab to finish the full video.');}
    else if(!document.hidden&&recorder?.state==='paused'){context.resume().then(()=>{if(recorder.state==='paused')recorder.resume();}).catch(rejectRecording);}
  };
  document.addEventListener('visibilitychange',visibility);
  try{
    const first=verses.length?await Promise.race([getBuffer(verses[0].audioUrl),stopped]):null;
    if(verses.length&&!first)throw new Error('The first recitation audio could not be loaded. Choose another reciter or check your connection.');
    signal?.throwIfAborted();
    // Long scenery recordings use a lower bitrate so an hour stays within browser memory.
    recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:!verses.length&&duration>300?2500000:5000000,audioBitsPerSecond:192000});
    const result=new Promise((resolve,reject)=>{
      recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
      recorder.onerror=()=>{const error=new Error('Recording failed. No partial video was saved.');rejectRecording(error);reject(error);};
      recorder.onstop=()=>{if(!finished){reject(signal?.aborted?abortError():new Error('The recording ended before the full video completed.'));return;}const blob=new Blob(chunks,{type:mimeType.split(';')[0]});blob.size?resolve(blob):reject(new Error('The recording was empty. Please try again.'));};
    });result.catch(()=>{});recorder.start(1000);
    let lastEnded;
    if(verses.length){
      let next=context.currentTime+0.08;const timeline=[];
      updateTimer=setInterval(()=>{const current=timeline.filter(item=>item.start<=context.currentTime).at(-1);if(current)onVerse(current.index);},50);
      for(let index=0;index<verses.length;index++){
        signal?.throwIfAborted();
        // Only a short look-ahead is retained, so complete long Surahs do not exhaust memory.
        const buffer=index===0?first:await Promise.race([getBuffer(verses[index].audioUrl),stopped]);
        if(!buffer)throw new Error(`Recitation verse ${index+1} could not be loaded. No incomplete video was saved.`);
        signal?.throwIfAborted();
        while(next>context.currentTime+3){await Promise.race([new Promise(resolve=>setTimeout(resolve,100)),stopped]);signal?.throwIfAborted();}
        next=Math.max(next,context.currentTime+0.04);const source=context.createBufferSource();source.buffer=buffer;source.playbackRate.value=speed;source.connect(gain);sources.add(source);
        timeline.push({index,start:next});const end=new Promise(resolve=>{source.onended=()=>{source.disconnect();source.buffer=null;sources.delete(source);resolve();};});source.start(next);next+=buffer.duration/speed;lastEnded=end;
        onProgress(`Recording all ${verses.length} verses`);
        for(const upcoming of verses.slice(index+1,index+4))getBuffer(upcoming.audioUrl).catch(()=>null);
      }
    }else{
      const ambient=createAmbient(context,gain,sound);ambient.sources.forEach(source=>sources.add(source));const start=context.currentTime+0.05;
      lastEnded=ambient.ended;ambient.start(start,duration);
      const report=()=>onProgress(`Recording ${formatClock(Math.min(duration,Math.max(0,context.currentTime-start)))} of ${formatClock(duration)} — keep this tab open`);
      report();updateTimer=setInterval(report,1000);
    }
    await Promise.race([lastEnded,stopped]);signal?.throwIfAborted();finished=true;recorder.stop();
    return await Promise.race([result,stopped]);
  }finally{
    signal?.removeEventListener('abort',abort);document.removeEventListener('visibilitychange',visibility);clearInterval(updateTimer);
    for(const source of sources){source.onended=null;try{source.stop();source.disconnect();}catch{}}
    if(recorder&&recorder.state!=='inactive'){recorder.onstop=null;recorder.stop();}
    stream.getTracks().forEach(track=>track.stop());gain.disconnect();destination.disconnect();
  }
}
