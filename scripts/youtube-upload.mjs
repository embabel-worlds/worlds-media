/**
 * Uploads one cut to YouTube: `node scripts/youtube-upload.mjs <release-tag>`, run by .github/workflows/youtube.yml when
 * a release is published, or by hand.
 *
 * It downloads the release's master.mp4, captions.srt, thumbnail.jpg and youtube.txt, uploads the master as an unlisted
 * video with the title, description (with its chapters) and tags from youtube.txt, adds the captions and the thumbnail,
 * and records the new video's id in videos.json. A cut that already has a YouTube id there is left alone, so publishing
 * a release twice never uploads it twice.
 *
 * Needs YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET and YOUTUBE_REFRESH_TOKEN (see the README's "Setting up the YouTube
 * upload", and scripts/youtube-auth.mjs), and the gh command, signed in, to read the release.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = process.env.GITHUB_REPOSITORY ?? 'embabel-worlds/worlds-media';
const tag = process.argv[2];
if (!tag) throw new Error('usage: node scripts/youtube-upload.mjs <release-tag>');
for (const name of ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN']) {
    if (!process.env[name]) throw new Error(`the YouTube upload needs ${name}: see the README's "Setting up the YouTube upload"`);
}

const list = JSON.parse(readFileSync(join(ROOT, 'videos.json'), 'utf8'));
const video = list.videos.find((it) => it.id === tag);
if (!video) throw new Error(`videos.json has no video ${tag}: add it before publishing its release`);
if (video.youtube) {
    console.log(`${tag} is already on YouTube (${video.youtube}); nothing to upload.`);
    process.exit(0);
}

const dir = mkdtempSync(join(tmpdir(), `${tag}-`));
execFileSync('gh', ['release', 'download', tag, '--repo', REPO, '--dir', dir,
    '--pattern', 'master.mp4', '--pattern', 'captions.srt', '--pattern', 'thumbnail.jpg', '--pattern', 'youtube.txt'], { stdio: 'inherit' });

/* youtube.txt is sections under one-word headings: Title, Description, Chapters, Tags. YouTube reads chapters from the
   description, so they go at its end. */
const kit = Object.fromEntries(readFileSync(join(dir, 'youtube.txt'), 'utf8').split(/^(Title|Description|Chapters|Tags)$/m).slice(1)
    .reduce((pairs, part, i, all) => (i % 2 ? pairs : [...pairs, [part, all[i + 1].trim()]]), []));
const description = [kit.Description, kit.Chapters && `Chapters\n${kit.Chapters}`].filter(Boolean).join('\n\n');
const tags = (kit.Tags ?? '').split(',').map((it) => it.trim()).filter(Boolean);

const token = await (await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
        client_id: process.env.YOUTUBE_CLIENT_ID, client_secret: process.env.YOUTUBE_CLIENT_SECRET,
        refresh_token: process.env.YOUTUBE_REFRESH_TOKEN, grant_type: 'refresh_token',
    }),
})).json();
if (!token.access_token) throw new Error(`Google refused the YouTube sign-in: ${token.error ?? ''} ${token.error_description ?? ''}`);
const auth = { Authorization: `Bearer ${token.access_token}` };
const ok = async (response, what) => {
    if (!response.ok) throw new Error(`YouTube refused ${what}: ${response.status} ${await response.text()}`);
    return response;
};

/* A resumable upload: YouTube answers the metadata with an address, and the file goes there in one PUT. */
const master = join(dir, 'master.mp4');
const started = await ok(await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json', 'X-Upload-Content-Type': 'video/mp4', 'X-Upload-Content-Length': String(statSync(master).size) },
    body: JSON.stringify({
        snippet: { title: kit.Title, description, tags, categoryId: '28' },
        status: { privacyStatus: 'unlisted', selfDeclaredMadeForKids: false },
    }),
}), 'the upload');
const uploaded = await (await ok(await fetch(started.headers.get('location'), {
    method: 'PUT', headers: { ...auth, 'Content-Type': 'video/mp4' }, body: readFileSync(master),
}), 'the video')).json();
console.log(`  uploaded: https://youtu.be/${uploaded.id} (${uploaded.status?.privacyStatus})`);

/* The captions, as their own track rather than YouTube's automatic ones. */
const boundary = `cut-${Date.now()}`;
const captionBody = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ snippet: { videoId: uploaded.id, language: 'en', name: 'English' } })}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`), readFileSync(join(dir, 'captions.srt')), Buffer.from(`\r\n--${boundary}--`),
]);
await ok(await fetch('https://www.googleapis.com/upload/youtube/v3/captions?uploadType=multipart&part=snippet', {
    method: 'POST', headers: { ...auth, 'Content-Type': `multipart/related; boundary=${boundary}` }, body: captionBody,
}), 'the captions');
console.log('  captions added');

/* A custom thumbnail needs a verified channel; without one the video keeps YouTube's, and that is only a warning. */
const thumbnail = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${uploaded.id}&uploadType=media`, {
    method: 'POST', headers: { ...auth, 'Content-Type': 'image/jpeg' }, body: readFileSync(join(dir, 'thumbnail.jpg')),
});
console.log(thumbnail.ok ? '  thumbnail set' : `::warning::The thumbnail wasn't set (${thumbnail.status}): is the channel verified?`);

video.youtube = uploaded.id;
writeFileSync(join(ROOT, 'videos.json'), `${JSON.stringify(list, null, 4)}\n`);
console.log(`  videos.json: ${tag} is https://youtu.be/${uploaded.id}`);
