const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync, execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { transformSync } = require('esbuild');
const source = fs.readFileSync(new URL('../server.ts', `file://${__filename}`), 'utf8');
const code = transformSync(source.slice(source.indexOf('const RECITER_FOLDERS'), source.indexOf("app.options('/api/proxy'")), { loader: 'ts' }).code;
const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-render-test-'));
after(() => fs.rmSync(fixtureDir, { recursive: true, force: true }));
let ready = false;
function fixtures() {
  if (ready) return;
  for (const [name, args] of [
    ['background.mp4', ['-f', 'lavfi', '-i', 'color=c=blue:s=320x240:r=30:d=1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p']],
    ['audio.mp3', ['-f', 'lavfi', '-i', 'sine=frequency=440:duration=0.6', '-c:a', 'libmp3lame']],
    ['red.png', ['-f', 'lavfi', '-i', 'color=c=red:s=64x64', '-frames:v', '1', '-threads', '1']],
    ['green.png', ['-f', 'lavfi', '-i', 'color=c=green:s=64x64', '-frames:v', '1', '-threads', '1']],
  ]) execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args, path.join(fixtureDir, name)]);
  ready = true;
}
const dataUrl = (name, mime) => `data:${mime};base64,${fs.readFileSync(path.join(fixtureDir, name)).toString('base64')}`;
async function render(body, failDownload = false) {
  let handler;
  vm.runInNewContext(code, {
    AbortController, DEFAULT_BG_PATH: path.join(fixtureDir, 'background.mp4'), app: { post(_route, fn) { handler = fn; } }, fs, path, os, Buffer,
    process: { cwd: () => fixtureDir }, console: { error() {}, warn() {} }, SURAH_COUNTS: [7],
    downloadFile: async (_url, dest) => {
      if (failDownload) throw new Error('Recitation download failed');
      fs.copyFileSync(path.join(fixtureDir, 'audio.mp3'), dest);
    },
    execFileAsync: (cmd, args) => promisify(execFile)(cmd, cmd === 'ffmpeg' ? ['-hide_banner', '-loglevel', 'error', ...args] : args),
  });
  let status = 200, result, output;
  const res = { on() {}, headersSent: false, status(code) { status = code; return this; }, json(data) { result = data; return this; },
    download(file, _name, callback) { output = fs.readFileSync(file); callback(); } };
  await handler({ body }, res);
  return { status, result, output };
}
function pixel(file, time, x, y) {
  return Array.from(execFileSync('ffmpeg', ['-v', 'error', '-ss', String(time), '-i', file, '-vf', `crop=2:2:${x}:${y}`, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-threads', '1', 'pipe:1']).subarray(0, 3));
}

test('MP4 export preserves uploaded scenery, timed verse overlays, speed, dimensions and audio', { timeout: 30000 }, async () => {
  fixtures();
  const result = await render({ mode: 'lessons', aspectRatio: '9:16', processingSpeed: 1.5,
    videoDataUrl: dataUrl('background.mp4', 'video/mp4'), audioUrls: ['https://fixture/1.mp3', 'https://fixture/2.mp3'],
    overlays: [dataUrl('red.png', 'image/png'), dataUrl('green.png', 'image/png')] });
  assert.equal(result.status, 200, JSON.stringify(result.result));
  assert.ok(result.output.length > 1000);
  const file = path.join(fixtureDir, 'render.mp4'); fs.writeFileSync(file, result.output);
  const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]));
  assert.equal(probe.streams[0].width, 1080); assert.equal(probe.streams[0].height, 1920);
  assert.equal(probe.streams[0].codec_name, 'h264'); assert.equal(probe.streams[1].codec_name, 'aac');
  assert.ok(Number(probe.format.duration) < 1.2, '1.5× speed must shorten the video');
  const first = pixel(file, 0.1, 16, 16), second = pixel(file, 0.6, 16, 16), background = pixel(file, 0.1, 100, 100);
  assert.ok(first[0] > 200 && first[1] < 30, `First verse overlay should be red: ${first}`);
  assert.ok(second[1] > 80 && second[0] < 30, `Second verse overlay should be green: ${second}`);
  assert.ok(background[2] > 200 && background[0] < 30, `Uploaded background should remain blue: ${background}`);
});

test('Landscape export produces a playable 1920×1080 video', { timeout: 20000 }, async () => {
  fixtures();
  const result = await render({ mode: 'quran', aspectRatio: '16:9', videoDataUrl: dataUrl('background.mp4', 'video/mp4'), audioUrls: ['https://fixture/1.mp3'] });
  assert.equal(result.status, 200, JSON.stringify(result.result));
  const file = path.join(fixtureDir, 'landscape.mp4'); fs.writeFileSync(file, result.output);
  const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', file]));
  assert.equal(probe.streams[0].width, 1920); assert.equal(probe.streams[0].height, 1080);
  assert.equal(probe.streams[1].codec_name, 'aac');
});

test('Invalid render settings and unavailable recitation never produce a misleading video', async () => {
  fixtures();
  for (const body of [{ processingSpeed: 0 }, { surahNumber: 115 }, { audioUrls: 'invalid' }, { aspectRatio: 'square' }, { startAyah: 4, endAyah: 1 }, { reciterFolder: 'missing-reciter' }]) {
    const result = await render(body); assert.equal(result.status, 400); assert.equal(result.output, undefined);
  }
  const failed = await render({ videoDataUrl: dataUrl('background.mp4', 'video/mp4'), audioUrls: ['https://fixture/missing.mp3'] }, true);
  assert.equal(failed.status, 500); assert.equal(failed.output, undefined); assert.match(failed.result.error, /Recitation download failed/);
  const mismatch = await render({ videoDataUrl: dataUrl('background.mp4', 'video/mp4'), audioUrls: ['https://fixture/1.mp3'], overlays: ['invalid', 'invalid'] });
  assert.equal(mismatch.status, 500); assert.match(mismatch.result.error, /overlays do not match/);
});
