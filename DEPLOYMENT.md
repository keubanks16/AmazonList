# Deploy

## Website (GitHub Pages)
Pushing to `main` runs **Deploy AmazonList to GitHub Pages**.

## API (Cloudflare Worker) — one-time setup, no tokens
1. Cloudflare dashboard → **Workers & Pages → Create → Import a repository**.
2. Pick GitHub repo **AmazonList** (approve GitHub access if asked).
3. Project name: `amazonlist`. **Root directory: `worker`**. Leave the build/deploy commands as they are.
4. **Create and deploy.**

Cloudflare redeploys the API by itself whenever `worker/` changes on `main`.
The KV namespace `amazonlist` (id in `worker/wrangler.toml`) already exists.
Check: https://amazonlist.kollinmeubanks.workers.dev should show `{"ok":true,"app":"AmazonList API"}`.

## Local testing
Open `index.html?api=http://localhost:8787` against `wrangler dev` in `worker/`.
