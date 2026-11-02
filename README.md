# AmazonList — Family Wish List

Kids look at things on Amazon and add them to their own wish list. Parents see every kid's list on their own phone, approve or decline items, and mark things as bought. **There is no cart and no checkout** — the app only stores links.

Live: https://keubanks16.github.io/AmazonList/

## How it works
- **Parent:** open the app → *Start a new family* → enter kids' names and a PIN. You get an 8-character family code.
- **Kids:** open the *kids' link* the parent shares (or type the family code). Pick your name, tap a category or search to open Amazon, then **Share → Copy** and come back and tap **Paste link**. The product name fills in automatically from Amazon's share text.
- **Parent view:** tap *Parent 🔒* and enter the PIN. Filter by kid or status, sort by "most wanted", approve / bought / no, leave a note the kid can see, manage kids, change PIN.
- Lists sync between devices through a Cloudflare Worker + KV (`worker/`).

## Pieces
| Path | What |
|---|---|
| `index.html` | The whole app (GitHub Pages) |
| `worker/` | API at `https://amazonlist.kollinmeubanks.workers.dev` (Cloudflare Worker, KV namespace `amazonlist`) |
| `.github/workflows/pages.yml` | Deploys the site |
| Cloudflare Workers Builds | Deploys `worker/` automatically from GitHub |

## Safety notes
- The parent PIN is hashed (PBKDF2) on the server, and 5 wrong tries locks parent access for 15 minutes.
- Only Amazon.com product links are accepted; short links (`a.co`, `amzn.to`) are expanded to a clean `amazon.com/dp/ASIN` link.
- This app can't buy anything, but the Amazon app/site on a kid's device can if it's signed in to your account. Keep kids' devices signed out of Amazon (or use Amazon's parental controls).
