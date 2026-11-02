/**
 * Lists a cut in videos.json as it ships: `node scripts/release.mjs <cut id> [--home] [--youtube <video id>]`, run by
 * .github/workflows/release.yml after it has published the cut's release. Run again for a cut already listed, it
 * changes nothing but to record the YouTube video given, if the cut has none yet: the workflows record an upload's id
 * this way, on the latest main.
 *
 * The cut's own cut.json (in its release) says what it is: its video, title, length, the line under the player, the
 * git tree of its folder in worlds-landing it was made from, and, for a cut whose captions were redone, the YouTube video
 * it shares with the cut before it. A new cut of the video on the site's home page takes its place there; `--home`
 * puts a cut of any other video there.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = process.env.GITHUB_REPOSITORY ?? 'embabel-worlds/worlds-media';
const argv = process.argv.slice(2);
const at = argv.indexOf('--youtube');
const youtube = at >= 0 ? argv[at + 1] : '';
const [id] = argv.filter((arg, k) => !arg.startsWith('--') && argv[k - 1] !== '--youtube');
if (!id) throw new Error('usage: node scripts/release.mjs <cut id> [--home] [--youtube <video id>]');

const file = join(ROOT, 'videos.json');
const list = JSON.parse(readFileSync(file, 'utf8'));
const listed = list.videos.find((cut) => cut.id === id);
if (listed) {
    if (youtube && !listed.youtube) {
        listed.youtube = youtube;
        writeFileSync(file, `${JSON.stringify(list, null, 4)}\n`);
        console.log(`  ${id} is https://youtu.be/${youtube}`);
    }
    process.exit(0);
}
const dir = mkdtempSync(join(tmpdir(), `${id}-`));
execFileSync('gh', ['release', 'download', id, '--repo', REPO, '--dir', dir, '--pattern', 'cut.json'], { stdio: 'inherit' });
const cut = JSON.parse(readFileSync(join(dir, 'cut.json'), 'utf8'));
if (cut.id !== id) throw new Error(`the release ${id} holds the cut ${cut.id}`);

const videoOf = (it) => it.video ?? it.id.replace(/-\d{4}-\d{2}-\d{2}$/, '');
const home = list.videos.find((it) => it.id === list.current);
list.videos.push({
    id,
    video: cut.video,
    title: cut.title,
    seconds: cut.seconds,
    ...(cut.summary ? { summary: cut.summary } : {}),
    ...(cut.source ? { source: cut.source } : {}),
    ...(cut.youtube ? { youtube: cut.youtube } : {}),
});
if (process.argv.includes('--home') || !home || videoOf(home) === cut.video) list.current = id;
writeFileSync(file, `${JSON.stringify(list, null, 4)}\n`);
console.log(`  ${id} is listed${list.current === id ? ', and is the video on the site\'s home page' : ''}.`);
