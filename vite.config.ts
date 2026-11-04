import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import http from 'http';
import https from 'https';
import fs from 'fs';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { defineConfig } from 'vite';

const execFileAsync = promisify(execFile);

function fetchStream(targetUrl: string, res: http.ServerResponse, redirects = 0) {
  if (redirects > 5) {
    res.statusCode = 500;
    return res.end('Too many redirects');
  }
  try {
    const parsed = new URL(targetUrl);
    const client = parsed.protocol === 'https:' ? https : http;

    const req = client.get(
      targetUrl,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: '*/*',
        },
      },
      (remoteRes) => {
        if (
          remoteRes.statusCode &&
          remoteRes.statusCode >= 300 &&
          remoteRes.statusCode < 400 &&
          remoteRes.headers.location
        ) {
          const nextUrl = new URL(remoteRes.headers.location, targetUrl).toString();
          return fetchStream(nextUrl, res, redirects + 1);
        }
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');
        if (remoteRes.headers['content-type']) {
          res.setHeader('Content-Type', remoteRes.headers['content-type']);
        }
        if (remoteRes.headers['content-length']) {
          res.setHeader('Content-Length', remoteRes.headers['content-length']);
        }
        if (remoteRes.headers['accept-ranges']) {
          res.setHeader('Accept-Ranges', remoteRes.headers['accept-ranges']);
        }
        res.statusCode = remoteRes.statusCode || 200;
        remoteRes.pipe(res);
      }
    );
    req.on('error', (err) => {
      res.statusCode = 500;
      res.end(err.message);
    });
  } catch (err: any) {
    res.statusCode = 400;
    res.end(err?.message || 'Invalid URL');
  }
}

function downloadFile(targetUrl: string, destPath: string, redirects = 0): Promise<void> {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Too many redirects'));
    try {
      const parsed = new URL(targetUrl);
      const client = parsed.protocol === 'https:' ? https : http;
      const file = fs.createWriteStream(destPath);

      const req = client.get(
        targetUrl,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: '*/*',
          },
        },
        (res) => {
          if (
            res.statusCode &&
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            const nextUrl = new URL(res.headers.location, targetUrl).toString();
            file.close();
            fs.unlink(destPath, () => {});
            return downloadFile(nextUrl, destPath, redirects + 1).then(resolve).catch(reject);
          }
          if (res.statusCode !== 200) {
            file.close();
            fs.unlink(destPath, () => {});
            return reject(new Error(`Failed with status ${res.statusCode}`));
          }
          res.pipe(file);
          file.on('finish', () => {
            file.close(() => resolve());
          });
        }
      );
      req.on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
      req.setTimeout(60000, () => {
        req.destroy();
        fs.unlink(destPath, () => {});
        reject(new Error('Download timeout'));
      });
    } catch (e) {
      reject(e);
    }
  });
}

const CACHE_DIR = path.join(os.tmpdir(), 'proease_media_cache');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'video-render-and-cors-proxy',
        configureServer(server) {
          // CORS Proxy for audio and media previews
          server.middlewares.use('/api/proxy', (req, res) => {
            if (req.method === 'OPTIONS') {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', '*');
              return res.end();
            }
            const queryUrl = new URL(req.url || '', 'http://localhost:3000').searchParams.get(
              'url'
            );
            if (!queryUrl) {
              res.statusCode = 400;
              return res.end('Missing url param');
            }
            fetchStream(queryUrl, res);
          });

          // Direct Complete 1080p Video Rendering Engine (Fast FFmpeg Synthesis with Audio)
          server.middlewares.use('/api/render-video', async (req, res) => {
            if (req.method === 'OPTIONS') {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', '*');
              return res.end();
            }

            if (req.method !== 'POST') {
              res.statusCode = 405;
              return res.end('Method Not Allowed');
            }

            const chunks: Buffer[] = [];
            req.on('data', (c) => chunks.push(c));
            req.on('end', async () => {
              const jobId = `render_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
              const jobDir = path.join(os.tmpdir(), jobId);
              fs.mkdirSync(jobDir, { recursive: true });

              try {
                const bodyStr = Buffer.concat(chunks).toString('utf-8');
                const payload = JSON.parse(bodyStr);
                const {
                  backgroundVideoUrl,
                  audioUrls = [],
                  audioMode = 'quran',
                  durations = [],
                  overlayImages = [],
                  videoFileName = 'ProEase_Studio_1080p.mp4',
                  targetDuration = 0,
                } = payload;

                console.log(`[FFmpeg Video Render] Job ${jobId} started: mode=${audioMode}, ${audioUrls.length} audio clips, targetDuration: ${targetDuration}s`);

                // 1. Process Audio Files
                const audioFiles: string[] = [];

                if (audioMode === 'oceanWaves') {
                  const dur = targetDuration > 0 ? targetDuration : 30;
                  const aPath = path.join(jobDir, 'audio_0.mp3');
                  await execFileAsync('ffmpeg', [
                    '-y',
                    '-f',
                    'lavfi',
                    '-i',
                    'anoisesrc=c=pink:r=44100:a=0.18,lowpass=f=450,volume=2.5',
                    '-t',
                    dur.toString(),
                    '-c:a',
                    'libmp3lame',
                    aPath,
                  ]);
                  audioFiles.push('audio_0.mp3');
                } else if (audioMode === 'forestRain') {
                  const dur = targetDuration > 0 ? targetDuration : 30;
                  const aPath = path.join(jobDir, 'audio_0.mp3');
                  await execFileAsync('ffmpeg', [
                    '-y',
                    '-f',
                    'lavfi',
                    '-i',
                    'anoisesrc=c=brown:r=44100:a=0.14,bandpass=f=1200:w=1800,volume=2',
                    '-t',
                    dur.toString(),
                    '-c:a',
                    'libmp3lame',
                    aPath,
                  ]);
                  audioFiles.push('audio_0.mp3');
                } else if (audioMode === 'silent') {
                  const dur = targetDuration > 0 ? targetDuration : 30;
                  const aPath = path.join(jobDir, 'audio_0.mp3');
                  await execFileAsync('ffmpeg', [
                    '-y',
                    '-f',
                    'lavfi',
                    '-i',
                    'anullsrc=r=44100:cl=stereo',
                    '-t',
                    dur.toString(),
                    '-c:a',
                    'libmp3lame',
                    aPath,
                  ]);
                  audioFiles.push('audio_0.mp3');
                } else {
                  // Quran Recitation Audio URLs
                  for (let i = 0; i < audioUrls.length; i++) {
                    const aUrl = audioUrls[i];
                    const aPath = path.join(jobDir, `audio_${i}.mp3`);
                    
                    // Simple URL cache check
                    const safeName = Buffer.from(aUrl).toString('base64').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 48);
                    const cachedFile = path.join(CACHE_DIR, `audio_${safeName}.mp3`);

                    if (fs.existsSync(cachedFile) && fs.statSync(cachedFile).size > 1000) {
                      fs.copyFileSync(cachedFile, aPath);
                      audioFiles.push(`audio_${i}.mp3`);
                    } else {
                      try {
                        await downloadFile(aUrl, aPath);
                        fs.copyFileSync(aPath, cachedFile);
                        audioFiles.push(`audio_${i}.mp3`);
                      } catch (err) {
                        console.warn(`Failed to download audio ${i}, generating silence placeholder:`, err);
                        const dur = durations[i] || 4;
                        await execFileAsync('ffmpeg', [
                          '-y',
                          '-f',
                          'lavfi',
                          '-i',
                          `anullsrc=r=44100:cl=stereo`,
                          '-t',
                          dur.toString(),
                          '-c:a',
                          'libmp3lame',
                          aPath,
                        ]);
                        audioFiles.push(`audio_${i}.mp3`);
                      }
                    }
                  }
                }

                // If still no audio files, generate silence
                if (audioFiles.length === 0) {
                  const dur = targetDuration > 0 ? targetDuration : 10;
                  const aPath = path.join(jobDir, 'audio_0.mp3');
                  await execFileAsync('ffmpeg', [
                    '-y',
                    '-f',
                    'lavfi',
                    '-i',
                    `anullsrc=r=44100:cl=stereo`,
                    '-t',
                    dur.toString(),
                    '-c:a',
                    'libmp3lame',
                    aPath,
                  ]);
                  audioFiles.push('audio_0.mp3');
                }

                // 2. Measure exact audio durations with ffprobe
                const measuredDurations: number[] = [];
                for (let i = 0; i < audioFiles.length; i++) {
                  try {
                    const probeRes = await execFileAsync('ffprobe', [
                      '-v',
                      'error',
                      '-show_entries',
                      'format=duration',
                      '-of',
                      'default=noprint_wrappers=1:nokey=1',
                      path.join(jobDir, audioFiles[i]),
                    ]);
                    const dur = parseFloat(probeRes.stdout.trim());
                    measuredDurations.push(isNaN(dur) || dur <= 0 ? durations[i] || 5 : dur);
                  } catch (e) {
                    measuredDurations.push(durations[i] || 5);
                  }
                }

                // 3. Write audios.txt concat file
                const audiosTxtContent =
                  'ffconcat version 1.0\n' +
                  audioFiles.map((f) => `file '${f}'`).join('\n') +
                  '\n';
                fs.writeFileSync(path.join(jobDir, 'audios.txt'), audiosTxtContent, 'utf-8');

                // 4. Write overlay images & slides.txt
                const slideFiles: string[] = [];
                for (let i = 0; i < overlayImages.length; i++) {
                  const b64Data = overlayImages[i].replace(/^data:image\/\w+;base64,/, '');
                  const imgPath = path.join(jobDir, `slide_${i}.png`);
                  fs.writeFileSync(imgPath, Buffer.from(b64Data, 'base64'));
                  slideFiles.push(`slide_${i}.png`);
                }

                let slidesTxtContent = 'ffconcat version 1.0\n';
                if (slideFiles.length > 0) {
                  for (let i = 0; i < slideFiles.length; i++) {
                    const dur = measuredDurations[i] || durations[i] || 5;
                    slidesTxtContent += `file '${slideFiles[i]}'\nduration ${dur}\n`;
                  }
                  // Repeat last slide to satisfy concat demuxer format
                  slidesTxtContent += `file '${slideFiles[slideFiles.length - 1]}'\n`;
                } else {
                  // Fallback transparent overlay
                  const blankPath = path.join(jobDir, 'blank.png');
                  await execFileAsync('ffmpeg', [
                    '-y',
                    '-f',
                    'lavfi',
                    '-i',
                    'color=c=black@0.0:s=720x1280',
                    '-vframes',
                    '1',
                    blankPath,
                  ]);
                  slidesTxtContent += `file 'blank.png'\nduration 10\nfile 'blank.png'\n`;
                }
                fs.writeFileSync(path.join(jobDir, 'slides.txt'), slidesTxtContent, 'utf-8');

                // 5. Handle Background Video
                let hasBgVideo = false;
                const bgPath = path.join(jobDir, 'bg.mp4');
                if (
                  backgroundVideoUrl &&
                  !backgroundVideoUrl.startsWith('procedural') &&
                  backgroundVideoUrl.startsWith('http')
                ) {
                  const safeBgName = Buffer.from(backgroundVideoUrl).toString('base64').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 48);
                  const cachedBgFile = path.join(CACHE_DIR, `bg_${safeBgName}.mp4`);

                  if (fs.existsSync(cachedBgFile) && fs.statSync(cachedBgFile).size > 100000) {
                    fs.copyFileSync(cachedBgFile, bgPath);
                    hasBgVideo = true;
                  } else {
                    try {
                      await downloadFile(backgroundVideoUrl, bgPath);
                      fs.copyFileSync(bgPath, cachedBgFile);
                      hasBgVideo = true;
                    } catch (e) {
                      console.warn('Failed to download background video, falling back to procedural gradient:', e);
                      hasBgVideo = false;
                    }
                  }
                }

                // 6. Calculate total target duration
                let finalDuration = targetDuration;
                if (!finalDuration || finalDuration <= 0) {
                  finalDuration = measuredDurations.reduce((sum, d) => sum + (d || 0), 0);
                  if (finalDuration <= 0) finalDuration = 10;
                }

                const outputPath = path.join(jobDir, 'output.mp4');

                // 7. Execute FFmpeg synthesis (Optimized 9:16 Portrait Shorts 720x1280)
                const ffmpegArgs: string[] = ['-y'];

                if (hasBgVideo) {
                  ffmpegArgs.push('-stream_loop', '-1', '-i', bgPath);
                } else {
                  ffmpegArgs.push(
                    '-f',
                    'lavfi',
                    '-i',
                    `color=c=0x071120:s=720x1280:r=25:d=${(finalDuration + 2).toFixed(1)}`
                  );
                }

                ffmpegArgs.push(
                  '-f',
                  'concat',
                  '-safe',
                  '0',
                  '-i',
                  path.join(jobDir, 'slides.txt'),
                  '-f',
                  'concat',
                  '-safe',
                  '0',
                  '-i',
                  path.join(jobDir, 'audios.txt'),
                  '-filter_complex',
                  '[0:v]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280[bg];[bg][1:v]overlay=0:0[vout]',
                  '-map',
                  '[vout]',
                  '-map',
                  '2:a',
                  '-c:v',
                  'libx264',
                  '-preset',
                  'ultrafast',
                  '-b:v',
                  '2500k',
                  '-pix_fmt',
                  'yuv420p',
                  '-c:a',
                  'aac',
                  '-b:a',
                  '192k',
                  '-t',
                  finalDuration.toFixed(2),
                  outputPath
                );

                console.log(`[FFmpeg Video Render] Executing synthesis...`);
                await execFileAsync('ffmpeg', ffmpegArgs);

                if (!fs.existsSync(outputPath)) {
                  throw new Error('FFmpeg failed to produce output file');
                }

                const stat = fs.statSync(outputPath);
                console.log(`[FFmpeg Video Render] Complete MP4 with audio synthesized: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);

                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Content-Type', 'video/mp4');
                res.setHeader('Content-Length', stat.size.toString());
                res.setHeader(
                  'Content-Disposition',
                  `attachment; filename="${encodeURIComponent(videoFileName)}"`
                );

                const stream = fs.createReadStream(outputPath);
                stream.pipe(res);
                stream.on('close', () => {
                  fs.rm(jobDir, { recursive: true, force: true }, () => {});
                });
              } catch (err: any) {
                console.error('[FFmpeg Video Render Error]:', err);
                res.statusCode = 500;
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message || 'Render failed' }));
                fs.rm(jobDir, { recursive: true, force: true }, () => {});
              }
            });
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
