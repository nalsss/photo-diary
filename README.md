# Tiny CMS Photoblog


Ultra-simple photoblog with a private upload page and a public JSON feed.


## What you need
- Cloudflare account (Pages, KV, Images)
- A Cloudflare Images variant named `web` (and optional `thumbnail`)
- Create a KV namespace (e.g., `PHOTO_FEED`)
- A secret `ADMIN_TOKEN` for your uploads
- Cloudflare account ID and Images API token (Images:Edit)
- Images Account Hash (for delivery URLs)


## Set up
1. **Create Pages project** from this repo. Pages Functions is enabled by `/functions`.
2. **Bindings (Pages → Settings → Functions → Environment variables & Bindings):**
- KV namespace binding: `PHOTO_FEED` → (select your namespace)
- Environment variables:
- `ADMIN_TOKEN` → a long random string
- `CF_ACCOUNT_ID` → your Cloudflare Account ID
- `CF_IMAGES_TOKEN` → API token with **Images:Edit**
- `CF_IMAGES_ACCOUNT_HASH` → found in Images dashboard (used in imagedelivery.net URLs)
3. **Cloudflare Images settings:** enable **strip metadata**. Create a **variant** named `web` (e.g., width 1600, fit: scale-down). Optionally `thumbnail` (e.g., width 800).
4. **Deploy** (main branch). Visit `/admin/` to upload.


## Public feed
- `GET /api/feed` returns `{ items, nextCursor, total }`.
- Your frontend can render newest-first from this.


## Security tips
- Keep `/admin/` unlinked from the homepage; it still requires `ADMIN_TOKEN`.
- Rotate `ADMIN_TOKEN` if you share it.
- Optionally restrict uploads to your IP using a check on `request.headers.get('cf-connecting-ip')`.


## Local dev (optional)
You can use `wrangler pages dev` if you prefer. Create a `wrangler.toml` and add bindings, or use `--binding` flags.