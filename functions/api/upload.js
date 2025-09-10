// Cloudflare Pages Function: POST /api/upload
// Requires bindings (set in Pages project settings):
// - PHOTO_FEED: KV Namespace binding
// - CF_ACCOUNT_ID: string (Cloudflare Account ID)
// - CF_IMAGES_TOKEN: string (API token with Images:Edit)
// - CF_IMAGES_ACCOUNT_HASH: string (Images delivery hash, e.g., abcDEF123456)
// - ADMIN_TOKEN: string (your secret uploader token)


export const onRequestPost = async (context) => {
const { env, request } = context;


// 1) Auth: Bearer token
const auth = request.headers.get('Authorization') || '';
const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
if (!token || token !== env.ADMIN_TOKEN) {
return json({ error: 'Unauthorized' }, 401);
}


// 2) Parse form (file + caption)
const ct = request.headers.get('content-type') || '';
if (!ct.includes('multipart/form-data')) return json({ error: 'Expected multipart/form-data' }, 400);


const form = await request.formData();
const file = form.get('photo');
const caption = (form.get('caption') || '').toString().trim();


if (!file || typeof file === 'string') return json({ error: 'Missing file' }, 400);
if (!file.type.startsWith('image/')) return json({ error: 'File must be an image' }, 400);
if (file.size > 15 * 1024 * 1024) return json({ error: 'Max size is 15 MB' }, 400);


// 3) Create a direct upload URL in Cloudflare Images
const directUpload = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/images/v2/direct_upload`, {
method: 'POST',
headers: { 'Authorization': `Bearer ${env.CF_IMAGES_TOKEN}` },
}).then(r => r.json());


if (!directUpload.success) {
return json({ error: 'Failed to create direct upload', details: directUpload.errors }, 502);
}


const uploadURL = directUpload.result.uploadURL;


// 4) Upload the image file to that URL
const uploadForm = new FormData();
uploadForm.append('file', file, file.name || 'photo');


const uploaded = await fetch(uploadURL, { method: 'POST', body: uploadForm }).then(r => r.json());
if (!uploaded || !uploaded.result || !uploaded.result.id) {
return json({ error: 'Image upload failed', details: uploaded && uploaded.errors }, 502);
}


const imageId = uploaded.result.id;
const createdAt = new Date().toISOString();


// 5) Build delivery URLs (variant "web" recommended in Images dashboard)
const accountHash = env.CF_IMAGES_ACCOUNT_HASH; // e.g., imagedelivery.net/<hash>/<id>/<variant>
const webUrl = `https://imagedelivery.net/${accountHash}/${imageId}/web`;
const thumbUrl = `https://imagedelivery.net/${accountHash}/${imageId}/thumbnail`; // optional variant


const post = {
id: `${createdAt}_${imageId}`,
createdAt,
caption,
image: { id: imageId, webUrl, thumbUrl }
};


  // 6) Persist: append to head of feed array in KV (with error handling)
  const FEED_KEY = 'feed:v1';
  try {
    const raw = await env.PHOTO_FEED.get(FEED_KEY);
    const feed = raw ? JSON.parse(raw) : [];
    feed.unshift(post);
    if (feed.length > 1000) feed.length = 1000;
    await env.PHOTO_FEED.put(FEED_KEY, JSON.stringify(feed));
  } catch (e) {
    // Return JSON so the admin page can show a clear message
    return json({ 
      ok: false, 
      error: 'KV write failed. Check that PHOTO_FEED binding exists in this environment.',
      details: String(e)
    }, 500);
  }

  return json({ ok: true, post });
};