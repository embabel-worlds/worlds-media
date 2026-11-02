# worlds-media

The videos for worlds.embabel.com: every cut of every video, with what each place we share it needs. The site plays
them from here, and YouTube gets them from here.

## Why a repository of its own

The site played its explainer through YouTube's embed, and YouTube served it at 240p in Chrome and Firefox, whatever
the connection, though it had 1080p (Safari got HD; a colleague saw the same). Nothing on a page can make YouTube's
player choose a quality, so the site plays its own copy. There will be many cuts, and each is tens of megabytes, so
they don't belong in the site's history. Here they aren't in git at all.

## A cut is a release

Each cut is a GitHub release of this repository. Its tag is the cut's id, the video's name and the day it was cut:
`north-star-2026-11-01`. A draft release is a cut in review; a published one is released. Its files:

| File | For |
| --- | --- |
| `master.mp4` | YouTube: the full-quality master, which YouTube re-encodes |
| `web.mp4` | The site: a 1080p web encode |
| `captions.vtt` | The site's captions |
| `captions.srt` | YouTube's captions |
| `poster.jpg` | The site's poster, the video's first second |
| `thumbnail.jpg` | YouTube's thumbnail |
| `youtube.txt` | YouTube's title, description, chapters and tags |
| `linkedin.mp4` | LinkedIn: the master with the captions burned in, as LinkedIn plays video muted |
| `linkedin.txt` | The LinkedIn post to go with it |
| `cut.json` | What the cut is: its video, title, length, the line under the player, and the version of the video's folder in worlds-landing it was made from (its git tree) |

Release files aren't in the repository's history, so it stays small however many cuts there are. `videos.json` lists
the released cuts, which one the site's home page shows (`current`), and each one's video, title and length, the line
the site shows under the player (`summary`), and its YouTube id once it has one.

## Making, reviewing and shipping a cut

Videos are made in worlds-landing, one folder each in `videos/` (its README has the details). Then:

1. **Up for review.** `npm run video:publish -- <name>` there uploads a `--final` build as a draft release here,
   `<name>-<today>`. Only people with access to this repository can see a draft, and nothing reads it: not the site,
   not YouTube. The catalog below lists it under "In review".
2. **Review.** In worlds-landing, `npm run review -- <cut id>` downloads it and opens it on your local site, captions
   and all.
3. **Ship.** Run [Release a cut](../../actions/workflows/release.yml) (Actions, Release a cut, Run workflow) with its
   id. It publishes the release, lists the cut in `videos.json`, puts it on YouTube and updates the catalog. A new cut
   of the video on the site's home page takes its place there; tick "home" to put a different video there.
   Ship as many cuts at once as you like: each run makes its change on the latest `main` and tries again if another
   pushed first (`scripts/on-main.sh`). A release that failed or was stopped is safe to run again: each step skips
   what is already done.
4. **The site** fetches every cut in `videos.json` when it builds, so its next deploy has it (a push to worlds-landing,
   or its daily rebuild). `worlds.embabel.com/?v=<id>#watch` plays any cut, for trying one or sharing it.

**YouTube.** A cut not yet on YouTube is uploaded unlisted, with its title, description, chapters, tags, captions and
thumbnail, and its id is recorded in `videos.json`, so it is never uploaded twice. A new cut of a published one with
only its captions redone (`npm run video:recut -- <cut id>` in worlds-landing) keeps its YouTube video, and shipping it
replaces that video's captions. Until the YouTube secrets are set (see "Setting up the YouTube upload") that step is
skipped; once they are, [YouTube upload](../../actions/workflows/youtube.yml) puts a released cut there. Until Google
has audited our API project, YouTube keeps every video the job uploads private, so upload public cuts by hand until
then: the release has the master, captions, thumbnail and `youtube.txt`, and adding the id to `videos.json` tells the
job to leave that cut alone.

<!-- catalog -->
## Catalog

Written by `scripts/catalog.mjs`: don't edit it by hand.

### In review

Nothing in review.

### Released

#### What if AI had a north star? (`north-star`)

Understanding, purpose, agency: how a world gives your AI one.

| Cut | Length | | Site | YouTube | LinkedIn | Files |
| --- | --- | --- | --- | --- | --- | --- |
| `north-star-2026-11-01` | 2:01 | **current** | [watch](https://worlds.embabel.com/?v=north-star-2026-11-01#watch) | [hJbGo-2TSt8](https://youtu.be/hJbGo-2TSt8) | [video](https://github.com/embabel-worlds/worlds-media/releases/download/north-star-2026-11-01/linkedin.mp4), [post](https://github.com/embabel-worlds/worlds-media/releases/download/north-star-2026-11-01/linkedin.txt) | [release](https://github.com/embabel-worlds/worlds-media/releases/tag/north-star-2026-11-01) |

<!-- /catalog -->

## Sharing a cut

| Where | What | How |
| --- | --- | --- |
| YouTube | The upload the job made | Check it in YouTube Studio, then set it to Public. Until our API project is audited, the job's uploads stay private: upload by hand instead (see "Making, reviewing and shipping a cut"). |
| LinkedIn | `linkedin.mp4` and `linkedin.txt` | Upload the video natively, as a post with `linkedin.txt` as its text: LinkedIn shows native video to far more people than a link. Tag the colleagues it names. |
| The site | `worlds.embabel.com/?v=<id>#watch` | Links straight to a cut, in our own player at full quality. |
| Discord, email | The YouTube link | It previews everywhere, plays anywhere and counts views. |

Post the LinkedIn video and the YouTube link a day or so apart rather than together: each gets its own moment.

## Setting up the YouTube upload

Once, by someone who owns the YouTube channel:

1. **A Google Cloud project** with the **YouTube Data API v3** turned on (APIs & Services → Library).
2. **An OAuth consent screen** for it (External; add your Google account as a test user while it isn't published).
3. **An OAuth client** of type **Desktop app** (APIs & Services → Credentials). Note its id and secret.
4. **Sign in:** in this repository, run
   `YOUTUBE_CLIENT_ID=… YOUTUBE_CLIENT_SECRET=… node scripts/youtube-auth.mjs`. It opens Google's sign-in: sign in as
   the channel's owner and allow it. It saves the client and the sign-in as this repository's secrets with `gh`,
   without printing them.
5. **Verify the channel** (youtube.com/verify, a phone number) so the job can set custom thumbnails.
6. **Ask for the API audit** (Google's "YouTube API Services - Audit and Quota Extension Form"). Google's documentation
   says videos uploaded from an unaudited project are restricted to private, and the audit is what lifts that; it
   takes days to weeks. Until it passes, upload public cuts by hand.

A few cuts a day is well within YouTube's default API quota.
