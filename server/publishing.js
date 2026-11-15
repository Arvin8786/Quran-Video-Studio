import { createHash, randomUUID } from 'node:crypto';
import {publishInstagram,publishTikTok} from './social-video.js';
const MAX_VIDEO_BYTES = 70 * 1024 * 1024;
const SUPPORTED = ['youtube', 'facebook', 'instagram', 'tiktok'];
const studioUrl = (provider, channelId) => ({youtube:'https://studio.youtube.com/',facebook:`https://www.facebook.com/${encodeURIComponent(channelId||'')}`,instagram:'https://www.instagram.com/',tiktok:'https://www.tiktok.com/'})[provider];
class PublishError extends Error {
  constructor(message, status = 502, details = {}) {
    super(message);
    this.status = status;
    Object.assign(this, details);
  }
}

/** One instance per server. Requests with the same operation key share an upload. */
export function createPublisher({
  readSessions,
  writeSessions,
  writeHistory,
  fetchImpl = fetch,
  graphApi = 'https://graph.facebook.com/v24.0',
  googleClientId,
  googleClientSecret,
  tikTokClientKey,
  tikTokClientSecret,
  requestTimeoutMs = 20000,
  uploadTimeoutMs = 120000,
  now = Date.now,
  prepareVideo = async (buffer,mime,provider) => ({buffer,mime,duration:0})
}) {
  const operations = new Map();
  const operationsById = new Map();
  const identity = session => `${session.channelId || session.accountName || session.id || ''}`;
  function updateMatching(provider, original, update) {
    const latest = readSessions();
    const current = latest[provider];
    if (!current || !current.connected || identity(current) !== identity(original) || current.accessToken !== original.accessToken) return false;
    latest[provider] = {
      ...current,
      ...update
    };
    writeSessions(latest);
    return true;
  }
  function invalidate(provider, original) {
    try {
      updateMatching(provider, original, {
        connected: false,
        verified: false
      });
    } catch {/* Keep the provider error visible. */}
  }
  async function request(url, options, timeout = requestTimeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetchImpl(url, {
        ...options,
        signal: controller.signal
      });
      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }
      return {
        response,
        data
      };
    } catch (error) {
      throw new PublishError(controller.signal.aborted ? 'The platform did not respond in time.' : 'Could not reach the platform. Check your connection and retry.', 504);
    } finally {
      clearTimeout(timer);
    }
  }
  function providerError(provider, response, data, original) {
    const authError = response.status === 401 || provider === 'facebook' && data.error?.code === 190;
    if (authError) invalidate(provider, original);
    return new PublishError(authError ? `Reconnect your ${provider === 'youtube' ? 'YouTube' : 'Facebook Page'} account before posting.` : data.error?.message || `The platform rejected the upload (${response.status}).`, authError ? 401 : 502, {
      authError
    });
  }
  async function upload(provider, input, original, videoBuffer, mime, operation) {
    let session = {...original};
    operation.provider=provider; operation.session=session;
    if(provider==='tiktok'&&session.refreshToken&&tikTokClientKey&&tikTokClientSecret&&(!session.expiresAt||session.expiresAt<now()+60000)){
      const {response,data}=await request('https://open.tiktokapis.com/v2/oauth/token/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_key:tikTokClientKey,client_secret:tikTokClientSecret,grant_type:'refresh_token',refresh_token:session.refreshToken})});
      if(!response.ok||!data.access_token)throw new PublishError(data.error_description||'TikTok authorization expired. Reconnect your account.',401,{authError:true});
      const update={accessToken:data.access_token,refreshToken:data.refresh_token||session.refreshToken,expiresAt:now()+(data.expires_in||86400)*1000};
      if(!updateMatching(provider,session,update))throw new PublishError('The connected account changed. Review it before retrying.',409);
      session={...session,...update};operation.session=session;
    }
    if(['tiktok','instagram'].includes(provider)){const prepared=await prepareVideo(videoBuffer,mime,provider);videoBuffer=prepared.buffer;mime=prepared.mime;operation.duration=prepared.duration;}
    let result;
    let delivery = input.privacy === 'public' ? 'uploaded' : 'private';
    if (provider === 'youtube') {
      if (session.refreshToken && googleClientId && googleClientSecret && (!session.expiresAt || session.expiresAt < now() + 60000)) {
        const {
          response,
          data
        } = await request('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            client_id: googleClientId,
            client_secret: googleClientSecret,
            refresh_token: session.refreshToken,
            grant_type: 'refresh_token'
          })
        });
        if (!response.ok || !data.access_token) {
          if (data.error === 'invalid_grant' || response.status === 401) {
            invalidate(provider, session);
            throw new PublishError('YouTube authorization expired. Reconnect your account.', 401, {
              authError: true
            });
          }
          throw new PublishError(data.error_description || 'Could not refresh YouTube authorization. Please retry.');
        }
        if (!updateMatching(provider, session, {
          accessToken: data.access_token,
          expiresAt: now() + (data.expires_in || 3600) * 1000
        })) {
          throw new PublishError('The connected account changed. Review the selected account and retry.', 409);
        }
        session = {
          ...session,
          accessToken: data.access_token
        };
      }
      const authorization = `Bearer ${session.accessToken}`;
      const tags = input.hashtags.map(tag => tag.replace(/^#/, ''));
      const description = `${input.description}\n\n${input.hashtags.join(' ')}`.trim().slice(0, 5000);
      const start = await request('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
        method: 'POST',
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': mime,
          'X-Upload-Content-Length': String(videoBuffer.length)
        },
        body: JSON.stringify({
          snippet: {
            title: input.title.slice(0, 100),
            description,
            tags,
            categoryId: '22'
          },
          status: {
            privacyStatus: input.privacy,
            selfDeclaredMadeForKids: false
          }
        })
      });
      if (!start.response.ok) throw providerError(provider, start.response, start.data, session);
      const uploadUrl = start.response.headers.get('location');
      if (!uploadUrl || !uploadUrl.startsWith('https://')) throw new PublishError('YouTube did not provide a valid upload session. Please retry.');
      let completed;
      try {
        completed = await request(uploadUrl, {
          method: 'PUT',
          headers: {
            Authorization: authorization,
            'Content-Type': mime,
            'Content-Length': String(videoBuffer.length)
          },
          body: new Uint8Array(videoBuffer)
        }, uploadTimeoutMs);
      } catch {
        // The final response may be lost after YouTube accepted the bytes. Check this session before allowing a retry.
        try {
          completed = await request(uploadUrl, {
            method: 'PUT',
            headers: {
              Authorization: authorization,
              'Content-Length': '0',
              'Content-Range': `bytes */${videoBuffer.length}`
            }
          });
          if (![200, 201, 308, 401, 404].includes(completed.response.status)) throw new PublishError('Upload status unavailable.', 502);
          if (completed.response.status === 308) throw new PublishError('YouTube received an incomplete upload. Please retry.', 502, {
            incomplete: true
          });
        } catch (error) {
          if (error.incomplete) throw error;
          throw new PublishError('YouTube may have received this video. Check YouTube Studio before attempting another upload.', 502, {
            uncertain: true
          });
        }
      }
      if (!completed.response.ok) throw providerError(provider, completed.response, completed.data, session);
      if (!completed.data.id) throw new PublishError('YouTube accepted the request without a video ID. Check YouTube Studio before uploading again.', 502, {
        uncertain: true
      });
      result = completed.data;
      delivery = (result.status?.privacyStatus || input.privacy) === 'public' ? 'uploaded' : 'private';
    } else if(provider==='instagram'||provider==='tiktok'){
      const result = await (provider==='instagram'?publishInstagram({request,session,input,video:videoBuffer,mime,graphApi,uploadTimeoutMs}):publishTikTok({request,session,input,video:videoBuffer,mime,duration:operation.duration,uploadTimeoutMs}));
      return settle(provider,input,session,original,result,operation);
    } else {
      if (!session.channelId) throw new PublishError('Connect a Facebook Page and its Page access token before posting.', 400);
      const form = new FormData();
      form.set('access_token', session.accessToken);
      form.set('title', input.title.slice(0, 100));
      form.set('description', `${input.description}\n\n${input.hashtags.join(' ')}`.trim());
      form.set('published', String(input.privacy === 'public'));
      form.set('source', new Blob([new Uint8Array(videoBuffer)], {
        type: mime
      }), input.videoFileName || 'ProEase.mp4');
      let completed;
      try {
        completed = await request(`${graphApi}/${encodeURIComponent(session.channelId)}/videos`, {
          method: 'POST',
          body: form
        }, uploadTimeoutMs);
      } catch {
        throw new PublishError('Facebook may have received this video. Check your Page before attempting another upload.', 502, {
          uncertain: true
        });
      }
      if (!completed.response.ok || completed.data.error) throw providerError(provider, completed.response, completed.data, session);
      if (!completed.data.id) throw new PublishError('Facebook did not confirm a video ID. Check your Page before uploading again.', 502, {
        uncertain: true
      });
      result = completed.data;
      delivery = input.privacy === 'public' ? 'uploaded' : 'draft';
    }
    return settle(provider,input,session,original,{...result,delivery},operation);
  }
  async function settle(provider,input,session,original,result,operation){
    if(result.pending){
      operation.resume=async()=>{
        const current=readSessions()[provider];
        if(!current?.connected||identity(current)!==identity(original)||current.accessToken!==session.accessToken)throw new PublishError('The account was disconnected or changed. Reconnect before checking this post.',401,{authError:true,uncertain:true});
        return settle(provider,input,session,original,await result.resume(),operation);
      };
      return {status:202,body:{success:true,pending:true,operationId:operation.id,provider,message:result.message||'The platform is processing this video.'}};
    }
    operation.resume=null;
    if(!['string','number'].includes(typeof result.id)||!String(result.id).length)throw new PublishError('The platform did not confirm a valid post ID. Check your account before retrying.',502,{uncertain:true});
    const postId=String(result.id),delivery=result.delivery||'uploaded';
    const postUrl=result.postUrl||(provider==='youtube'?`https://youtube.com/watch?v=${encodeURIComponent(postId)}`:provider==='facebook'?`https://facebook.com/${encodeURIComponent(postId)}`:'');
    const warnings = [];
    // An upload is already confirmed. A local disk error must never turn it into a failed upload.
    try {
      const latest = readSessions();
      const current = latest[provider];
      if (current && identity(current) === identity(session)) {
        latest[provider] = {
          ...current,
          totalPosts: (Number(current.totalPosts) || 0) + 1,
          lastPostDate: new Date(now()).toISOString()
        };
        writeSessions(latest);
      }
    } catch {
      warnings.push('The upload succeeded, but account statistics could not be saved.');
    }
    try {
      writeHistory({
        id: `pub_${provider}_${postId}`,
        provider,
        title: input.title,
        date: new Date(now()).toLocaleString(),
        timestamp: now(),
        status: 'success',
        privacy: input.privacy,
        delivery,
        postUrl,
        platformPostId: postId,
        accountName: original.accountName || ''
      });
    } catch {
      warnings.push('The upload succeeded, but publication history could not be saved.');
    }
    return {
      status: 200,
      body: {
        success: true,
        provider,
        postId,
        postUrl,
        delivery,
        message: result.message || (delivery === 'draft' ? 'Uploaded as a Facebook draft.' : delivery === 'private' ? 'Uploaded with restricted visibility.' : 'Video uploaded. The platform may still be processing it.'),
        warning: warnings.join(' ') || undefined
      }
    };
  }
  const publish = async function publish(provider, body = {}, operationKey = '') {
    if (!SUPPORTED.includes(provider)) return {
      status: 400,
      body: {
        success: false,
        error: 'Choose YouTube, Facebook, Instagram or TikTok.'
      }
    };
    if (!body || typeof body !== 'object' || typeof body.title !== 'string' || !body.title.trim() || typeof body.description !== 'string' || body.description.length > 5000 || !Array.isArray(body.hashtags) || body.hashtags.length > 30 || body.hashtags.some(tag => typeof tag !== 'string' || tag.length > 80) || !['public', 'private', 'unlisted'].includes(body.privacy || 'public')) {
      return {
        status: 400,
        body: {
          success: false,
          error: 'Check the video title, description, hashtags and privacy settings.'
        }
      };
    }
    const match = typeof body.videoDataUrl === 'string' && body.videoDataUrl.match(/^data:(video\/[\w.+-]+)(?:;[^,]*)?;base64,([A-Za-z0-9+/=\s]+)$/);
    if (!match) return {
      status: 400,
      body: {
        success: false,
        error: 'No video attached. Process a video before posting.'
      }
    };
    const video = Buffer.from(match[2], 'base64');
    if (!video.length || video.length > MAX_VIDEO_BYTES) return {
      status: 413,
      body: {
        success: false,
        error: 'Social uploads support videos up to 70 MB. Download larger videos for manual upload.'
      }
    };
    const session = readSessions()[provider];
    if (!session?.connected || !session.accessToken) return {
      status: 401,
      body: {
        success: false,
        authError: true,
        error: 'Reconnect this account before posting.'
      }
    };
    const input = {
      ...body,
      title: body.title.trim(),
      privacy: body.privacy || 'public'
    };
    const fingerprint = createHash('sha256').update(video).update(JSON.stringify([input.title, input.description, input.hashtags, input.privacy,input.tiktokPrivacy,input.disableDuet,input.disableStitch,input.disableComment])).digest('hex');
    const key = `${provider}:${identity(session)}:${String(operationKey || fingerprint).slice(0, 200)}`;
    for (const [id, operation] of operations) if (operation.expires < now() && !operation.pending) {operations.delete(id);operationsById.delete(operation.id);}
    const existing = operations.get(key);
    if (existing) {
      if (existing.fingerprint !== fingerprint) return {
        status: 409,
        body: {
          success: false,
          error: 'This publishing operation belongs to a different video or caption. Review the completed video before posting.'
        }
      };
      return existing.promise;
    }
    const operation = {
      id:randomUUID(),resume:null,key,
      fingerprint,
      expires: now() + 86400000,
      pending: true,
      promise: null
    };
    operation.promise = (async () => {
      try {
        return await upload(provider, input, session, video, match[1],operation);
      } catch (error) {
        if(error.authError)invalidate(provider,session);
        if (!error.uncertain) {operations.delete(key);operationsById.delete(operation.id);}
        return {
          status: error.status || 502,
          body: {
            success: false,
            provider,
            error: error.message || 'The upload could not be completed.',
            authError: !!error.authError,
            uncertain: !!error.uncertain,
            postUrl: studioUrl(provider, session.channelId)
          }
        };
      } finally {
        operation.pending = false;
      }
    })();
    operations.set(key, operation);operationsById.set(operation.id,operation);
    return operation.promise;
  };
  publish.getStatus=async id=>{
    const operation=operationsById.get(id);if(!operation||operation.expires<now())return {status:404,body:{success:false,uncertain:true,error:'This publishing operation expired. Check the platform before uploading again.'}};
    if(operation.pending||!operation.resume)return operation.promise;
    operation.pending=true;
    operation.promise=(async()=>{try{return await operation.resume();}catch(error){
      if(error.authError)invalidate(operation.provider,operation.session);
      // A temporary status-query failure must retain the uploaded operation for a safe retry.
      if(error.uncertain||error.permanent){operation.resume=null;if(error.permanent){operations.delete(operation.key);operationsById.delete(operation.id);}}
      return {status:error.status||502,body:{success:false,operationId:id,pending:!error.uncertain&&!error.permanent,error:error.message,uncertain:!!error.uncertain,authError:!!error.authError}};
    }finally{operation.pending=false;}})();
    return operation.promise;
  };
  return publish;
}
