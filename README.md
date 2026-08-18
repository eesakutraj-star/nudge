# Nudge — deployment guide

This folder is a complete, ready-to-deploy website. Follow every step in order, and use the exact names suggested — that avoids the mix-ups that happen when things get renamed halfway through.

## 1. Get a free Gemini API key (no credit card needed)

1. Go to https://aistudio.google.com and sign in with a Google account.
2. Click **Get API key**, then **Create API key**.
3. Copy the key. Paste it into a plain text app (like Notes) first and check there's no space or line break stuck to the start or end of it — then copy it again from there. This avoids a common pasting error.

## 2. Put this project on GitHub

1. Go to https://github.com and log in (or sign up if you don't have an account).
2. Click **+** (top right) → **New repository**.
3. Name it exactly: `nudge`
4. Click **Create repository**.
5. On the next page, click **"uploading an existing file"** (a link in the setup instructions).
6. Drag in every file and folder from inside this `socratic-web` folder: `index.html`, `package.json`, `README.md`, and the whole `api` folder (with `guide.js` and `feedback.js` inside it — drag the `api` folder in as one folder, don't unpack it).
7. Scroll down and click **Commit changes**.

## 3. Deploy to Vercel

1. Go to https://vercel.com and log in (or sign up with GitHub if you don't have an account).
2. Click **Add New...** → **Project**.
3. Find the `nudge` repository in the list and click **Import**.
4. On the "Configure Project" screen, scroll down to find **Environment Variables**.
5. Add:
   - **Key:** `GEMINI_API_KEY`
   - **Value:** paste your Gemini key in directly
6. Click **Deploy**.
7. Wait about a minute for it to build. Vercel will then show a live URL, something like `nudge-xxxx.vercel.app`.

## 4. Test it

1. Click the **Visit** button (or the domain link) to open the live site — don't click into a deployment's build log, that's a different page.
2. Fill in the country / year / age screen.
3. Type a question and click **Begin**.

If you see an error mentioning "the string did not match the expected pattern," it almost always means the `GEMINI_API_KEY` value in Vercel is empty or has a stray character. Go to your Vercel project → **Settings** → **Environment Variables**, delete the row, and re-add it fresh with a cleanly-copied key, then redeploy from the **Deployments** tab (⋯ menu → **Redeploy**).

## Updating it later

Edit files directly on GitHub (open the file, click the pencil/edit icon, make changes, commit) — Vercel automatically redeploys whenever the GitHub repository changes. No need to touch Vercel directly for code changes, only for environment variable changes.

## Installing it like an app (PWA)

Once deployed, Nudge can be installed to a device's home screen like a real app — no App Store needed.

**On iPhone/iPad (Safari):**
1. Open your live Nudge URL in Safari
2. Tap the **Share** icon (square with an arrow)
3. Tap **Add to Home Screen**
4. It'll appear as its own icon and open full-screen, no browser bar

**On Mac (Safari or Chrome):**
1. Open your live Nudge URL
2. Safari: **File → Add to Dock**. Chrome: click the install icon in the address bar (or menu → **Install Nudge...**)

**On Android (Chrome):**
1. Open your live Nudge URL
2. Tap the **⋮** menu → **Install app** (or you'll see an automatic install prompt)

## Cost

Free. Gemini's free tier and Vercel's free tier both comfortably cover personal use.
