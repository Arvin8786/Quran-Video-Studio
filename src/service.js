const build = import.meta.env || {};
export const assetUrl = path => `${build.BASE_URL || '/'}${path.replace(/^\//,'')}`;
export function serviceConfig() {
  const base = localStorage.getItem('proease_service_url') || build.VITE_API_BASE_URL || '';
  const isStatic = build.VITE_STATIC === 'true' || location.hostname.endsWith('.github.io');
  return { base: base.replace(/\/$/, '') || (isStatic ? '' : location.origin), key: sessionStorage.getItem('proease_service_key') || '', isStatic };
}
export function saveServiceConfig(base, key) {
  if (base) { const url = new URL(base); if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname))) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Enter an HTTPS service origin, such as https://your-studio.onrender.com.'); localStorage.setItem('proease_service_url',url.origin); }
  else localStorage.removeItem('proease_service_url');
  if (key) sessionStorage.setItem('proease_service_key',key); else sessionStorage.removeItem('proease_service_key');
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
