# Deploy

## Website (GitHub Pages)
Pushing to `main` runs **Deploy AmazonList to GitHub Pages**.

## API (Cloudflare Worker) — one-time setup
1. In Cloudflare, create an API token with the **Edit Cloudflare Workers** template.
2. In this repo: **Settings → Secrets and variables → Actions → New repository secret**:
   - `CLOUDFLARE_API_TOKEN` — the token
   - `CLOUDFLARE_ACCOUNT_ID` — from the Cloudflare dashboard (Workers & Pages → right sidebar)
3. **Actions → Deploy AmazonList API (Cloudflare Worker) → Run workflow.**

The KV namespace `amazonlist` (id in `worker/wrangler.toml`) already exists.
After deploy, https://amazonlist.kollinmeubanks.workers.dev should return `{"ok":true,"app":"AmazonList API"}`.

## Local testing
Open `index.html?api=http://localhost:8787` against `wrangler dev` in `worker/`.
