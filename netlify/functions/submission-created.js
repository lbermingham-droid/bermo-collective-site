// Netlify Function: triggered automatically every time a form is submitted.
// Sends a brand-aligned auto-reply to the user (audit only) + internal notification to Lexi (all forms).

exports.handler = async function (event, context) {
  try {
    // Skip Netlify's auto-trigger — only run from our direct fetch calls
    if (context && context.clientContext && context.clientContext.custom && context.clientContext.custom.netlify) {
      console.log('Skipping Netlify auto-trigger, waiting for direct call');
      return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: true }) };
    }

    const body = JSON.parse(event.body);
    const payload = body.payload || {};
    const formName = payload.form_name;
    const data = payload.data || {};

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'BERMO.COLLECTIVE <lexi@bermoco.com>';
    const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'lbermingham@bermoco.com';
    const SITE_URL = process.env.SITE_URL || 'https://bermoco.com';

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not set.');
      return { statusCode: 500, body: 'Resend not configured' };
    }

    const results = [];

    if (formName === 'audit') {
      // Customer-facing email (brand voice, no dashes)
      const userEmail = (data.email || '').trim();
      const firstName = (data.first_name || 'there').trim();
      const gapsScore = (data.audit_gaps_score || '').trim();
      const brand = (data.brand_name || '').trim();
      const auditInsights = (data.audit_insights || '').trim();

      if (userEmail) {
        const customerHtml = buildAuditCustomerEmail({ firstName, gapsScore, brand, auditInsights, siteUrl: SITE_URL });
        const customerSubject = `${firstName.toUpperCase()}. Your read is in.`;
        const r1 = await sendViaResend(RESEND_API_KEY, {
          from: FROM_EMAIL,
          to: [userEmail],
          reply_to: NOTIFY_EMAIL,
          subject: customerSubject,
          html: customerHtml,
        });
        results.push({ kind: 'customer-audit', ...r1 });
      }

      // Internal notification
      const internalHtml = buildAuditNotification(data);
      const r2 = await sendViaResend(RESEND_API_KEY, {
        from: FROM_EMAIL,
        to: [NOTIFY_EMAIL],
        reply_to: userEmail || NOTIFY_EMAIL,
        subject: `NEW AUDIT. ${(data.first_name || '').trim()} ${(data.last_name || '').trim()}. ${gapsScore} gaps.`,
        html: internalHtml,
      });
      results.push({ kind: 'internal-audit', ...r2 });
    } else if (formName === 'collabnation') {
      // Collab Nation customer thank-you (pink accent, lowercase playful voice)
      const userEmail = (data.email || '').trim();
      const fullName = (data.name || 'friend').trim();
      const firstName = fullName.split(' ')[0] || 'friend';
      const brand = (data.brand || '').trim();

      if (userEmail) {
        const displayFirst = (firstName || 'Friend').charAt(0).toUpperCase() + (firstName || 'Friend').slice(1).toLowerCase();
        const customerHtml = buildCollabCustomerEmail({ firstName, brand, siteUrl: SITE_URL });
        const rc = await sendViaResend(RESEND_API_KEY, {
          from: FROM_EMAIL,
          to: [userEmail],
          reply_to: NOTIFY_EMAIL,
          subject: `${displayFirst}, you're in the room. Collab Nation.`,
          html: customerHtml,
        });
        results.push({ kind: 'customer-collab', ...rc });
      }

      // Internal notification (pink accent, shows all form fields)
      const internalHtml = buildCollabNotification(data);
      const r = await sendViaResend(RESEND_API_KEY, {
        from: FROM_EMAIL,
        to: [NOTIFY_EMAIL],
        reply_to: userEmail || NOTIFY_EMAIL,
        subject: `NEW COLLAB NATION. ${fullName}. ${(data.role || 'unknown role').toLowerCase()}.`,
        html: internalHtml,
      });
      results.push({ kind: 'internal-collab', ...r });
    } else if (formName === 'contact') {
      // Customer-facing thank-you email (brand voice, no dashes)
      const userEmail = (data.email || '').trim();
      const firstName = (data.first_name || 'there').trim();
      console.log('Contact form - userEmail:', userEmail, 'firstName:', firstName, 'FROM:', FROM_EMAIL);

      if (userEmail) {
        const customerHtml = buildContactCustomerEmail({ firstName, siteUrl: SITE_URL });
        const customerSubject = `${firstName.toUpperCase()}. Got it.`;
        const rc = await sendViaResend(RESEND_API_KEY, {
          from: FROM_EMAIL,
          to: [userEmail],
          reply_to: NOTIFY_EMAIL,
          subject: customerSubject,
          html: customerHtml,
        });
        results.push({ kind: 'customer-contact', ...rc });
      }

      // Internal notification for contact
      const internalHtml = buildContactNotification(data);
      const topic = (data.interest || '').trim();
      const r = await sendViaResend(RESEND_API_KEY, {
        from: FROM_EMAIL,
        to: [NOTIFY_EMAIL],
        reply_to: userEmail || NOTIFY_EMAIL,
        subject: `NEW INQUIRY. ${(data.first_name || '').trim()} ${(data.last_name || '').trim()}. ${topic || 'general'}.`,
        html: internalHtml,
      });
      results.push({ kind: 'internal-contact', ...r });
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, results }) };
  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, body: 'error: ' + (err && err.message) };
  }
};

async function sendViaResend(apiKey, payload) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error('Resend error:', res.status, txt);
    return { ok: false, status: res.status, error: txt };
  }
  const json = await res.json();
  return { ok: true, id: json.id };
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ============================================================================
// CUSTOMER AUDIT EMAIL  (brand voice, zero dashes)
// ============================================================================
function buildAuditCustomerEmail({ firstName, gapsScore, brand, auditInsights, siteUrl }) {
  const safeName = escapeHtml(firstName);
  const safeGaps = escapeHtml(gapsScore);
  const safeBrand = escapeHtml(brand);
  const guideUrl = siteUrl + '/free-guide.pdf';
  const contactUrl = siteUrl + '/contact';

  // Parse insights (separated by ||) and build a bullet list. Fall back to summary if no insights.
  let insights = (auditInsights || '').split('||').map(s => s.trim()).filter(Boolean);
  const insightsBlock = insights.length ? `
          <div style="margin:0 0 28px;padding:22px 24px;background:#f5f5f0;border-left:4px solid #00f5d4;">
            <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#0a0a0a;font-weight:900;margin-bottom:14px;">Here's What Stood Out</div>
            ${insights.map(ins => `<p style="font-size:14px;line-height:1.7;color:#0a0a0a;margin:0 0 12px;padding-left:18px;position:relative;"><span style="position:absolute;left:0;top:0;color:#00f5d4;font-weight:900;">&#9642;</span>${escapeHtml(ins)}</p>`).join('')}
          </div>
  ` : '';

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your Read. BERMO.COLLECTIVE</title></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#0a0a0a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:48px 20px;">
    <tr><td align="center">
      <table role="presentation" width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#ffffff;border:1.5px solid #0a0a0a;">

        <tr><td style="background:#00f5d4;padding:8px 24px;">
          <div style="font-size:9px;letter-spacing:3.5px;text-transform:uppercase;color:#0a0a0a;font-weight:900;font-family:'Inter Tight','Helvetica Neue',Arial,sans-serif;">BERMO.COLLECTIVE</div>
        </td></tr>

        <tr><td style="padding:44px 36px 8px;">
          <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#0a0a0a;font-weight:900;margin-bottom:18px;">Your Read. Your Next Move.</div>
          <h1 style="font-size:38px;line-height:0.92;letter-spacing:-0.03em;margin:0 0 16px;text-transform:uppercase;font-weight:900;color:#0a0a0a;font-family:'Inter Tight','Helvetica Neue',Arial,sans-serif;">
            ${safeName},<br>your read<br>is in.
          </h1>
          <div style="height:8px;width:72px;background:#00f5d4;margin:20px 0 24px;"></div>
          <p style="font-size:15px;line-height:1.7;color:#333;margin:0 0 26px;">Thanks for taking the audit! I will review everything you submitted and reach out within 24 hours. Excited to chat! In the meantime, I included the results summary and free guide below.</p>
${insightsBlock}
          <div style="background:#0a0a0a;padding:24px 26px;margin:0 0 28px;">
            <div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#00f5d4;font-weight:900;margin-bottom:8px;">Your Read</div>
            <div style="font-size:32px;line-height:1;letter-spacing:-0.02em;color:#ffffff;font-weight:900;font-family:'Inter Tight','Helvetica Neue',Arial,sans-serif;text-transform:uppercase;">${safeGaps} gaps</div>
            <div style="font-size:12px;color:rgba(255,255,255,0.65);margin-top:8px;line-height:1.5;">This isn't a grade. It's a starting line. Now we both know exactly where to push.</div>
          </div>

          <p style="font-size:15px;line-height:1.7;color:#0a0a0a;margin:0 0 8px;"><strong>The guide is below.</strong></p>
          <p style="font-size:14px;line-height:1.7;color:#555;margin:0 0 22px;">Five gaps most brands miss. The fastest ways to close them. Read it once. Sit with it. Then come talk to me.</p>

          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 28px;">
            <tr><td style="background:#0a0a0a;">
              <a href="${guideUrl}" style="display:inline-block;padding:18px 34px;font-size:13px;font-weight:900;letter-spacing:0.06em;color:#00f5d4;text-decoration:none;text-transform:uppercase;font-family:'Inter Tight','Helvetica Neue',Arial,sans-serif;">Download Your Free Guide &rarr;</a>
            </td></tr>
          </table>

          <div style="border-top:1px solid #e2e0db;padding-top:22px;margin-top:4px;">
            <p style="font-size:14px;line-height:1.7;color:#0a0a0a;margin:0 0 12px;"><strong>One conversation usually saves months.</strong> Sometimes years.</p>
            <p style="font-size:14px;line-height:1.7;color:#555;margin:0 0 16px;">I reach out personally inside 24 hours. Or skip the wait and book time with me directly.</p>
            <a href="${contactUrl}" style="display:inline-block;font-size:12px;font-weight:700;letter-spacing:0.08em;color:#0a0a0a;text-decoration:none;text-transform:uppercase;border-bottom:2px solid #00f5d4;padding-bottom:3px;">Book a call &rarr;</a>
          </div>
        </td></tr>

        <tr><td style="padding:32px 36px 36px;">
          <div style="border-top:1px solid #e2e0db;padding-top:20px;">
            <p style="font-size:13px;line-height:1.6;color:#0a0a0a;margin:0 0 4px;font-weight:700;">Lexi</p>
            <p style="font-size:11px;line-height:1.6;color:#777;margin:0;letter-spacing:0.04em;text-transform:uppercase;font-weight:500;">Founder, BERMO.COLLECTIVE</p>
          </div>
        </td></tr>

        <tr><td style="background:#0a0a0a;padding:18px 36px;text-align:center;">
          <a href="https://bermoco.com" style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.5);font-weight:500;text-decoration:none;">bermoco.com</a>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ============================================================================
// CUSTOMER CONTACT THANK YOU  (brand voice, zero dashes)
// ============================================================================
function buildContactCustomerEmail({ firstName, siteUrl }) {
  const safeName = escapeHtml(firstName);
  const auditUrl = siteUrl + '/audit';

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Got It. BERMO.COLLECTIVE</title></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#0a0a0a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:48px 20px;">
    <tr><td align="center">
      <table role="presentation" width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#ffffff;border:1.5px solid #0a0a0a;">

        <tr><td style="background:#00f5d4;padding:8px 24px;">
          <div style="font-size:9px;letter-spacing:3.5px;text-transform:uppercase;color:#0a0a0a;font-weight:900;font-family:'Inter Tight','Helvetica Neue',Arial,sans-serif;">BERMO.COLLECTIVE</div>
        </td></tr>

        <tr><td style="padding:44px 36px 8px;">
          <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#0a0a0a;font-weight:900;margin-bottom:18px;">This Just Found Me</div>
          <h1 style="font-size:42px;line-height:0.92;letter-spacing:-0.03em;margin:0 0 16px;text-transform:uppercase;font-weight:900;color:#0a0a0a;font-family:'Inter Tight','Helvetica Neue',Arial,sans-serif;">
            ${safeName},<br>I got your note.
          </h1>
          <div style="height:8px;width:72px;background:#00f5d4;margin:20px 0 24px;"></div>
          <p style="font-size:15px;line-height:1.7;color:#0a0a0a;margin:0 0 14px;">It's in front of me right now. <strong>Real humans still read these.</strong></p>
          <p style="font-size:15px;line-height:1.7;color:#333;margin:0 0 14px;">I will reach out within the next 24 hours to chat! If this is urgent, shoot me an email at <a href="mailto:lexi@bermoco.com" style="color:#0a0a0a;font-weight:600;">lexi@bermoco.com</a>, otherwise I look forward to discussing your growth plan.</p>

          <div style="border-top:1px solid #e2e0db;padding-top:22px;margin-top:8px;">
            <p style="font-size:13px;line-height:1.6;color:#0a0a0a;margin:0 0 4px;font-weight:700;">Talk soon,</p>
            <p style="font-size:13px;line-height:1.6;color:#0a0a0a;margin:0 0 4px;font-weight:700;">Lexi</p>
            <p style="font-size:11px;line-height:1.6;color:#777;margin:0;letter-spacing:0.04em;text-transform:uppercase;font-weight:500;">Founder, BERMO.COLLECTIVE</p>
          </div>
        </td></tr>

        <tr><td style="padding:0 36px 36px;">
          <div style="background:#f5f5f0;padding:22px 24px;border-left:4px solid #00f5d4;">
            <div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#00b894;font-weight:900;margin-bottom:8px;">P.S.</div>
            <p style="font-size:14px;line-height:1.65;color:#0a0a0a;margin:0 0 14px;">If you want a real head start, take the <strong>free brand audit</strong> while you wait. 10 questions, 2 minutes. It shows me exactly where your brand is breaking, so when we talk I already know where to push. Head start for both of us.</p>
            <a href="${auditUrl}" style="display:inline-block;font-size:12px;font-weight:700;letter-spacing:0.08em;color:#0a0a0a;text-decoration:none;text-transform:uppercase;border-bottom:2px solid #00f5d4;padding-bottom:3px;">Take The Brand Audit &rarr;</a>
          </div>
        </td></tr>

        <tr><td style="background:#0a0a0a;padding:18px 36px;text-align:center;">
          <a href="https://bermoco.com" style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.5);font-weight:500;text-decoration:none;">bermoco.com</a>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ============================================================================
// COLLAB NATION CUSTOMER EMAIL  (pink accent, warm voice, proper capitalization, zero dashes)
// ============================================================================
function buildCollabCustomerEmail({ firstName, brand, siteUrl }) {
  // Capitalize first letter of name
  const displayName = (firstName || 'Friend').charAt(0).toUpperCase() + (firstName || 'Friend').slice(1).toLowerCase();
  const safeName = escapeHtml(displayName);
  const safeBrand = escapeHtml(brand);

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>You're In The Room. Collab Nation.</title></head>
<body style="margin:0;padding:0;background:#fff8f0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#0a0a0a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff8f0;padding:48px 20px;">
    <tr><td align="center">
      <table role="presentation" width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#ffffff;border:2px solid #0a0a0a;border-radius:12px;overflow:hidden;">

        <tr><td style="background:#ff2d7a;padding:10px 26px;">
          <div style="font-size:9px;letter-spacing:3.5px;text-transform:uppercase;color:#ffffff;font-weight:900;font-family:'Inter Tight','Helvetica Neue',Arial,sans-serif;">COLLAB NATION &bull; by BERMO.COLLECTIVE</div>
        </td></tr>

        <tr><td style="padding:44px 36px 8px;">
          <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#ff2d7a;font-weight:900;margin-bottom:18px;">Application Received</div>
          <h1 style="font-size:38px;line-height:0.95;letter-spacing:-0.02em;margin:0 0 16px;color:#0a0a0a;font-family:'Inter Tight','Helvetica Neue',Arial,sans-serif;font-weight:900;text-transform:uppercase;">
            ${safeName},<br>you're in the room.
          </h1>
          <div style="height:8px;width:72px;background:#ff2d7a;margin:20px 0 24px;"></div>
          <p style="font-size:16px;line-height:1.7;color:#0a0a0a;margin:0 0 18px;"><strong>Welcome to the energy shift.</strong></p>
          <p style="font-size:15px;line-height:1.7;color:#333;margin:0 0 14px;">Collab Nation is where brands stop competing and start compounding. Pop ups, partnerships, and shared audiences, all built on the belief that when one of us wins, we all win.</p>
          <p style="font-size:15px;line-height:1.7;color:#333;margin:0 0 14px;">It isn't a directory. It isn't a referral list. It's a curated room of founder led businesses, hosts, and creators who actually show up for each other. Real introductions. Real collaborations. Real visibility, without the cold outreach grind.</p>
          <p style="font-size:15px;line-height:1.7;color:#333;margin:0 0 28px;">You told me about${safeBrand ? ' <strong>' + safeBrand + '</strong>' : ' your brand'}, and that already puts you ahead of the people still thinking about it. Collab Nation is built for the ones who move.</p>

          <div style="background:#fff8f0;padding:24px 26px;margin:0 0 28px;border-left:4px solid #ff2d7a;">
            <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#ff2d7a;font-weight:900;margin-bottom:12px;">What Happens Next</div>
            <p style="font-size:14px;line-height:1.75;color:#0a0a0a;margin:0;">I'll review your information and reach out within 24 hours to discuss getting involved in our next event. Can't wait to chat.</p>
          </div>

          <p style="font-size:14px;line-height:1.7;color:#555;margin:0 0 6px;">In the meantime, start thinking about the brands, rooms, and moments that would light you up. The more specific, the sharper the fit.</p>

          <div style="border-top:1px solid #f0e0cc;padding-top:22px;margin-top:22px;">
            <p style="font-size:14px;line-height:1.6;color:#0a0a0a;margin:0 0 4px;font-weight:700;">Talk soon,</p>
            <p style="font-size:14px;line-height:1.6;color:#0a0a0a;margin:0 0 4px;font-weight:700;">Lexi</p>
            <p style="font-size:11px;line-height:1.6;color:#777;margin:0;letter-spacing:0.04em;text-transform:uppercase;font-weight:500;">Founder, BERMO.COLLECTIVE</p>
          </div>
        </td></tr>

        <tr><td style="background:#0a0a0a;padding:18px 36px;text-align:center;">
          <div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#ffffff;font-weight:500;">bermoco.com <span style="color:#ff2d7a;">&bull;</span> COLLAB NATION</div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ============================================================================
// INTERNAL NOTIFICATIONS (for Lexi's inbox)
// ============================================================================
function buildCollabNotification(data) {
  const rows = [
    ['Name', data.name],
    ['Email', data.email],
    ['Brand', data.brand],
    ['Role', data.role],
    ['City', data.city],
  ];
  const vibe = (data.vibe || '').trim();
  return wrapInternal('NEW COLLAB NATION APPLICATION', '#ff2d7a', `
    ${buildTable('Applicant', rows)}
    <div style="margin:20px 0 0;padding:18px 20px;background:#fff8f0;border-left:4px solid #ff2d7a;">
      <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#0a0a0a;font-weight:900;margin-bottom:8px;">Dream Collabs + Energy</div>
      <div style="font-size:14px;line-height:1.6;color:#0a0a0a;white-space:pre-wrap;">${escapeHtml(vibe)}</div>
    </div>
  `);
}

function buildAuditNotification(data) {
  const rows = [
    ['Name', ((data.first_name || '') + ' ' + (data.last_name || '')).trim()],
    ['Email', data.email],
    ['Phone', data.phone],
    ['Brand', data.brand_name],
    ['Website / Handle', data.website_handle],
    ['Score', data.audit_gaps_score],
  ];
  const auditSummary = (data.audit_summary || '').trim();
  const biggestProblem = (data.biggest_problem || '').trim();

  const summaryBlock = auditSummary ? `
    <div style="margin:22px 0 0;padding:20px 22px;background:#0a0a0a;color:#ffffff;">
      <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#00f5d4;font-weight:900;margin-bottom:12px;">Quiz Answers</div>
      <pre style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.65;color:#ffffff;white-space:pre-wrap;margin:0;">${escapeHtml(auditSummary)}</pre>
    </div>
  ` : '';

  const problemBlock = biggestProblem ? `
    <div style="margin:20px 0 0;padding:18px 20px;background:#f5f5f0;border-left:4px solid #00f5d4;">
      <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#0a0a0a;font-weight:900;margin-bottom:8px;">Biggest Problem (their words)</div>
      <div style="font-size:14px;line-height:1.6;color:#0a0a0a;white-space:pre-wrap;">${escapeHtml(biggestProblem)}</div>
    </div>
  ` : '';

  return wrapInternal('NEW AUDIT SUBMISSION', '#00f5d4', `
    ${buildTable('Contact', rows)}
    ${summaryBlock}
    ${problemBlock}
  `);
}

function buildContactNotification(data) {
  const rows = [
    ['Name', ((data.first_name || '') + ' ' + (data.last_name || '')).trim()],
    ['Email', data.email],
    ['Phone', data.phone],
    ['Company', data.company],
    ['Interest', data.interest],
  ];
  const message = data.message || '';
  return wrapInternal('NEW CONTACT INQUIRY', '#00f5d4', `
    ${buildTable('Contact', rows)}
    <div style="margin:20px 0 0;padding:18px 20px;background:#f5f5f0;border-left:4px solid #00f5d4;">
      <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#0a0a0a;font-weight:900;margin-bottom:8px;">Message</div>
      <div style="font-size:14px;line-height:1.6;color:#0a0a0a;white-space:pre-wrap;">${escapeHtml(message)}</div>
    </div>
  `);
}

function buildTable(title, rows) {
  const body = rows.filter(r => r[1]).map(r => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #e2e0db;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#777;font-weight:600;width:130px;vertical-align:top;">${escapeHtml(r[0])}</td>
      <td style="padding:8px 0;border-bottom:1px solid #e2e0db;font-size:14px;color:#0a0a0a;font-weight:500;">${escapeHtml(r[1])}</td>
    </tr>`).join('');
  return `
    <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#0a0a0a;font-weight:900;margin:22px 0 10px;">${escapeHtml(title)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${body}</table>
  `;
}

function wrapInternal(headline, accent, innerHtml) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f5f0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#0a0a0a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;background:#ffffff;border:1.5px solid #0a0a0a;">
        <tr><td style="background:${accent};padding:10px 26px;">
          <div style="font-size:9px;letter-spacing:3.5px;text-transform:uppercase;color:#0a0a0a;font-weight:900;">BERMO.COLLECTIVE &bull; Inbox</div>
        </td></tr>
        <tr><td style="padding:32px 36px 36px;">
          <h1 style="font-size:26px;line-height:1;letter-spacing:-0.02em;margin:0 0 8px;text-transform:uppercase;font-weight:900;color:#0a0a0a;">${escapeHtml(headline)}</h1>
          <div style="height:6px;width:52px;background:${accent};margin:14px 0 22px;"></div>
          ${innerHtml}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
