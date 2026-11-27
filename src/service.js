const build = import.meta.env || {};
export const assetUrl = path => `${build.BASE_URL || '/'}${path.replace(/^\//,'')}`;
export function normalizeServiceUrl(base) {
  const value=base.trim();
  if(!value)return '';
  let url;
  try {url=new URL(value);} catch {throw new Error('Enter the publishing server’s HTTPS address, such as https://your-studio.onrender.com.');}
  if(url.hostname==='github.io'||url.hostname.endsWith('.github.io'))throw new Error('This is a GitHub Pages address. Deploy the publishing service first, then enter its HTTPS address here.');
  if(url.pathname.replace(/\/$/,'')==='/auth/callback')throw new Error('This is an OAuth callback URL. Enter the service address without /auth/callback.');
  if((url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('Enter an HTTPS service origin, such as https://your-studio.onrender.com.');
  return url.origin;
}
export function serviceConfig() {
  let base = localStorage.getItem('proease_service_url') || build.VITE_API_BASE_URL || '';
  try {base=normalizeServiceUrl(base);} catch {base='';}
  const isStatic = build.VITE_STATIC === 'true' || location.hostname.endsWith('.github.io');
  const remembered=localStorage.getItem('proease_service_key')||'';
  return { base: base.replace(/\/$/, '') || (isStatic ? '' : location.origin), key: sessionStorage.getItem('proease_service_key') || remembered, remember: !!remembered || !sessionStorage.getItem('proease_service_key'), isStatic };
}
/** remember keeps the key on this device, so posting still works after the app or tab is reopened. */
export function saveServiceConfig(base, key, remember=false) {
  const origin=normalizeServiceUrl(base);
  if (origin) localStorage.setItem('proease_service_url',origin);
  else localStorage.removeItem('proease_service_url');
  if (key) sessionStorage.setItem('proease_service_key',key); else sessionStorage.removeItem('proease_service_key');
  if (key&&remember) localStorage.setItem('proease_service_key',key); else localStorage.removeItem('proease_service_key');
  window.dispatchEvent(new Event('proease-service-change'));
}
export function apiOrigin(){ return serviceConfig().base || ''; }
export function apiFetch(path, options={}) {
  const config=serviceConfig();
  if (!config.base) { const error=new Error('Connect your publishing service in Settings to use social accounts. Video creation works without it.'); error.setupRequired=true; return Promise.reject(error); }
  if (!path.startsWith('/api/')) return Promise.reject(new Error('Invalid service request.'));
  const headers=new Headers(options.headers);if(config.key)headers.set('Authorization',`Bearer ${config.key}`);
  return fetch(config.base+path,{...options,headers});
}
