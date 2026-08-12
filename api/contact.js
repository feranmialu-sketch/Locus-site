/* ============================================================
   CONTACT — Vercel serverless function behind POST /api/contact.

   Sends the enquiry through Resend's REST API. Deliberately
   zero-dependency (global fetch on Vercel's Node runtime) so the
   site keeps its no-build, no-package.json setup.

   RESEND_API_KEY is read from the environment here and never
   leaves this file — nothing in assets/ or the HTML touches it.
   ============================================================ */

const TO_EMAIL   = 'hello@locusstudio.dev';
const FROM_EMAIL = 'Locus Enquiries <enquiries@locusstudio.dev>';

/* Caps on every field so an oversized payload can't be relayed. */
const LIMITS = {
  name: 120, email: 200, company: 160,
  website: 200, need: 80, budget: 80, project: 5000
};

/* One message for anything the visitor can't act on. Real causes
   (missing key, Resend failure) go to the server log only. */
const GENERIC_ERROR =
  'Something went wrong sending your enquiry. Please try again, or email hello@locusstudio.dev directly.';

const clean = (value, max) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const escapeHtml = (value) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
       .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/* Deliberately loose — the browser already ran type="email", and the
   point here is to reject junk, not to adjudicate exotic addresses. */
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

function buildRows(fields){
  return fields
    .filter(([, value]) => value)
    .map(([label, value]) => `
      <tr>
        <td style="padding:10px 16px 10px 0;vertical-align:top;font:500 13px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#85888C;white-space:nowrap;">${escapeHtml(label)}</td>
        <td style="padding:10px 0;vertical-align:top;font:400 15px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#0B0C0D;">${escapeHtml(value).replace(/\n/g, '<br>')}</td>
      </tr>`)
    .join('');
}

module.exports = async (req, res) => {
  if(req.method !== 'POST'){
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if(!apiKey){
    console.error('[contact] RESEND_API_KEY is not set in this environment');
    return res.status(500).json({ error: GENERIC_ERROR });
  }

  /* Vercel parses JSON bodies automatically, but fall back to a manual
     parse so a stringified body doesn't 500. */
  let body = req.body;
  if(typeof body === 'string'){
    try { body = JSON.parse(body); } catch { body = null; }
  }
  if(!body || typeof body !== 'object'){
    return res.status(400).json({ error: 'We couldn’t read that submission. Please try again.' });
  }

  const name    = clean(body.name,    LIMITS.name);
  const email   = clean(body.email,   LIMITS.email);
  const company = clean(body.company, LIMITS.company);
  const website = clean(body.website, LIMITS.website);
  const need    = clean(body.need,    LIMITS.need);
  const budget  = clean(body.budget,  LIMITS.budget);
  const project = clean(body.project, LIMITS.project);

  if(!name || !isEmail(email)){
    return res.status(400).json({
      error: 'Please add your name and a valid work email so we can get back to you.'
    });
  }

  const fields = [
    ['Name', name], ['Email', email], ['Company', company],
    ['Website', website], ['Looking for', need], ['Budget', budget],
    ['Project', project]
  ];

  const text = fields
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n');

  const html = `
    <div style="background:#FBFAF8;padding:32px;">
      <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid rgba(11,12,13,0.11);border-radius:14px;overflow:hidden;">
        <div style="background:#0A0B0D;padding:24px 28px;">
          <div style="font:700 18px/1 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;letter-spacing:-0.03em;color:#F3F3F1;">LOCUS</div>
          <div style="margin-top:8px;font:400 14px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#9A9CA1;">New enquiry from the website</div>
        </div>
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;padding:8px 28px;">
          <tbody>${buildRows(fields)}</tbody>
        </table>
        <div style="padding:0 28px 28px;font:400 13px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#85888C;">
          Reply directly to this email to reach ${escapeHtml(name)}.
        </div>
      </div>
    </div>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        reply_to: email,
        subject: `New enquiry — ${name}${company ? ` (${company})` : ''}`,
        text,
        html
      })
    });

    if(!response.ok){
      /* Log the cause for us; the visitor only ever sees GENERIC_ERROR. */
      const detail = await response.text().catch(() => '');
      console.error('[contact] Resend responded', response.status, detail);
      return res.status(502).json({ error: GENERIC_ERROR });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[contact] Request to Resend failed', err);
    return res.status(502).json({ error: GENERIC_ERROR });
  }
};
