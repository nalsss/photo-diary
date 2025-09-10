// Routes:
// PATCH /api/post/:id -> edit caption (and optionally toggle deleted)
// DELETE /api/post/:id -> soft-delete (default) or hard delete with ?hard=1
// Auth: Authorization: Bearer <ADMIN_TOKEN>


export const onRequest = async ({ request, env, params }) => {
const { id } = params; // file-based param from [id].js
const method = request.method.toUpperCase();

  // --- TEMP: GET for debugging route & KV ---
  if (method === 'GET') {
    const raw = await env.PHOTO_FEED.get('feed:v1');
    const feed = raw ? JSON.parse(raw) : [];
    const post = feed.find(p => p.id === id) || null;
    return new Response(JSON.stringify({ ok: true, exists: !!post, post }), {
      headers: { 'content-type': 'application/json' }
    });
  }
  // ------------------------------------------
  
  // (keep the rest of your PATCH/DELETE code below)

// Auth
const auth = request.headers.get('Authorization') || '';
const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
if (!token || token !== env.ADMIN_TOKEN) {
return json({ error: 'Unauthorized' }, 401);
}


const FEED_KEY = 'feed:v1';
const raw = await env.PHOTO_FEED.get(FEED_KEY);
const feed = raw ? JSON.parse(raw) : [];
const idx = feed.findIndex(p => p.id === id);
if (idx === -1) return json({ error: 'Not found' }, 404);


if (method === 'PATCH') {
let body = {};
try { body = await request.json(); } catch {}
const { caption, deleted } = body;
if (typeof caption === 'string') feed[idx].caption = caption.trim();
if (typeof deleted === 'boolean') feed[idx].deleted = deleted;


await env.PHOTO_FEED.put(FEED_KEY, JSON.stringify(feed));
return json({ ok: true, post: feed[idx] });
}


if (method === 'DELETE') {
const url = new URL(request.url);
const hard = url.searchParams.get('hard') === '1';


if (hard) {
// permanently remove from feed and delete image from Cloudflare Images
const post = feed[idx];
// Remove from feed
feed.splice(idx, 1);
await env.PHOTO_FEED.put(FEED_KEY, JSON.stringify(feed));


// Best effort delete the image (ignore failure)
try {
if (post?.image?.id) {
await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/images/v1/${post.image.id}`, {
method: 'DELETE',
headers: { 'Authorization': `Bearer ${env.CF_IMAGES_TOKEN}` }
});
}
} catch (e) {
// ignore, image may already be gone
}
return json({ ok: true, hardDeleted: true });
} else {
// soft delete: keep in feed but mark deleted
feed[idx].deleted = true;
await env.PHOTO_FEED.put(FEED_KEY, JSON.stringify(feed));
return json({ ok: true, softDeleted: true, post: feed[idx] });
}
}


return json({ error: 'Method not allowed' }, 405);
};


function json(data, status = 200) {
return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}