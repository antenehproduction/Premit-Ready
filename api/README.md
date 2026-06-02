# ArchDraw Intel — Vercel Edge Function proxy

Single catch-all Edge Function (`api/[...path].js`) that does what `workers/proxy.js` does but on Vercel. Pick whichever platform you prefer — they're functionally equivalent.

## Deploy via Git (no CLI required) — recommended

1. Push the repo to GitHub (already done if you're reading this)
2. Open https://vercel.com/new
3. Click **Import Git Repository** → authorize GitHub if needed → select **Premit-Ready**
4. Project settings:
   - Framework Preset: **Other**
   - Root Directory: leave default
   - Build Command: leave empty
   - Output Directory: leave empty
5. Click **Deploy**
6. Wait ~30s. Vercel returns a URL like `https://premit-ready.vercel.app`

## Deploy via CLI (alternative)

```bash
npm i -g vercel
cd Premit-Ready/
vercel deploy --prod
```

## Wire it into the live app

In the browser DevTools console on the live app:
```js
localStorage.setItem('ADI_PROXY', 'https://<your-deployment>.vercel.app/api');
location.reload();
```

⚠️ Note the trailing **`/api`** — Vercel routes serverless functions under `/api` by default. With the `vercel.json` rewrites included in this repo, both `/api/fema` and `/fema` work at the deployment URL, but the client expects the proxy to expose paths like `/fema`, `/arcgis`, etc., relative to `ADI_PROXY`. Setting `ADI_PROXY` with `/api` suffix gives the cleanest behavior.

## Verify

Open `https://<your-deployment>.vercel.app/api/health` in your browser. You should see:
```json
{
  "ok": true,
  "version": "4-vercel",
  "platform": "vercel-edge",
  "routes": ["/api/fema?lat=&lon=", ...],
  "permitCities": ["seattle", "sf", "nyc", ...]
}
```

Test FEMA directly:
```
https://<your-deployment>.vercel.app/api/fema?lat=47.7553&lon=-122.3382
```
Should return FEMA NFHL JSON or `{ error: "upstream_non_json", ... }` if FEMA is having issues.

Use the diagnostic route to debug any upstream:
```
https://<your-deployment>.vercel.app/api/diag?url=<encoded-upstream-url>
```

## Notes

- Vercel free tier: 100GB bandwidth/month, 100K serverless function invocations/day. Comparable to Cloudflare's 100K req/day.
- Edge Functions run on V8 isolates — no cold starts.
- Auto-deploys on every push to main if you connect the GitHub integration.
- The static `index.html` will also be served from Vercel at the root, but this is harmless — your real site stays on GitHub Pages. The Vercel deployment exists *only* to provide the `/api/*` endpoints.

## Cloudflare equivalent

`workers/proxy.js` does the same thing on Cloudflare Workers. Choose whichever platform you prefer; the client (`index.html`) doesn't care which one you point `ADI_PROXY` at.
