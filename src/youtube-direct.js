// Posts to YouTube straight from the browser, so the GitHub Pages site can publish without a server.
// Sign-in uses Google Identity Services; only the public OAuth client ID is needed, never a secret.
const build = import.meta.env || {};
const SCOPE = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly';
const CLIENT_KEY = 'proease_google_client_id', PROFILE_KEY = 'proease_youtube_direct', TOKEN_KEY = 'proease_youtube_token';
const CLIENT_ID = /^[\w-]+\.apps\.googleusercontent\.com$/;

export const googleClientId = () => (localStorage.getItem(CLIENT_KEY) || build.VITE_GOOGLE_CLIENT_ID || '').trim();
export function saveGoogleClientId(value) {
  const id = String(value || '').trim();
  if (!CLIENT_ID.test(id)) throw new Error('Enter the OAuth client ID from Google Cloud. It ends with .apps.googleusercontent.com.');
  localStorage.setItem(CLIENT_KEY, id);
  return id;
}

export function youtubeProfile() {
  try { const profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null'); return profile?.channelId ? profile : null; } catch { return null; }
}
export function saveYoutubeProfile(profile) {
  if (profile) localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); else localStorage.removeItem(PROFILE_KEY);
}

function storedToken() {
  try { const token = JSON.parse(sessionStorage.getItem(TOKEN_KEY) || 'null'); return token?.expires > Date.now() + 120000 ? token.value : ''; } catch { return ''; }
}
const forgetToken = () => { try { sessionStorage.removeItem(TOKEN_KEY); } catch {} };

let gisLoading;
/** Loads Google's sign-in library once. Call it early so sign-in can open straight from a tap. */
export function loadGoogleSignIn() {
  if (globalThis.google?.accounts?.oauth2) return Promise.resolve();
  gisLoading ||= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client'; script.async = true;
    script.onload = () => resolve();
    script.onerror = () => { gisLoading = null; reject(new Error('Google sign-in could not load. Check your connection and try again.')); };
    document.head.appendChild(script);
  });
  return gisLoading;
}

/** Returns a YouTube access token. Tokens last about an hour; afterwards Google shows a quick sign-in popup. */
export async function youtubeToken({ consent = false } = {}) {
  if (!consent) { const cached = storedToken(); if (cached) return cached; }
  const clientId = googleClientId();
  if (!clientId) throw Object.assign(new Error('Add your Google OAuth client ID to connect YouTube.'), { setupRequired: true });
  await loadGoogleSignIn();
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId, scope: SCOPE,
      callback: response => {
        if (response.error || !response.access_token) { reject(new Error(response.error_description || 'Google did not allow access to YouTube.')); return; }
        if (!google.accounts.oauth2.hasGrantedAllScopes(response, ...SCOPE.split(' '))) { reject(new Error('Allow YouTube upload access when Google asks, then try again.')); return; }
        try { sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ value: response.access_token, expires: Date.now() + Number(response.expires_in || 3600) * 1000 })); } catch {}
        resolve(response.access_token);
      },
      error_callback: error => reject(new Error(error?.type === 'popup_closed' ? 'Google sign-in was closed before it finished.'
        : error?.type === 'popup_failed_to_open' ? 'Allow popups for this page, then try again.' : 'Google sign-in did not complete.')),
    });
    client.requestAccessToken({ prompt: consent ? 'consent' : '' });
  });
}

async function youtubeJson(url, token, options = {}) {
  const response = await fetch(url, { ...options, headers: { Authorization: `Bearer ${token}`, ...options.headers } });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) { forgetToken(); throw Object.assign(new Error('YouTube sign-in expired. Publish again to sign in.'), { authError: true }); }
  if (!response.ok) throw new Error(data.error?.message || `YouTube rejected the request (${response.status}).`);
  return { response, data };
}

/** Signs in and saves the channel that videos will be posted to. */
export async function connectYoutube(privacy = 'public') {
  const token = await youtubeToken({ consent: true });
  const { data } = await youtubeJson('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', token);
  const channel = data.items?.[0];
  if (!channel) throw new Error('This Google account has no YouTube channel. Create one on YouTube, then connect again.');
  const profile = { channelId: channel.id, accountName: channel.snippet.title, handle: channel.snippet.customUrl || channel.snippet.title,
    avatar: channel.snippet.thumbnails?.default?.url || '', privacy: ['public', 'private', 'unlisted'].includes(privacy) ? privacy : 'public', autoPost: true };
  saveYoutubeProfile(profile);
  return profile;
}

export function disconnectYoutube() {
  const token = storedToken();
  forgetToken(); saveYoutubeProfile(null);
  try { if (token && globalThis.google?.accounts?.oauth2) google.accounts.oauth2.revoke(token, () => {}); } catch {}
}

/** Uploads the complete file with YouTube's resumable upload. No size limit beyond YouTube's own. */
export async function uploadToYoutube({ file, metadata, privacy = 'public', onProgress = () => {}, signal }) {
  const token = await youtubeToken();
  const tags = metadata.hashtags.map(tag => tag.replace(/^#/, '')).filter(Boolean).slice(0, 30);
  const description = `${metadata.description}\n\n${metadata.hashtags.join(' ')}`.trim().slice(0, 5000);
  const { response } = await youtubeJson('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', token, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': file.type || 'video/mp4', 'X-Upload-Content-Length': String(file.size) },
    body: JSON.stringify({ snippet: { title: metadata.title.slice(0, 100), description, tags, categoryId: '22' }, status: { privacyStatus: privacy, selfDeclaredMadeForKids: false } }),
  });
  const location = response.headers.get('Location');
  if (!location?.startsWith('https://')) throw new Error('YouTube did not start the upload. Please try again.');
  const video = await new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('PUT', location);
    request.setRequestHeader('Content-Type', file.type || 'video/mp4');
    request.upload.onprogress = event => { if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100)); };
    request.onload = () => {
      let data = {}; try { data = JSON.parse(request.responseText); } catch {}
      if (request.status >= 200 && request.status < 300 && data.id) resolve(data);
      else if (request.status === 401) { forgetToken(); reject(Object.assign(new Error('YouTube sign-in expired during the upload. Publish again to sign in.'), { authError: true })); }
      else reject(new Error(data.error?.message || `YouTube did not accept the video (${request.status}).`));
    };
    request.onerror = () => reject(Object.assign(new Error('The upload was interrupted. Check YouTube Studio before trying again.'), { uncertain: true }));
    signal?.addEventListener('abort', () => request.abort(), { once: true });
    request.send(file);
  });
  const finalPrivacy = video.status?.privacyStatus || privacy;
  return {
    id: video.id, postUrl: `https://studio.youtube.com/video/${encodeURIComponent(video.id)}/edit`,
    message: finalPrivacy !== privacy
      ? `Uploaded to YouTube, but YouTube kept it ${finalPrivacy}. Make it ${privacy} in YouTube Studio.`
      : privacy === 'public'
        ? 'Uploaded to YouTube. If it shows as private, your Google project has not passed YouTube’s audit yet; make it public in YouTube Studio.'
        : `Uploaded to YouTube as ${privacy}.`,
  };
}
