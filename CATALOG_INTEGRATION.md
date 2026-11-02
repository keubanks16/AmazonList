# Built-in shopping integration

The app now includes an embedded product search UI, product image/price cards, category search, and Add to My List buttons.

**Live results are disabled until an authorized catalog provider is connected.** No dummy listings or fabricated prices are shown.

## Configure
1. Deploy a secure server-side API that is permitted to access Amazon product listings (subject to Amazon's applicable terms and eligibility).
2. API request: `GET https://YOUR-ENDPOINT.example/search?q=lego`
3. JSON response:
```json
{
  "products": [
    {
      "title": "Example product",
      "price": "$19.99",
      "image": "https://example.com/product.jpg",
      "url": "https://www.amazon.com/dp/B000000000"
    }
  ]
}
```
4. Allow CORS for the GitHub Pages origin. Never put Amazon API secrets in client-side code.
5. Create `catalog-config.json` at the repository root with:
```json
{"endpoint":"https://YOUR-ENDPOINT.example/search"}
```
6. Redeploy.

This does not write to a personal Amazon cart or wish list. That requires a separately supported authorization mechanism, which is not currently included.

For production use, add Firebase Authentication or equivalent, per-family access rules, cloud storage, and server-side validation. Current browser-local data and PIN are not a secure multi-device service.
