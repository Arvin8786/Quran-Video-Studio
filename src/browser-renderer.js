export function recorderMime(MediaRecorderClass=globalThis.MediaRecorder){
  if(!MediaRecorderClass?.isTypeSupported)return '';
  return ['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp8,opus','video/webm'].find(type=>MediaRecorderClass.isTypeSupported(type))||'';
}
const abortError=()=>new DOMException('Recording cancelled.','AbortError');
export async function recordFullVideo({canvas,context,verses=[],getBuffer,speed=1,duration=15,signal,onVerse=()=>{},onProgress=()=>{}}){
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
    recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:5000000,audioBitsPerSecond:192000});
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
      const a=context.createOscillator(),b=context.createOscillator();a.frequency.value=216;b.frequency.value=324;gain.gain.value=0.045;a.connect(gain);b.connect(gain);sources.add(a);sources.add(b);const start=context.currentTime+0.05;
      lastEnded=new Promise(resolve=>{b.onended=resolve;});a.start(start);b.start(start);a.stop(start+duration);b.stop(start+duration);onProgress(`Recording complete ${duration}-second video`);
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
