const { test, after, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const vm = require('node:vm');
const { pipeline } = require('node:stream/promises');
const { transformSync } = require('esbuild');
const source = fs.readFileSync(new URL('../server.ts', `file://${__filename}`), 'utf8');
const code = transformSync(source.slice(source.indexOf('async function downloadFile'), source.indexOf('// Fixed verse counts')), { loader: 'ts' }).code;
const context = { URL, fs, http, https, pipeline, setTimeout, clearTimeout }; vm.createContext(context); vm.runInContext(code, context);
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-download-test-'));
let server, base;
before(async () => {
  server = http.createServer((req, res) => {
    if (req.url === '/redirect') { res.writeHead(302, { location: '/file' }); res.end(); }
    else if (req.url === '/loop') { res.writeHead(302, { location: '/loop' }); res.end(); }
    else if (req.url === '/slow') { res.writeHead(200); res.write('partial'); }
    else if (req.url === '/file') { res.end('complete-media-bytes'); }
    else { res.writeHead(404); res.end('not found'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); fs.rmSync(temporary, { recursive: true, force: true }); });

test('Media redirects resolve to complete files', async () => {
  const file = path.join(temporary, 'redirect.bin');
  await context.downloadFile(`${base}/redirect`, file, 1000);
  assert.equal(fs.readFileSync(file, 'utf8'), 'complete-media-bytes');
});

test('Redirect loops, HTTP errors and stalled transfers reject and clean up partial files', async () => {
  for (const [route, message] of [['loop', /redirect/i], ['missing', /404/], ['slow', /timed out|aborted/i]]) {
    const file = path.join(temporary, `${route}.bin`);
    await assert.rejects(context.downloadFile(`${base}/${route}`, file, 100), message);
    assert.equal(fs.existsSync(file), false);
  }
});

test('Filesystem stream errors reject safely instead of crashing the server', async () => {
  await assert.rejects(context.downloadFile(`${base}/file`, path.join(temporary, 'missing-directory', 'file'), 1000), /ENOENT/);
});
