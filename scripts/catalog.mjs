/**
 * Writes the catalog into README.md, between its `<!-- catalog -->` and `<!-- /catalog -->` lines: `node
 * scripts/catalog.mjs`, run by .github/workflows/catalog.yml whenever videos.json changes and when a cut is put up for
 * review, and by the release workflow.
 *
 * Cuts in review are the draft releases, which only people with access to this repository can open; each is listed
 * with how to watch it and how to ship it. Released cuts are the ones in videos.json, grouped by video, newest first,
 * each with its links for the site, YouTube and LinkedIn. Needs the gh command, signed in (in a workflow, GH_TOKEN).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = process.env.GITHUB_REPOSITORY ?? 'embabel-worlds/worlds-media';
const SITE = 'https://worlds.embabel.com';
const README = join(ROOT, 'README.md');

const list = JSON.parse(readFileSync(join(ROOT, 'videos.json'), 'utf8'));
const releases = JSON.parse(execFileSync('gh', ['release', 'list', '--repo', REPO, '--limit', '1000', '--json', 'tagName,name,isDraft,createdAt']).toString());
const file = (id, name) => `https://github.com/${REPO}/releases/download/${id}/${name}`;
const length = (seconds) => (seconds ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : '');
/* A cut is of the video it names, or, before cuts named theirs, the one its id starts with. */
const videoOf = (cut) => cut.video ?? cut.id.replace(/-\d{4}-\d{2}-\d{2}$/, '');

const lines = ['## Catalog', '', 'Written by `scripts/catalog.mjs`: don\'t edit it by hand.', ''];

const review = releases.filter((release) => release.isDraft).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
lines.push('### In review', '');
if (review.length) {
    lines.push('New cuts, not yet on the site or YouTube. To watch one, in worlds-landing:', '', '```sh', `npm run review -- ${review[0].tagName}`, '```', '',
        `To ship it, run [Release a cut](https://github.com/${REPO}/actions/workflows/release.yml) with its id.`, '',
        '| Cut | Title | Up since |', '| --- | --- | --- |');
    for (const release of review) lines.push(`| \`${release.tagName}\` | ${release.name.replace(/\s*\(\d+ \w+ \d{4}\)$/, '')} | ${release.createdAt.slice(0, 10)} |`);
} else {
    lines.push('Nothing in review.');
}
lines.push('');

lines.push('### Released', '');
const videos = [...new Set(list.videos.map(videoOf))];
for (const name of videos) {
    const cuts = list.videos.filter((cut) => videoOf(cut) === name).reverse();
    lines.push(`#### ${cuts[0].title} (\`${name}\`)`, '');
    if (cuts[0].summary) lines.push(cuts[0].summary, '');
    lines.push('| Cut | Length | | Site | YouTube | LinkedIn | Files |', '| --- | --- | --- | --- | --- | --- | --- |');
    for (const cut of cuts) {
        lines.push([
            '',
            `\`${cut.id}\``,
            length(cut.seconds),
            cut.id === list.current ? '**current**' : '',
            `[watch](${SITE}/?v=${cut.id}#watch)`,
            cut.youtube ? `[${cut.youtube}](https://youtu.be/${cut.youtube})` : 'not yet',
            `[video](${file(cut.id, 'linkedin.mp4')}), [post](${file(cut.id, 'linkedin.txt')})`,
            `[release](https://github.com/${REPO}/releases/tag/${cut.id})`,
            '',
        ].join(' | ').trim());
    }
    lines.push('');
}

const readme = readFileSync(README, 'utf8');
const start = readme.indexOf('<!-- catalog -->');
const end = readme.indexOf('<!-- /catalog -->');
if (start < 0 || end < start) throw new Error('README.md needs a <!-- catalog --> line and a <!-- /catalog --> line after it');
writeFileSync(README, `${readme.slice(0, start)}<!-- catalog -->\n${lines.join('\n')}\n${readme.slice(end)}`);
console.log(`catalog: ${review.length} in review, ${list.videos.length} released in ${videos.length} video${videos.length === 1 ? '' : 's'}`);
