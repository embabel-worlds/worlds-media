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
`north-star-2026-11-01`. Its files:

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

Release files aren't in the repository's history, so it stays small however many cuts there are. `videos.json` lists
the cuts, which one the site shows by default (`current`), and each one's YouTube id once it has one.

## Publishing a cut

From worlds-landing, after `npm run video -- --final`:

```sh
npm run video:publish                      # north-star-<today>, and the site's default from now on
npm run video:publish -- north-star-test   # another id; add --not-current to leave the default alone
```

It adds the cut to `videos.json` here and publishes its release with all the files above. Then:

1. **YouTube.** Publishing the release starts `.github/workflows/youtube.yml`, which uploads the master as an unlisted
   video, with its title, description, chapters, tags, captions and thumbnail, and records the video's id in
   `videos.json`. A cut already on YouTube is never uploaded again.
2. **The site** fetches every cut in `videos.json` when it builds, so the next deploy has it (a push to worlds-landing,
   or its daily rebuild). Without `?v=` the page plays the current cut; `worlds.embabel.com/?v=<id>#watch` plays any
   other, for trying a cut or sharing one.

## Sharing a cut

| Where | What | How |
| --- | --- | --- |
| YouTube | The upload the job made | Check it in YouTube Studio, then set it to Public. Until our API project is audited, YouTube makes it private first: set it to Unlisted or Public there. |
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
6. **Ask for the API audit** (Google's "YouTube API Services - Audit and Quota Extension Form"). Until Google has
   audited the project, YouTube makes every video it uploads private. The audit takes days to weeks; meanwhile,
   switch each upload to Unlisted or Public by hand.

The job can upload about six cuts a day on YouTube's default quota.
