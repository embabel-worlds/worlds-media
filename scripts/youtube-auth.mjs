/**
 * Signs the YouTube upload in, once: `YOUTUBE_CLIENT_ID=… YOUTUBE_CLIENT_SECRET=… node scripts/youtube-auth.mjs`.
 *
 * It opens Google's sign-in in your browser. Sign in as the YouTube channel's owner and allow the upload. Google hands a
 * refresh token back to this script on a local port, and the script saves it as the repository secret
 * YOUTUBE_REFRESH_TOKEN with the gh command, never printing it. The client's id and secret are saved alongside, as
 * YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET. Run it again if the token is ever revoked.
 *
 * The OAuth client is a "Desktop app" client in the Google Cloud project that has the YouTube Data API v3 turned on
 * (see the README).
 */
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';

const REPO = 'embabel-worlds/worlds-media';
const PORT = 8723;
const { YOUTUBE_CLIENT_ID: id, YOUTUBE_CLIENT_SECRET: secret } = process.env;
if (!id || !secret) throw new Error('set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET (the Desktop app OAuth client) first');
const redirect = `http://127.0.0.1:${PORT}`;
const scopes = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.force-ssl'];

const code = await new Promise((done, fail) => {
    const server = createServer((request, response) => {
        const url = new URL(request.url, redirect);
        const got = url.searchParams.get('code');
        response.end(got ? 'Signed in. You can close this tab.' : `Not signed in: ${url.searchParams.get('error') ?? 'no code'}`);
        server.close();
        got ? done(got) : fail(new Error(url.searchParams.get('error') ?? 'no code'));
    }).listen(PORT, '127.0.0.1', () => {
        const consent = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        consent.search = new URLSearchParams({ client_id: id, redirect_uri: redirect, response_type: 'code', scope: scopes.join(' '), access_type: 'offline', prompt: 'consent' });
        console.log('Opening Google sign-in: sign in as the YouTube channel owner.');
        execFileSync('open', [consent.href]);
    });
});

const token = await (await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({ client_id: id, client_secret: secret, code, redirect_uri: redirect, grant_type: 'authorization_code' }),
})).json();
if (!token.refresh_token) throw new Error(`Google gave no refresh token: ${token.error ?? ''} ${token.error_description ?? ''}`);

for (const [name, value] of [['YOUTUBE_CLIENT_ID', id], ['YOUTUBE_CLIENT_SECRET', secret], ['YOUTUBE_REFRESH_TOKEN', token.refresh_token]]) {
    execFileSync('gh', ['secret', 'set', name, '--repo', REPO], { input: value });
}
console.log(`Saved YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET and YOUTUBE_REFRESH_TOKEN as secrets of ${REPO}.`);
