export const onRequestGet = async ({ env }) => {
  const hasKV = !!env.PHOTO_FEED && typeof env.PHOTO_FEED.get === 'function';
  return new Response(JSON.stringify({
    ok: true,
    time: new Date().toISOString(),
    kvBound: hasKV
  }), { headers: { 'content-type': 'application/json' } });
};
