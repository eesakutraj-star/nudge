# Socratic — deployment guide

This folder is a complete, ready-to-deploy website. Follow these steps in order.

## 1. Get a free Gemini API key (no credit card needed)

1. Go to https://aistudio.google.com and sign in with a Google account.
2. Click **Get API key** (usually top-left), then **Create API key**.
3. Copy the key somewhere safe — you'll paste it into Vercel in step 3.

This is genuinely free: no card, no expiring trial, just a daily rate limit that's far more than one person will hit for personal use.

## 2. Put this project on GitHub

1. Go to https://github.com and create a free account if you don't have one.
2. Create a new repository (e.g. `socratic-guide`).
3. Upload every file in this folder to that repository (GitHub's "uploading an existing file" button in the web UI works fine — you don't need to use git commands).

## 3. Deploy to Vercel

1. Go to https://vercel.com and sign up using your GitHub account (this makes step 4 automatic).
2. Click **Add New → Project**, and select the `socratic-guide` repository you just created.
3. Before clicking Deploy, open **Environment Variables** and add:
   - Name: `GEMINI_API_KEY`
   - Value: the key you copied in step 1
4. Click **Deploy**. Vercel will build the site and give you a live URL (something like `socratic-guide.vercel.app`) within about a minute.

## 4. Test it

Open the URL Vercel gives you, type in a question, and confirm it generates a guide.

## Updating it later

Any time you want changes, either edit the files directly on GitHub or ask Claude to make the changes and upload the new files — Vercel automatically redeploys whenever the GitHub repository changes.

## Cost

Free. Gemini's free tier has a daily request limit, but it's generous enough that personal use (a handful of questions a day) won't come close to it. Vercel's free tier covers hosting at this scale too.
