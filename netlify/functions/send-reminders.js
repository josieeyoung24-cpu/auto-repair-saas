exports.handler = async (event) => {
  const RESEND_KEY = 're_NdQSmbr8_DLAEADNqhzyWTUYrfamsqzHz';
  const SUPABASE_URL = 'https://jmksxvvbgxqcijrbdwos.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impta3N4dnZiZ3hxY2lqcmJkd29zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MjEzMzIsImV4cCI6MjA5MTQ5NzMzMn0.Lu6zdmKHX5lOwHWKC9C2qJEqf6qGM28ItMsstBoV5AI';
  const SHOP_ID = 'aurora-auto-repair';
  const FROM = 'Aurora Auto Repair <onboarding@resend.dev>';

  const dbHeaders = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0];

  let sent = 0;
  let errors = [];

  async function sendEmail(to, subject, html) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [to], subject, html })
    });
    return res.ok;
  }

  try {
    // 24HR APPOINTMENT REMINDERS
    const apptRes = await fetch(
      `${SUPABASE_URL}/rest/v1/appointments?shop_id=eq.${SHOP_ID}&booking_date=eq.${tomorrowStr}&status=eq.scheduled&select=*`,
      { headers: dbHeaders }
    );
    const appts = await apptRes.json();

    for (const a of (appts || [])) {
      if (!a.customer_email) continue;
      const [h, m] = (a.start_time || '09:00').split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const timeStr = `${h % 12 || 12}:${String(m).padStart(2,'0')} ${ampm}`;
      try {
        const ok = await sendEmail(
          a.customer_email,
          `Reminder: Your appointment is tomorrow at ${timeStr} — Aurora Auto Repair`,
          `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
            <div style="background:#c0392b;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
              <h2 style="color:#fff;font-size:22px;font-weight:500;margin-bottom:8px">See you tomorrow!</h2>
              <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0">Just a friendly reminder about your appointment.</p>
            </div>
            <table style="width:100%;font-size:14px;border-collapse:collapse">
              <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;width:140px">Date</td><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:500">Tomorrow, ${tomorrowStr}</td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Time</td><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:500">${timeStr}</td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Service</td><td style="padding:10px 0;border-bottom:1px solid #eee">${a.service || '—'}</td></tr>
              <tr><td style="padding:10px 0;color:#888">Name</td><td style="padding:10px 0">${a.customer_name || '—'}</td></tr>
            </table>
            <div style="margin-top:20px;padding:16px;background:#f7f7f5;border-radius:8px;font-size:13px;color:#555">
              Need to reschedule? Call us at <strong>(206) 367-8833</strong><br>10712 Aurora Ave N, Seattle WA 98133
            </div>
          </div>`
        );
        if (ok) sent++;
      } catch(e) { errors.push('appt:' + a.id + ':' + e.message); }
    }

    // 6 MONTH OIL CHANGE REMINDERS
    const bookRes = await fetch(
      `${SUPABASE_URL}/rest/v1/bookings?shop_id=eq.${SHOP_ID}&email=not.is.null&created_at=lte.${sixMonthsAgoStr}&service=ilike.*oil*&select=*&order=created_at.desc`,
      { headers: dbHeaders }
    );
    const bookings = await bookRes.json();

    const seen = new Set();
    for (const b of (bookings || [])) {
      if (!b.email || seen.has(b.email)) continue;
      seen.add(b.email);
      const firstName = (b.name || '').split(' ')[0] || 'there';
      try {
        const ok = await sendEmail(
          b.email,
          `Time for your next oil change — Aurora Auto Repair`,
          `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
            <h2 style="font-size:20px;font-weight:500;margin-bottom:8px">Hi ${firstName}!</h2>
            <p style="color:#555;font-size:14px;line-height:1.6;margin-bottom:20px">
              It's been about 6 months since your last oil change${b.vehicle ? ' on your <strong>' + b.vehicle + '</strong>' : ''}.
              Most manufacturers recommend an oil change every 5,000–7,500 miles or 6 months.
            </p>
            <a href="https://fantastic-khapse-f994d2.netlify.app/#tools"
               style="display:inline-block;background:#c0392b;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500">Book now</a>
            <div style="margin-top:24px;padding:16px;background:#f7f7f5;border-radius:8px;font-size:13px;color:#555">
              <strong>Aurora Auto Repair</strong><br>10712 Aurora Ave N, Seattle WA 98133<br>
              <a href="tel:2063678833" style="color:#111">(206) 367-8833</a>
            </div>
            <p style="margin-top:16px;font-size:11px;color:#bbb">You booked a service with us previously. Reply to unsubscribe.</p>
          </div>`
        );
        if (ok) sent++;
      } catch(e) { errors.push('reminder:' + b.email + ':' + e.message); }
    }

    return { statusCode: 200, body: JSON.stringify({ sent, errors, tomorrowStr, sixMonthsAgoStr }) };
  } catch(err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
