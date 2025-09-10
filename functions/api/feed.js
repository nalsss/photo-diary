// Cloudflare Pages Function: GET /api/feed?limit=20&cursor=0
// Public endpoint — filters out deleted posts


export const onRequestGet = async ({ env, request }) => {
const url = new URL(request.url);
const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get('limit') || '20', 10)));
const cursor = Math.max(0, parseInt(url.searchParams.get('cursor') || '0', 10));


const FEED_KEY = 'feed:v1';
const raw = await env.PHOTO_FEED.get(FEED_KEY);
const feed = raw ? JSON.parse(raw) : [];


// hide soft-deleted posts
const visible = feed.filter(p => !p.deleted);
const slice = visible.slice(cursor, cursor + limit);
const nextCursor = cursor + slice.length < visible.length ? cursor + slice.length : null;


return new Response(JSON.stringify({ items: slice, nextCursor, total: visible.length }), {
headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
});
};