# Deploy AmazonList

## GitHub Pages
1. Open repository **Settings → Pages**.
2. Under **Build and deployment**, select **GitHub Actions**.
3. Push to main or run **Deploy AmazonList to GitHub Pages** from Actions.
4. When the workflow succeeds, open the URL displayed in the deployment.

Expected site URL (only after deployment succeeds):
https://keubanks16.github.io/AmazonList/

## Important limitations
This is a browser-local prototype. Lists do **not** sync between different devices.
The parent PIN is not secure authentication and must not be relied upon to prevent a child with device access from bypassing restrictions.
There is no Amazon account connection, no automatic Amazon cart/list write, and no checkout.
Do not give children access to a signed-in Amazon browser session.

Before using this as a family service, add secure accounts, a cloud database, access rules, and a supported Amazon integration if one becomes available.
