export const onRequestGet = () =>
  new Response(JSON.stringify({ ok: true, time: new Date().toISOString() }), {
    headers: { 'content-type': 'application/json' }
  });
