const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const RESEND_KEY = 're_NdQSmbr8_DLAEADNqhzyWTUYrfamsqzHz';
  const SUPABASE_URL = 'https://jmksxvvbgxqcijrbdwos.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impta3N4dnZiZ3hxY2lqcmJkd29zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MjEzMzIsImV4cCI6MjA5MTQ5NzMzMn0.Lu6zdmKHX5lOwHWKC9C2qJEqf6qGM28ItMsstBoV5AI';
  const SHOP_ID = 'aurora-auto-repair';
  const FROM = 'Aurora Auto Repair <onboarding@resend.dev>';

  const db = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Get tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Get 6 months ago date for service reminders
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0];

  let sent = 0;
  let errors = [];

  try {
    // ── 24HR APPOINTMENT REMINDERS ──
    const { data: appts } = await db.from('appointments')
      .select('*')
      .eq('shop_id', SHOP_ID)
      .eq('booking_date', tomorrowStr)
      .eq('status', 'scheduled');

    for (const appt of (appts || [])) {
      if (!appt.customer_email) continue;

      const hour = parseInt(appt.start_time?.split(':')[0]);
      const min = appt.start_time?.split(':')[1] || '00';
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      const timeStr = `${displayHour}:${min} ${ampm}`;

      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM,
            to: [appt.customer_email],
            subject: `Reminder: Your appointment is tomorrow at ${timeStr} — Aurora Auto Repair`,
            html: `
              <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
                <div style="background:#c0392b;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
                  <h2 style="color:#fff;font-size:22px;font-weight:500;margin-bottom:8px">See you tomorrow!</h2>
                  <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0">Just a friendly reminder about your appointment.</p>
                </div>
                <table style="width:100%;font-size:14px;border-collapse:collapse">
                  <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;width:140px">Date</td><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:500">Tomorrow, ${tomorrowStr}</td></tr>
                  <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Time</td><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:500">${timeStr}</td></tr>
                  <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Service</td><td style="padding:10px 0;border-bottom:1px solid #eee">${appt.service || '—'}</td></tr>
                  <tr><td style="padding:10px 0;color:#888">Name</td><td style="padding:10px 0">${appt.customer_name || '—'}</td></tr>
                </table>
                <div style="margin-top:20px;padding:16px;background:#f7f7f5;border-radius:8px;font-size:13px;color:#555">
                  Need to reschedule? Call us at <strong>(206) 367-8833</strong><br>
                  10712 Aurora Ave N, Seattle WA 98133
                </div>
              </div>`
          })
        });
        sent++;
      } catch (e) { errors.push('appt ' + appt.id + ': ' + e.message); }
    }

    // ── 6 MONTH SERVICE REMINDERS ──
    // Find bookings created ~6 months ago with an email that haven't been reminded recently
    const { data: oldBookings } = await db.from('bookings')
      .select('*')
      .eq('shop_id', SHOP_ID)
      .not('email', 'is', null)
      .lte('created_at', sixMonthsAgoStr)
      .ilike('service', '%oil%'); // Only for oil changes

    // Deduplicate by email — only send one reminder per customer
    const seen = new Set();
    for (const booking of (oldBookings || [])) {
      if (!booking.email || seen.has(booking.email)) continue;
      seen.add(booking.email);

      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM,
            to: [booking.email],
            subject: `Time for your next oil change — Aurora Auto Repair`,
            html: `
              <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
                <h2 style="font-size:20px;font-weight:500;margin-bottom:8px">Hi ${(booking.name||'').split(' ')[0] || 'there'}!</h2>
                <p style="color:#555;font-size:14px;line-height:1.6;margin-bottom:20px">
                  It's been about 6 months since your last oil change${booking.vehicle ? ' on your <strong>' + booking.vehicle + '</strong>' : ''}. 
                  Most manufacturers recommend changing your oil every 5,000–7,500 miles or 6 months — whichever comes first.
                </p>
                <p style="color:#555;font-size:14px;line-height:1.6;margin-bottom:24px">
                  Book your next service online or give us a call — we'll get you in fast.
                </p>
                <a href="https://inspiring-cucurucho-a06180.netlify.app/#tools" 
                   style="display:inline-block;background:#c0392b;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500">
                  Book now
                </a>
                <div style="margin-top:24px;padding:16px;background:#f7f7f5;border-radius:8px;font-size:13px;color:#555">
                  <strong>Aurora Auto Repair</strong><br>
                  10712 Aurora Ave N, Seattle WA 98133<br>
                  <a href="tel:2063678833" style="color:#111">(206) 367-8833</a>
                </div>
                <p style="margin-top:16px;font-size:11px;color:#bbb">You're receiving this because you previously booked a service with us. Reply to unsubscribe.</p>
              </div>`
          })
        });
        sent++;
      } catch (e) { errors.push('reminder ' + booking.email + ': ' + e.message); }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ sent, errors, tomorrow: tomorrowStr, sixMonthsAgo: sixMonthsAgoStr })
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
