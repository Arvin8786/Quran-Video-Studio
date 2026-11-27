# Quran Studio

Create Quran lesson videos, complete Surahs, reflection shorts and nature videos. The responsive editor includes Arabic, transliteration, English translation, reciter selection, scenery uploads, typography, logos, captions, full downloads and social publishing.

## GitHub Pages: create and download

GitHub Pages cannot run Express, FFmpeg or social OAuth endpoints. Sending a video-processing POST to Pages caused the original `405` failure. The default export now records the entire selection in the browser instead.

1. In the repository's **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source.
2. Merge the source changes into `main`. **Build and deploy Quran Studio** installs dependencies, bundles the Quran dataset and deploys `dist/` with the correct repository path.
3. Open <https://arvin8786.github.io/Quran-Video-Studio/>. Choose a lesson or Surah, preview it, then choose **Export video**. The complete file downloads automatically; **Download full video** downloads it again.

Browser recording runs at playback speed and waits for the last verse and the recorder's final bytes. Keep this tab open; recording pauses when the tab is hidden. Cancelling or losing recitation audio does not produce a partial download. Current Chrome/Edge can record MP4; browsers without MP4 recording use WebM with an accurate file extension. Both formats include video and audio. Use the processing service for a consistent H.264/AAC MP4. Very long Surahs need enough browser memory for the final video.

All 114 Surahs / 6,236 verses are bundled at build time from pinned `quran-json@3.1.2`, so Quran text does not depend on a live API. Recitation audio still needs access to EveryAyah; a connected service supplies a proxy fallback. **Studio gradient** needs no background download; uploaded videos also work when external scenery is unavailable. The build preserves the dataset's upstream license and attribution in `quran/LICENSE.txt` and `quran/ATTRIBUTION.md`. Text/English translation come from [The Noble Quran Encyclopedia](https://quranenc.com/), transliteration from [Tanzil](https://tanzil.net/trans/en.transliteration), distributed by [Quran JSON](https://github.com/risan/quran-json). Verse wording is unchanged.

## Connect a publishing service

Direct publishing from the Pages interface needs a separate private Node service. Credentials must never be placed in frontend code, GitHub Pages files or `VITE_*` variables.

The included `Dockerfile` installs FFmpeg and runs the Express app. `render.yaml` is a Render blueprint with persistent private storage. **Its Starter instance and disk are paid Render resources; deploying the blueprint requires your Render account and billing approval.** You can host the Docker image on another service with persistent storage instead.

1. [Deploy the prepared service on Render](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2FArvin8786%2FQuran-Video-Studio), or deploy the Docker image on your own host. Set a strong `STUDIO_ACCESS_KEY`, `STUDIO_ALLOWED_ORIGINS=https://arvin8786.github.io`, and a persistent `PROEASE_DATA_DIR`. The Render blueprint generates the key and uses `/data`. `APP_URL` must be the public HTTPS service origin; on Render it is detected automatically.
   The service URL is its server origin, such as `https://your-studio.onrender.com`. A GitHub Pages URL or `/auth/callback` URL is not a service origin. Do not register the GitHub Pages address as this app’s OAuth callback.

2. Add credentials only for platforms you want to use (see `.env.example`). In each provider's developer console, register `https://YOUR-SERVICE/auth/callback` as the exact OAuth redirect URL.
3. In the GitHub Pages app, open **Publishing service settings**. Enter the service's HTTPS origin and Studio access key, then **Save connection**. The URL persists on the device; the key stays in the browser tab's session. An optional public GitHub repository variable `VITE_API_BASE_URL` can prefill the origin for future builds.
4. Open **Social Accounts → Connect account**. Use **OAuth sign-in**, or verify a suitable OAuth access token. API keys cannot authorize uploads.
5. Select the connected destinations, export a video, review its captions and choose **Publish video**. **Publish after export** is optional and off by default. TikTok requires an explicit visibility choice.

| Platform | Required account / permissions | Behavior |
| --- | --- | --- |
| YouTube | Google OAuth client, YouTube Data API enabled, channel, `youtube.upload` and `youtube.readonly` | Authenticated resumable upload, refresh tokens, public/private/unlisted visibility. |
| Facebook | Meta app, Facebook Page, Page token, `pages_show_list`, `pages_read_engagement`, `pages_manage_posts` | Posts the complete video to the Page, or saves a draft. Personal profile publishing is not supported by this API. |
| Instagram | Meta app, Instagram professional account linked to a Page, `instagram_basic`, `instagram_content_publish`, Page discovery permissions | Resumable Reel upload, processing-status checks, then publication. Browser WebM is converted to MP4 by the service. |
| TikTok | TikTok developer app, Login Kit / Content Posting API, `user.info.basic`, `video.publish` | Loads creator permissions, requires visibility choice, checks duration, uploads bytes and tracks publication. |

Provider app review/audit, account eligibility and quotas apply. An unaudited TikTok client is restricted to private visibility. Google/Meta development-mode accounts must be permitted testers, and public app access may require review. Code changes cannot grant those approvals. No platform is shown as connected until its token and account identity are verified.

For Meta OAuth, a single available Page can be connected automatically. With multiple Pages, use Direct Token with the intended Page token and Page ID (or Instagram professional account ID). This avoids publishing to an arbitrary Page.

Completed videos retain their own captions when you change the editor. Retries skip confirmed destinations. Instagram/TikTok uploads remain **processing** until the platform confirms publication; **Refresh post status** checks the existing upload without uploading it again. Lost final publication responses require review of the platform before another upload. Only confirmed posts increase statistics or appear in history.

Social uploads support files up to **70 MB**. Larger completed videos can still be downloaded in full and uploaded through the platform's own interface. Publication operation IDs and duplicate-request protection last 24 hours in the running process; this is not a durable queue. After a service restart or an expired operation, check your account before repeating a post.

This is a single-owner studio. All service account APIs and publishing operations require the private Studio key in production. CORS permits only the configured origins. Sessions/history use private files in `.data/` or `PROEASE_DATA_DIR`; neither is committed. Keep the service and key private to people allowed to post to your accounts. The service only downloads recitation audio from EveryAyah and scenery from Pexels/Vimeo links; other remote URLs are refused, so it cannot be used as an open proxy.

## Local development and validation

Requires Node.js 22+ and `ffmpeg` / `ffprobe` on `PATH` for service exports and tests.

```sh
npm ci
cp .env.example .env
npm run dev
```

Set `STUDIO_ACCESS_KEY` in `.env`, then enter that same key in the app's publishing service settings for local account/API access. Browser video creation works without a key. For production: `npm run build` then `NODE_ENV=production npm start`. Docker runs this setup automatically.

```sh
npm run lint          # TypeScript check
npm test              # Dataset, access, OAuth, providers, failures and real FFmpeg exports
npm run test:browser  # Real app/browser workflows, service export and publication fixtures
npm run test:pages    # Static project-path build and real complete browser recording/download
```

Browser checks require Chromium on `PATH` or `CHROME_BIN` pointing to Chrome. They use local media and simulated provider responses; they never log in or publish to real accounts. Live platform publication remains an account-configuration check after deployment.

Reflection voiceover uses browser speech synthesis for preview only; exported reflection/nature audio is a 15-second ambient track. It does not silently claim to include synthesized narration.
