// POST /api/subscribe — stores an email in Workers KV (binding: SUBSCRIBERS).
// Zero-backend email capture: create a KV namespace in the Cloudflare dashboard
// and bind it as SUBSCRIBERS in wrangler.toml to activate. Until then this
// returns 503 and the form falls back to the RSS suggestion.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function onRequestPost({ request, env }) {
  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  let data;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: 'bad request' }, 400);
  }

  if (data.website) return json({ ok: true }); // honeypot field: bots "succeed" silently
  const email = String(data.email || '').trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 254) return json({ ok: false, error: 'invalid email' }, 422);
  if (!env.SUBSCRIBERS) return json({ ok: false, error: 'not configured' }, 503);

  await env.SUBSCRIBERS.put(
    `email:${email}`,
    JSON.stringify({ ts: new Date().toISOString(), source: data.source || 'site' })
  );
  return json({ ok: true });
}
