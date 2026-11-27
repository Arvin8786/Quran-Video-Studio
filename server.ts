import express, { Request, Response } from 'express';
import { createPublisher } from './server/publishing.js';
import {studioAccess} from './server/access.js';
import {getTikTokCreator} from './server/social-video.js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import http from 'http';
import https from 'https';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { randomBytes, timingSafeEqual } from 'crypto';
import { pipeline } from 'stream/promises';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const runExecFile = promisify(execFile);
const execFileAsync = (file: string, args: string[], signal?: AbortSignal) => runExecFile(file,
  file === 'ffmpeg' ? ['-hide_banner', '-loglevel', 'error', ...args] : args,
  { maxBuffer: 4 * 1024 * 1024, signal });
const app = express();
app.set('trust proxy',1);
app.use(studioAccess({key:process.env.STUDIO_ACCESS_KEY||'',allowedOrigins:(process.env.STUDIO_ALLOWED_ORIGINS||'https://arvin8786.github.io').split(',').map(value=>value.trim()).filter(Boolean),production:process.env.NODE_ENV==='production'}));
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware for parsing JSON and large media payloads
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Persistent Storage Directory for Social Sessions & History
const DATA_DIR = process.env.PROEASE_DATA_DIR || path.join(process.cwd(), '.data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DEFAULT_BG_PATH = path.join(DATA_DIR, 'default_bg.mp4');
if (!fs.existsSync(DEFAULT_BG_PATH)) {
  downloadFile('https://videos.pexels.com/video-files/5535406/5535406-hd_1920_1080_30fps.mp4', DEFAULT_BG_PATH).catch(() => {});
}
const SESSIONS_FILE = path.join(DATA_DIR, 'social_sessions.json');
const HISTORY_FILE = path.join(DATA_DIR, 'publish_history.json');

// Session Store Helpers
interface SocialSession {
  id: string;
  name: string;
  badge: string;
  color: string;
  connected: boolean;
  accountName: string;
  handle: string;
  channelId?: string;
  avatar: string;
  autoPost: boolean;
  privacy: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  connectedAt?: string | null;
  totalPosts: number;
  lastPostDate?: string;
  verified?: boolean;
}

const DEFAULT_SESSIONS: Record<string, SocialSession> = {
  youtube: {
    id: 'youtube',
    name: 'YouTube & Shorts',
    badge: '🔴 YouTube',
    color: '#ef4444',
    connected: false,
    accountName: '',
    handle: '',
    avatar: '🕊️',
    autoPost: true,
    privacy: 'public',
    totalPosts: 0,
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    badge: '🎵 TikTok',
    color: '#ec4899',
    connected: false,
    accountName: '',
    handle: '',
    avatar: '✨',
    autoPost: true,
    privacy: 'public',
    totalPosts: 0,
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook Page & Reels',
    badge: '📘 Facebook',
    color: '#3b82f6',
    connected: false,
    accountName: '',
    handle: '',
    avatar: '📖',
    autoPost: true,
    privacy: 'public',
    totalPosts: 0,
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram Reels',
    badge: '📸 Instagram',
    color: '#f43f5e',
    connected: false,
    accountName: '',
    handle: '',
    avatar: '🌙',
    autoPost: true,
    privacy: 'public',
    totalPosts: 0,
  },
};

function readSessions(): Record<string, SocialSession> {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
      return { ...structuredClone(DEFAULT_SESSIONS), ...data };
    }
  } catch (err) {
    console.error('Error reading sessions file:', err);
  }
  return structuredClone(DEFAULT_SESSIONS);
}

function writeSessions(sessions: Record<string, SocialSession>) {
  const temporary = `${SESSIONS_FILE}.${randomBytes(6).toString('hex')}.tmp`;
  try {
    fs.writeFileSync(temporary, JSON.stringify(sessions, null, 2), { encoding: 'utf-8', mode: 0o600 });
    fs.renameSync(temporary, SESSIONS_FILE);
  } finally { fs.rmSync(temporary, { force: true }); }
}

function readHistory(): any[] {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading history file:', err);
  }
  return [];
}

function writeHistory(entry: any) {
  const list = readHistory();
  if (!Array.isArray(list)) throw new Error('Publication history could not be read');
  list.unshift(entry);
  const temporary = `${HISTORY_FILE}.${randomBytes(6).toString('hex')}.tmp`;
  try {
    fs.writeFileSync(temporary, JSON.stringify(list.slice(0, 50), null, 2), { encoding: 'utf-8', mode: 0o600 });
    fs.renameSync(temporary, HISTORY_FILE);
  } finally { fs.rmSync(temporary, { force: true }); }
}

// Helper to determine exact callback URL based on AI Studio runtime environment
function getCallbackUrl(req: Request): string {
  if (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL) {
    const base = (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL)!.replace(/\/+$/, '');
    return `${base}/auth/callback`;
  }
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || `localhost:${PORT}`;
  return `${proto}://${host}/auth/callback`;
}

// ----------------------------------------------------
// 1. Social Media Authentication & Session Status APIs
// ----------------------------------------------------

// Never send access or refresh tokens back to the browser.
function publicSession(session: SocialSession) {
  const { accessToken, refreshToken, ...visible } = session;
  return { ...visible, hasToken: !!accessToken };
}
const oauthStates = new Map<string, { provider: string; expires: number; returnOrigin?: string; authorizationUrl?: string }>();
const supportedProviders = ['youtube', 'facebook', 'instagram', 'tiktok'];
const GRAPH_API = `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || 'v24.0'}`;

app.get('/api/auth/status', (req: Request, res: Response) => {
  res.json({
    sessions: Object.fromEntries(Object.entries(readSessions()).map(([id, session]) => [id, publicSession(session)])),
    callbackUrl: getCallbackUrl(req),
    configuredProviders: {
      youtube: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      facebook: !!(process.env.META_APP_ID && process.env.META_APP_SECRET),
      tiktok: !!(process.env.TIKTOK_CLIENT_KEY&&process.env.TIKTOK_CLIENT_SECRET), instagram: !!(process.env.META_APP_ID&&process.env.META_APP_SECRET),
    },
  });
});

app.get('/api/auth/:provider/url', (req: Request, res: Response) => {
  const { provider } = req.params;
  if (!supportedProviders.includes(provider)) return res.status(501).json({ error: 'Automatic connection is not supported for this platform. Use the manual upload links.' });
  const callbackUrl = getCallbackUrl(req);
  const configured = provider === 'youtube'
    ? process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    : provider==='tiktok'?process.env.TIKTOK_CLIENT_KEY&&process.env.TIKTOK_CLIENT_SECRET:process.env.META_APP_ID && process.env.META_APP_SECRET;
  if (!configured) return res.json({ provider, url: '', isConfigured: false, callbackUrl });
  const state = randomBytes(32).toString('hex');
  for (const [key, entry] of oauthStates) if (entry.expires < Date.now()) oauthStates.delete(key);
  oauthStates.set(state, { provider, expires: Date.now() + 10 * 60 * 1000, returnOrigin:req.get('Origin')||new URL(callbackUrl).origin });

  const params = new URLSearchParams({
    [provider==='tiktok'?'client_key':'client_id']: (provider === 'youtube' ? process.env.GOOGLE_CLIENT_ID : provider==='tiktok'?process.env.TIKTOK_CLIENT_KEY:process.env.META_APP_ID)!,
    redirect_uri: callbackUrl, response_type: 'code', state,
    scope: provider === 'youtube'
      ? 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly'
      : provider==='tiktok'?'user.info.basic,video.publish':provider==='instagram'?'pages_show_list,pages_read_engagement,instagram_basic,instagram_content_publish':'pages_show_list,pages_read_engagement,pages_manage_posts',
  });
  if (provider === 'youtube') { params.set('access_type', 'offline'); params.set('prompt', 'consent'); }
  const base = provider === 'youtube' ? 'https://accounts.google.com/o/oauth2/v2/auth' : provider==='tiktok'?'https://www.tiktok.com/v2/auth/authorize/':'https://www.facebook.com/v24.0/dialog/oauth';
  oauthStates.get(state)!.authorizationUrl=`${base}?${params}`;
  res.json({ provider, url: `${new URL(callbackUrl).origin}/auth/start/${state}`, isConfigured: true, callbackUrl });
});

app.get('/auth/start/:state',(req: Request,res: Response)=>{
 const entry=oauthStates.get(req.params.state);if(!entry||entry.expires<Date.now()||!entry.authorizationUrl)return res.status(400).send('This sign-in has expired. Start again from your studio.');
 res.cookie('proease_oauth_state',req.params.state,{httpOnly:true,sameSite:'lax',secure:getCallbackUrl(req).startsWith('https:'),maxAge:600000,path:'/auth/callback'});
 res.redirect(entry.authorizationUrl);
});

function oauthReply(req: Request, res: Response, payload: object, success: boolean, returnOrigin?:string) {
  const data = JSON.stringify(payload).replace(/</g, '\\u003c');
  const origin = JSON.stringify(returnOrigin||new URL(getCallbackUrl(req)).origin).replace(/</g, '\\u003c');
  res.status(success ? 200 : 400).type('html').send(`<!doctype html><html><head><title>Social account connection</title></head>
    <body style="font:16px system-ui;background:#090d16;color:#f8fafc;padding:32px">
    <h2>${success ? 'Account connected' : 'Connection failed'}</h2><p id="message"></p>
    <script>const result=${data};document.getElementById('message').textContent=result.error || 'You can close this window.';
    if(window.opener){window.opener.postMessage(result,${origin});${success ? 'setTimeout(()=>window.close(),700);' : ''}}</script></body></html>`);
}

app.get(['/auth/callback', '/auth/callback/'], async (req: Request, res: Response) => {
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  const pending = oauthStates.get(state);
  const cookie = (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith('proease_oauth_state='))?.split('=')[1] || '';
  if (!pending || pending.expires < Date.now() || cookie.length !== state.length || !timingSafeEqual(Buffer.from(cookie), Buffer.from(state))) {
    return oauthReply(req, res, { type: 'OAUTH_AUTH_ERROR', error: 'This sign-in expired or was not started in this browser. Please try connecting again.' }, false);
  }
  oauthStates.delete(state);
  res.clearCookie('proease_oauth_state', { path: '/auth/callback' });
  const provider = pending.provider;
  try {
    if (req.query.error) throw new Error(String(req.query.error_description || req.query.error));
    if (typeof req.query.code !== 'string') throw new Error('The provider did not return an authorization code.');
    let tokenData: any;
    let channelId = '', accountName = '', handle = '', avatar = '';
    if (provider === 'youtube') {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ code: req.query.code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: getCallbackUrl(req), grant_type: 'authorization_code' }),
        signal: AbortSignal.timeout(20000),
      });
      tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) throw new Error(tokenData.error_description || 'Google did not authorize this account.');
      const profileRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', { headers: { Authorization: `Bearer ${tokenData.access_token}` }, signal: AbortSignal.timeout(20000) });
      const profile: any = await profileRes.json();
      const channel = profile.items?.[0];
      if (!profileRes.ok || !channel) throw new Error(profile.error?.message || 'No YouTube channel was found for this account.');
      channelId = channel.id; accountName = channel.snippet.title; handle = channel.snippet.customUrl || accountName; avatar = channel.snippet.thumbnails?.default?.url || '';
    } else if(provider==='tiktok') {
      const tokenRes=await fetch('https://open.tiktokapis.com/v2/oauth/token/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_key:process.env.TIKTOK_CLIENT_KEY!,client_secret:process.env.TIKTOK_CLIENT_SECRET!,code:req.query.code,grant_type:'authorization_code',redirect_uri:getCallbackUrl(req)}),signal:AbortSignal.timeout(20000)});
      tokenData=await tokenRes.json();if(!tokenRes.ok||!tokenData.access_token)throw new Error(tokenData.error_description||'TikTok did not authorize this account.');
      const profileRes=await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url',{headers:{Authorization:`Bearer ${tokenData.access_token}`},signal:AbortSignal.timeout(20000)});
      const profile:any=await profileRes.json();if(!profileRes.ok||profile.error?.code!=='ok'||!profile.data?.user?.open_id)throw new Error('TikTok profile could not be verified.');
      channelId=profile.data.user.open_id;accountName=profile.data.user.display_name;handle=accountName;avatar=profile.data.user.avatar_url;
    } else {
      const params = new URLSearchParams({ client_id: process.env.META_APP_ID!, client_secret: process.env.META_APP_SECRET!, redirect_uri: getCallbackUrl(req), code: req.query.code });
      const tokenRes = await fetch(`${GRAPH_API}/oauth/access_token?${params}`, { signal: AbortSignal.timeout(20000) });
      tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) throw new Error(tokenData.error?.message || 'Facebook did not authorize this account.');
      const pagesRes = await fetch(`${GRAPH_API}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}`, { headers: { Authorization: `Bearer ${tokenData.access_token}` }, signal: AbortSignal.timeout(20000) });
      const pages: any = await pagesRes.json();
      if (!pagesRes.ok || !pages.data?.length) throw new Error(pages.error?.message || 'No Facebook Page is available. Connect a Page access token and Page ID directly.');
      if (pages.data.length > 1) throw new Error('Multiple Facebook Pages are available. Use Direct Token to select the Page access token and Page ID you want to post to.');
      const page = pages.data[0];
      tokenData.access_token = page.access_token;
      if(provider==='instagram'){if(!page.instagram_business_account?.id)throw new Error('This Page has no linked Instagram professional account. Connect its Instagram account ID directly.');channelId=page.instagram_business_account.id;accountName=page.instagram_business_account.username;handle=accountName;}else{channelId=page.id;accountName=page.name;handle=page.name;}
    }
    const sessions = readSessions();
    const savedSession: SocialSession = { ...sessions[provider], connected: true, verified: true,
      accessToken: tokenData.access_token, refreshToken: tokenData.refresh_token || sessions[provider]?.refreshToken || '',
      expiresAt: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined,
      channelId, accountName, handle, avatar: avatar || sessions[provider].avatar,
      connectedAt: new Date().toISOString(), autoPost: true };
    sessions[provider] = savedSession;
    writeSessions(sessions);
    return oauthReply(req, res, { type: 'OAUTH_AUTH_SUCCESS', provider, session: publicSession(savedSession) }, true, pending.returnOrigin);
  } catch (error: any) {
    return oauthReply(req, res, { type: 'OAUTH_AUTH_ERROR', error: error.message || 'Connection failed. Please retry.' }, false, pending.returnOrigin);
  }
});

app.post('/api/auth/save-token', async (req: Request, res: Response) => {
  const { provider, accessToken, privacy, channelId } = req.body || {};
  if (!supportedProviders.includes(provider)) return res.status(400).json({ success: false, error: 'Choose YouTube, Facebook, Instagram or TikTok.' });
  if (typeof accessToken !== 'string' || accessToken.trim().length < 10) return res.status(400).json({ success: false, error: 'Enter a valid OAuth access token. API keys cannot authorize video uploads.' });
  try {
    const token = accessToken.trim();
    const endpoint = provider === 'youtube'
      ? 'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true'
      : provider==='tiktok'?'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url':`${GRAPH_API}/${encodeURIComponent(channelId || 'me')}?fields=${provider==='instagram'?'id,username':'id,name'}`;
    const profileRes = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000) });
    const profile: any = await profileRes.json();
    const account = provider === 'youtube' ? profile.items?.[0] : provider==='tiktok'?{...profile.data?.user,id:profile.data?.user?.open_id,name:profile.data?.user?.display_name}:profile;
    if (!profileRes.ok || !account?.id) return res.status(400).json({ success: false, error: profile.error?.message || 'This token could not be verified. Check its permissions and expiry.' });
    if (['facebook','instagram'].includes(provider) && !channelId) return res.status(400).json({ success: false, error: 'Enter the Facebook Page ID along with its Page access token.' });
    const sessions = readSessions();
    const updatedSession: SocialSession = { ...sessions[provider], connected: true, verified: true, accessToken: token,
      refreshToken: '', expiresAt: undefined, channelId: account.id, accountName: account.snippet?.title || account.username || account.name,
      handle: account.snippet?.customUrl || account.username || account.name || account.snippet?.title,
      avatar: account.snippet?.thumbnails?.default?.url || sessions[provider].avatar,
      privacy: ['public', 'private', 'unlisted'].includes(privacy) ? privacy : 'public',
      connectedAt: new Date().toISOString(), autoPost: true };
    sessions[provider] = updatedSession;
    writeSessions(sessions);
    res.json({ success: true, message: `Verified and connected ${provider.toUpperCase()}.`, session: publicSession(updatedSession) });
  } catch {
    return res.status(502).json({ success: false, error: 'Could not reach the platform to verify this token. Nothing was saved. Please retry.' });
  }
});

app.post('/api/auth/preferences', (req: Request, res: Response) => {
  const { provider, autoPost } = req.body || {};
  if (!supportedProviders.includes(provider) || typeof autoPost !== 'boolean') return res.status(400).json({ error: 'Invalid account preference.' });
  const sessions = readSessions();
  if (!sessions[provider]?.connected) return res.status(401).json({ error: 'Connect this account before updating Auto-Post.' });
  try {
    sessions[provider].autoPost = autoPost;
    writeSessions(sessions);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Could not save the account preference. Please retry.' }); }
});

// Disconnect Session Endpoint
app.post('/api/auth/disconnect', (req: Request, res: Response) => {
  const { provider } = req.body || {};
  if (!supportedProviders.includes(provider)) {
    return res.status(400).json({ error: 'Missing provider' });
  }

  const sessions = readSessions();
  if (sessions[provider]) {
    sessions[provider] = {
      ...DEFAULT_SESSIONS[provider],
      connected: false,
      accessToken: '',
      refreshToken: '',
      connectedAt: null,
      autoPost: false,
    };
    writeSessions(sessions);
  }

  res.json({ success: true, message: `Disconnected ${provider}` });
});

// ----------------------------------------------------
// 2. Real Auto-Posting & Video Publishing Engine
// ----------------------------------------------------

async function prepareSocialVideo(buffer:Buffer,mime:string,provider:string){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'proease-publish-'));
 try{
  const input=path.join(directory,'input.video');fs.writeFileSync(input,buffer);
  const probe=await execFileAsync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',input]);
  const duration=Number(probe.stdout.trim());if(!Number.isFinite(duration)||duration<=0)throw new Error('The uploaded video duration could not be verified. Re-export the full video.');
  if(provider==='instagram'&&!mime.includes('mp4')){
   const output=path.join(directory,'converted.mp4');await execFileAsync('ffmpeg',['-y','-i',input,'-map','0:v:0','-map','0:a?','-c:v','libx264','-threads','2','-preset','ultrafast','-pix_fmt','yuv420p','-c:a','aac','-movflags','+faststart',output],AbortSignal.timeout(90000));
   return {buffer:fs.readFileSync(output),mime:'video/mp4',duration};
  }
  return {buffer,mime,duration};
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
}
app.get('/api/auth/tiktok/creator',async(_req: Request,res: Response)=>{
 const session=readSessions().tiktok;if(!session.connected||!session.accessToken)return res.status(401).json({error:'Connect TikTok first.'});
 try{const creator=await getTikTokCreator(async(url:any,options:any)=>{const response=await fetch(url,{...options,signal:AbortSignal.timeout(20000)});return{response,data:await response.json()};},session.accessToken);res.json({creator});}catch(error:any){res.status(error.authError?401:502).json({error:error.message});}
});
const publishVideo = createPublisher({ readSessions, writeSessions, writeHistory, graphApi: GRAPH_API,
  googleClientId: process.env.GOOGLE_CLIENT_ID, googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  tikTokClientKey:process.env.TIKTOK_CLIENT_KEY,tikTokClientSecret:process.env.TIKTOK_CLIENT_SECRET,prepareVideo:prepareSocialVideo });
app.get('/api/publish/status/:operationId',async(req: Request,res: Response)=>{const result=await publishVideo.getStatus(req.params.operationId);res.status(result.status).json(result.body);});
app.post('/api/publish/:provider', async (req: Request, res: Response) => {
  try {
    const result = await publishVideo(req.params.provider, req.body, req.get('Idempotency-Key'));
    return res.status(result.status).json(result.body);
  } catch {
    return res.status(500).json({ success: false, error: 'Publishing could not start. Check the account connection and try again.' });
  }
});

// Publication History API
app.get('/api/publish/history', (_req: Request, res: Response) => {
  res.json({ history: readHistory() });
});

// ----------------------------------------------------
// 3. Media Proxy & FFmpeg Video Render Routes (From Vite)
// ----------------------------------------------------

function fetchStream(targetUrl: string, req: Request, res: Response, redirects = 0) {
  if (redirects > 5) {
    res.statusCode = 500;
    return res.end('Too many redirects');
  }
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== 'https:' || !/^(?:www\.)?everyayah\.com$/i.test(parsed.hostname)) {
      res.statusCode = 403;
      return res.end('Only EveryAyah recitation audio can be proxied');
    }
    const client = https;
    const reqHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: '*/*',
    };
    if (req.headers.range) {
      reqHeaders['Range'] = req.headers.range as string;
    }
    const remoteReq = client.get(
      targetUrl,
      { headers: reqHeaders },
      (remoteRes) => {
        if (
          remoteRes.statusCode &&
          remoteRes.statusCode >= 300 &&
          remoteRes.statusCode < 400 &&
          remoteRes.headers.location
        ) {
          const nextUrl = new URL(remoteRes.headers.location, targetUrl).toString();
          return fetchStream(nextUrl, req, res, redirects + 1);
        }
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Accept-Ranges', 'bytes');
        if (remoteRes.headers['content-type']) {
          res.setHeader('Content-Type', remoteRes.headers['content-type']);
        }
        if (remoteRes.headers['content-length']) {
          res.setHeader('Content-Length', remoteRes.headers['content-length']);
        }
        if (remoteRes.headers['content-range']) {
          res.setHeader('Content-Range', remoteRes.headers['content-range']);
        }
        res.statusCode = remoteRes.statusCode || 200;
        remoteRes.pipe(res);
      }
    );
    // Stop the upstream transfer if it stalls or the browser goes away.
    remoteReq.setTimeout(20000, () => remoteReq.destroy(new Error('Recitation audio timed out')));
    res.on('close', () => { if (!res.writableEnded) remoteReq.destroy(); });
    remoteReq.on('error', (err) => {
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end(err.message);
      }
    });
  } catch (err: any) {
    if (!res.headersSent) {
      res.statusCode = 400;
      res.end(err?.message || 'Invalid URL');
    }
  }
}

async function downloadFile(url: string, dest: string, timeoutMs = 20000, redirects = 0): Promise<void> {
  if (redirects > 5) throw new Error('Too many media redirects');
  const parsed = new URL(url);
  if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Invalid media URL protocol');
  await new Promise<void>((resolve, reject) => {
    const request = (parsed.protocol === 'https:' ? https : http).get(parsed, { headers: { 'User-Agent': 'ProEaseStudio/1.0' } }, response => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        clearTimeout(timer);
        downloadFile(new URL(response.headers.location, url).toString(), dest, timeoutMs, redirects + 1).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) { response.resume(); reject(new Error(`Media server returned ${response.statusCode}`)); return; }
      // Restart the stall timer while bytes keep arriving, so large HD backgrounds can finish.
      response.on('data', armTimer);
      pipeline(response, fs.createWriteStream(dest)).then(resolve, reject);
    });
    let timer: ReturnType<typeof setTimeout>;
    function armTimer() {
      clearTimeout(timer);
      timer = setTimeout(() => request.destroy(new Error('Media download timed out. Please retry or upload a local background.')), timeoutMs);
    }
    armTimer();
    request.on('error', reject);
    request.on('close', () => clearTimeout(timer));
  }).catch(error => { try { fs.rmSync(dest, { force: true }); } catch {} throw error; });
}

// Fixed verse counts keep offline fallback within the actual Surah boundaries.
const SURAH_COUNTS = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];
const quranCache = new Map<string, { data: unknown; expires: number }>();
app.get(/^\/api\/quran(\/surah(?:\/\d{1,3}\/editions\/quran-uthmani,en.transliteration,en.sahih)?)$/, async (req: Request, res: Response) => {
  const route = req.params[0];
  const cached = quranCache.get(route);
  if (cached && cached.expires > Date.now()) return res.json(cached.data);
  try {
    const response = await fetch(`https://api.alquran.cloud/v1${route}`, { signal: AbortSignal.timeout(20000) });
    const data: any = await response.json();
    if (!response.ok || data.code !== 200 || !data.data) throw new Error('Quran service unavailable');
    quranCache.set(route, { data, expires: Date.now() + 3600000 });
    res.json(data);
  } catch {
    res.status(502).json({ error: 'The Quran service could not be reached. Check your connection and try again.' });
  }
});

const RECITER_FOLDERS: Record<string, string> = {
  'Husary_128kbps': 'Husary_128kbps',
  'ar.husary': 'Husary_128kbps',
  'ar.alafasy': 'Alafasy_128kbps',
  'Alafasy_128kbps': 'Alafasy_128kbps',
  'ar.abdurrahmaansudais': 'Abdurrahmaan_As-Sudais_192kbps',
  'Abdurrahmaan_As-Sudais_192kbps': 'Abdurrahmaan_As-Sudais_192kbps',
  'ar.abdulbasit': 'Abdul_Basit_Murattal_192kbps',
  'Abdul_Basit_Murattal_192kbps': 'Abdul_Basit_Murattal_192kbps',
  'ar.minshawi': 'Minshawy_Murattal_128kbps',
  'Minshawy_Murattal_128kbps': 'Minshawy_Murattal_128kbps',
  'ar.mahermuaiqly': 'Maher_AlMuaiqly_64kbps',
  'Maher_AlMuaiqly_64kbps': 'Maher_AlMuaiqly_64kbps'
};
// The service only fetches media it actually needs, so it cannot be used to reach internal hosts.
const RECITATION_URL = /^https:\/\/(?:www\.)?everyayah\.com\/data\/[A-Za-z0-9_.-]+\/\d{6}\.mp3$/;
const SCENERY_URL = /^https:\/\/(?:[a-z0-9-]+\.)*(?:pexels\.com|vimeo\.com|vimeocdn\.com)\/[^\s]*$/i;

app.post('/api/render-video', async (req: Request, res: Response) => {
  const {
    surahNumber = 1,
    startAyah = 1,
    endAyah = 999,
    reciterFolder = 'Husary_128kbps',
    audioUrls = [],
    videoUrl,
    videoDataUrl,
    overlays = [],
    processingSpeed = 1,
    aspectRatio = '16:9',
    title = 'QuranRecitation',
    mode = 'quran'
  } = req.body || {};
  if (!['quran', 'surah', 'lessons', 'reflection', 'nature'].includes(mode) || !['16:9', '9:16'].includes(aspectRatio)
      || !Number.isFinite(processingSpeed) || processingSpeed < 0.5 || processingSpeed > 2
      || !Array.isArray(audioUrls) || audioUrls.length > 286 || !Array.isArray(overlays) || overlays.length > 286
      || typeof title !== 'string' || title.length > 500
      || !Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114
      || !Number.isInteger(startAyah) || !Number.isInteger(endAyah) || startAyah < 1 || endAyah < startAyah) {
    return res.status(400).json({ error: 'Invalid video settings. Select a valid mode, Surah, verse range, aspect ratio and speed.' });
  }
  if (!['nature', 'reflection'].includes(mode) && !RECITER_FOLDERS[reciterFolder]) {
    return res.status(400).json({ error: 'Choose a supported reciter.' });
  }
  if (audioUrls.some((url: unknown) => typeof url !== 'string' || !RECITATION_URL.test(url))) {
    return res.status(400).json({ error: 'Recitation audio must come from EveryAyah. Reload the verses and try again.' });
  }
  if (typeof videoUrl === 'string' && /^https?:/i.test(videoUrl) && !SCENERY_URL.test(videoUrl)) {
    return res.status(400).json({ error: 'This background link is not supported. Choose a preset or Pexels video, or upload a file.' });
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proease-'));
  const renderAbort = new AbortController();
  res.on('close', () => { if (!res.writableEnded) renderAbort.abort(); });
  const runMedia = (file: string, args: string[]) => execFileAsync(file, args, renderAbort.signal);
  try {
    const bgPath = path.join(tmpDir, 'bg.mp4');
    const localFallback = DEFAULT_BG_PATH;

    // 1. Resolve Background Video
    let videoReady = false;
    if(videoUrl==='gradient'){await runMedia('ffmpeg',['-y','-f','lavfi','-i','color=c=0x0a2336:s=1920x1080:r=30:d=1','-c:v','libx264','-preset','ultrafast',bgPath]);videoReady=true;}
    if (videoDataUrl) {
      const match = typeof videoDataUrl === 'string' && videoDataUrl.match(/^data:video\/[\w.+-]+(?:;[^,]*)?;base64,([A-Za-z0-9+/=\s]+)$/);
      if (!match) throw new Error('Invalid uploaded background video. Please select the file again.');
      fs.writeFileSync(bgPath, Buffer.from(match[1], 'base64'));
      videoReady = fs.statSync(bgPath).size > 0;
    }
    if (!videoReady && videoUrl && typeof videoUrl === 'string' && !videoUrl.startsWith('blob:') && (videoUrl.startsWith('http://') || videoUrl.startsWith('https://'))) {
      try {
        await downloadFile(videoUrl, bgPath);
        if (fs.existsSync(bgPath) && fs.statSync(bgPath).size > 1000) {
          videoReady = true;
        }
      } catch (e) {
        throw new Error('The selected background could not be downloaded. Choose another preset or upload a local video.');
      }
    }

    if (!videoReady && videoUrl) throw new Error('The selected background is unavailable. Please select or upload the file again.');
    if (!videoReady) {
      if (fs.existsSync(localFallback) && fs.statSync(localFallback).size > 50000) {
        fs.copyFileSync(localFallback, bgPath);
        videoReady = true;
      } else {
        const defaultVideo = 'https://videos.pexels.com/video-files/5535406/5535406-hd_1920_1080_30fps.mp4';
        try {
          await downloadFile(defaultVideo, bgPath);
          if (fs.existsSync(bgPath) && fs.statSync(bgPath).size > 1000) {
            videoReady = true;
            try { fs.copyFileSync(bgPath, localFallback); } catch(e){}
          }
        } catch(e) {}
      }
    }

    if (!videoReady) throw new Error('No usable background video is available. Please upload a local video.');

    // 2. Resolve Audio Tracks
    const audioFiles: string[] = [];
    let expectedAudioCount = Array.isArray(audioUrls) ? audioUrls.length : 0;

    const downloadInBatches = async (urls: string[]) => {
      for (let index = 0; index < urls.length; index += 6) {
        await Promise.all(urls.slice(index, index + 6).map(async (url, offset) => {
          const audioPath = path.join(tmpDir, `audio_${String(index + offset).padStart(4, '0')}.mp3`);
          await downloadFile(url, audioPath);
          if (fs.statSync(audioPath).size < 100) throw new Error('Recitation audio was empty. Please choose another reciter.');
          audioFiles.push(audioPath);
        }));
      }
      audioFiles.sort();
    };
    if (Array.isArray(audioUrls) && audioUrls.length > 0) {
      await downloadInBatches(audioUrls);
    } else if (mode === 'reflection' || mode === 'nature') {
      // Generate soothing ambient audio for reflection/nature mode
      const ambientPath = path.join(tmpDir, 'ambient.aac');
      await runMedia('ffmpeg', [
        '-y',
        '-f', 'lavfi',
        '-i', 'aevalsrc=sin(216*2*PI*t)*0.08+sin(324*2*PI*t)*0.04:d=15',
        '-c:a', 'aac',
        '-b:a', '192k',
        ambientPath
      ]);
      if (fs.existsSync(ambientPath)) {
        audioFiles.push(ambientPath);
      }
    } else {
      // Surah / Lesson lookup fallback
      const resolvedReciter = RECITER_FOLDERS[reciterFolder] || reciterFolder || 'Husary_128kbps';
      const finalAyah = Math.min(endAyah, SURAH_COUNTS[surahNumber - 1]);
      if (startAyah > finalAyah) throw new Error('The selected verse range is outside this Surah.');
      const ayahsToFetch = Array.from({ length: finalAyah - startAyah + 1 }, (_, index) => startAyah + index);

      expectedAudioCount = ayahsToFetch.length;
      const sNum = Number(surahNumber).toString().padStart(3, '0');
      await downloadInBatches(ayahsToFetch.map(num => `https://everyayah.com/data/${resolvedReciter}/${sNum}${String(num).padStart(3, '0')}.mp3`));
    }

    if (mode !== 'reflection' && mode !== 'nature') {
      if (!audioFiles.length || audioFiles.length !== expectedAudioCount) {
        throw new Error('Could not download all recitation audio. Check the network or choose another reciter and retry.');
      }
    }
    const combinedAudioPath = path.join(tmpDir, 'combined.aac');
    if (audioFiles.length > 1) {
      const concatListPath = path.join(tmpDir, 'concat.txt');
      const concatContent = audioFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n');
      fs.writeFileSync(concatListPath, concatContent);
      await runMedia('ffmpeg', [
        '-y', '-f', 'concat', '-safe', '0', '-i', concatListPath, '-c:a', 'aac', '-b:a', '192k', combinedAudioPath
      ]);
    } else if (audioFiles.length === 1) {
      await runMedia('ffmpeg', [
        '-y', '-i', audioFiles[0], '-c:a', 'aac', '-b:a', '192k', combinedAudioPath
      ]);
    } else {
      await runMedia('ffmpeg', [
        '-y', '-f', 'lavfi', '-i', 'aevalsrc=sin(216*2*PI*t)*0.08+sin(324*2*PI*t)*0.04:d=15',
        '-c:a', 'aac', '-b:a', '192k', combinedAudioPath
      ]);
    }

    const durations: number[] = [];
    for (const audioPath of audioFiles) {
      const probe = await runMedia('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', audioPath]);
      const duration = Number(probe.stdout.trim());
      if (!Number.isFinite(duration) || duration <= 0) throw new Error('A recitation audio track could not be decoded. Please choose another reciter.');
      durations.push(duration);
    }
    const speed = mode === 'nature' || mode === 'reflection' ? 1 : processingSpeed;
    const outputPath = path.join(tmpDir, 'output.mp4');
    const width = aspectRatio === '9:16' ? 1080 : 1920;
    const height = aspectRatio === '9:16' ? 1920 : 1080;
    const inputs = ['-y', '-stream_loop', '-1', '-i', bgPath, '-i', combinedAudioPath];
    let videoFilter = `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,fps=30[bg]`;
    if (overlays.length) {
      if (overlays.length !== audioFiles.length) throw new Error('The text overlays do not match the audio. Reload the verses and process again.');
      const lines = ['ffconcat version 1.0'];
      for (let index = 0; index < overlays.length; index++) {
        const match = typeof overlays[index] === 'string' && overlays[index].match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
        if (!match) throw new Error('A text overlay could not be prepared. Please retry.');
        const pngPath = path.join(tmpDir, `overlay_${index}.png`);
        fs.writeFileSync(pngPath, Buffer.from(match[1], 'base64'));
        lines.push(`file '${pngPath}'`, `duration ${durations[index] / speed}`);
      }
      lines.push(`file '${path.join(tmpDir, `overlay_${overlays.length - 1}.png`)}'`);
      const listPath = path.join(tmpDir, 'overlays.txt');
      fs.writeFileSync(listPath, lines.join('\n'));
      inputs.push('-f', 'concat', '-safe', '0', '-i', listPath);
      videoFilter += ';[bg][2:v]overlay=0:0:format=auto:eof_action=repeat[v]';
    } else {
      videoFilter += ';[bg]null[v]';
    }
    await runMedia('ffmpeg', [...inputs,
      '-filter_complex_threads', '1', '-filter_complex', videoFilter,
      '-map', '[v]', '-map', '1:a:0', '-af', `atempo=${speed}`,
      '-c:v', 'libx264', '-threads', '2', '-preset', 'ultrafast', '-crf', '23', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', outputPath,
    ]);

    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 1000) {
      throw new Error('Video generation failed to produce valid file');
    }

    const safeTitle = (title || 'QuranRecitation').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `ProEase_${safeTitle}_1080p.mp4`;

    res.download(outputPath, filename, (err) => {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch (e) {}
    });
  } catch (err: any) {
    console.error('Video rendering error:', err);
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {}
    if (!res.headersSent && !res.destroyed) {
      res.status(500).json({ error: err.message || 'Failed to render video on backend' });
    }
  }
});

app.options('/api/proxy', (_req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.sendStatus(204);
});

app.get('/api/proxy', (req: Request, res: Response) => {
  const queryUrl = req.query.url;
  if (typeof queryUrl !== 'string' || !queryUrl) {
    return res.status(400).end('Missing url param');
  }
  if (!RECITATION_URL.test(queryUrl)) {
    return res.status(403).end('Only EveryAyah recitation audio can be proxied');
  }
  fetchStream(queryUrl, req, res);
});

// ----------------------------------------------------
// 4. Mount Vite Dev Server in Middleware Mode
// ----------------------------------------------------

app.use('/api', (_req: Request, res: Response) => res.status(404).json({ error: 'API endpoint not found. Start the app with npm start or npm run preview.' }));
app.use((error: any, _req: Request, res: Response, _next: express.NextFunction) => {
  res.status(error.status || 500).json({ error: error.type === 'entity.too.large'
    ? 'The video and overlays exceed the upload limit. Use a smaller background file or a shorter verse range.'
    : error instanceof SyntaxError ? 'The request contains invalid JSON.' : 'The request could not be completed.' });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ProEase Studio Server] Active on port ${PORT}`);
    const publicUrl = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL;
    console.log(`[OAuth Callback URI] ${publicUrl ? publicUrl.replace(/\/+$/, '') + '/auth/callback' : `http://localhost:${PORT}/auth/callback`}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
