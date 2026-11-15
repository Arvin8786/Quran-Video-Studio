const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { randomBytes, timingSafeEqual } = require('node:crypto');
const { transformSync } = require('esbuild');
const source = fs.readFileSync(new URL('../server.ts', `file://${__filename}`), 'utf8');
const code = transformSync(source.slice(source.indexOf('function publicSession'), source.indexOf('// Disconnect Session Endpoint')), { loader: 'ts' }).code;
function harness(fetchMock = () => { throw new Error('Network not expected'); }) {
  const routes = new Map(), saves = [];
  const sessions = { youtube: { id: 'youtube', connected: false, accessToken: 'private-access', refreshToken: 'private-refresh' }, facebook: { id: 'facebook', connected: false } };
  vm.runInNewContext(code, {
    app: { get(path, handler) { routes.set(Array.isArray(path) ? path[0] : path, handler); }, post(path, handler) { routes.set(path, handler); } },
    randomBytes, timingSafeEqual, Buffer, URL, URLSearchParams, AbortSignal, Date,
    process: { env: { GOOGLE_CLIENT_ID: 'client-id', GOOGLE_CLIENT_SECRET: 'client-secret' } },
    getCallbackUrl: () => 'https://studio.example/auth/callback', fetch: fetchMock,
    readSessions: () => sessions, writeSessions: sessions => saves.push(sessions),
  });
  async function call(path, req = {}) {
    let status = 200, result, cookie, redirect;
    const res = { status(code) { status = code; return this; }, json(body) { result = body; return this; }, type() { return this; }, send(body) { result = body; return this; }, cookie(_name, value) { cookie = value; }, clearCookie() {}, redirect(url) { redirect=url; } };
    await routes.get(path)({ params: {}, query: {}, headers: {}, get(name) {return this.headers[name.toLowerCase()];}, ...req }, res);
    return { status, result, cookie, redirect };
  }
  return { call, saves };
}

test('Session status never exposes access or refresh credentials', async () => {
  const h = harness();
  const { result } = await h.call('/api/auth/status');
  assert.equal(result.sessions.youtube.hasToken, true);
  assert.equal(result.sessions.youtube.accessToken, undefined);
  assert.equal(result.sessions.youtube.refreshToken, undefined);
  assert.doesNotMatch(JSON.stringify(result), /private-access|private-refresh/);
});

test('Empty, rejected and unreachable tokens never create a verified session', async () => {
  for (const [token, providerResponse, expected] of [
    ['', undefined, 400],
    ['invalid-token-long', () => Response.json({ error: { message: 'Invalid token' } }, { status: 401 }), 400],
    ['network-token-long', () => { throw new Error('Offline'); }, 502],
  ]) {
    const h = harness(providerResponse);
    const result = await h.call('/api/auth/save-token', { body: { provider: 'youtube', accessToken: token } });
    assert.equal(result.status, expected);
    assert.equal(result.result.success, false);
    assert.equal(h.saves.length, 0);
  }
});

test('A verified channel saves its identity and returns no credentials', async () => {
  const h = harness(() => Response.json({ items: [{ id: 'channel123', snippet: { title: 'Real channel' } }] }));
  const { result } = await h.call('/api/auth/save-token', { body: { provider: 'youtube', accessToken: 'a-real-token-123' } });
  assert.equal(result.success, true);
  assert.equal(result.session.channelId, 'channel123');
  assert.equal(result.session.verified, true);
  assert.equal(result.session.accessToken, undefined);
  assert.equal(h.saves.length, 1);
});

test('Forged or expired OAuth callbacks cannot connect an account', async () => {
  const h = harness();
  const result = await h.call('/auth/callback', { query: { code: 'fake', state: 'youtube' } });
  assert.equal(result.status, 400);
  assert.equal(h.saves.length, 0);
  assert.match(result.result, /OAUTH_AUTH_ERROR/);
});

test('OAuth rejection uses the browser nonce and cannot report success or inject HTML', async () => {
  const h = harness();
  const init = await h.call('/api/auth/:provider/url', { params: { provider: 'youtube' } });
  const state = new URL(init.result.url).pathname.split('/').at(-1);
  const start=await h.call('/auth/start/:state',{params:{state}});
  assert.equal(new URL(start.redirect).searchParams.get('state'),state);
  assert.equal(state.length, 64);
  assert.equal(state, start.cookie);
  const result = await h.call('/auth/callback', { query: { state, error: '</script><script>alert(1)</script>' }, headers: { cookie: `proease_oauth_state=${state}` } });
  assert.equal(result.status, 400);
  assert.doesNotMatch(result.result, /<script>alert/);
  assert.match(result.result, /\\u003c/);
  assert.equal(h.saves.length, 0);
  assert.equal((await h.call('/auth/callback', { query: { state } })).status, 400);
});

test('Failed OAuth token exchanges never fabricate a connected account', async () => {
  const h = harness(() => Response.json({ error_description: 'Code expired' }, { status: 400 }));
  const init = await h.call('/api/auth/:provider/url', { params: { provider: 'youtube' } });
  const state=new URL(init.result.url).pathname.split('/').at(-1);
  const start=await h.call('/auth/start/:state',{params:{state}});
  const result = await h.call('/auth/callback', { query: { state, code: 'expired' }, headers: { cookie: `proease_oauth_state=${start.cookie}` } });
  assert.equal(result.status, 400);
  assert.match(result.result, /Code expired/);
  assert.equal(h.saves.length, 0);
});

test('Auto-Post preference is saved for connected accounts and rejected for disconnected ones', async () => {
  const h = harness(() => Response.json({ items: [{ id: 'channel123', snippet: { title: 'Real channel' } }] }));
  assert.equal((await h.call('/api/auth/preferences', { body: { provider: 'youtube', autoPost: false } })).status, 401);
  await h.call('/api/auth/save-token', { body: { provider: 'youtube', accessToken: 'a-real-token-123' } });
  assert.equal((await h.call('/api/auth/preferences', { body: { provider: 'youtube', autoPost: false } })).result.success, true);
  const status = await h.call('/api/auth/status');
  assert.equal(status.result.sessions.youtube.autoPost, false);
  assert.equal((await h.call('/api/auth/preferences', { body: { provider: 'youtube', autoPost: 'false' } })).status, 400);
});
