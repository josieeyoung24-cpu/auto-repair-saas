exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const RESEND_KEY = 're_NdQSmbr8_DLAEADNqhzyWTUYrfamsqzHz';
  const SHOP_EMAIL = 'josieeyoung24@gmail.com';
  const NEIL_EMAILS = ['josieeyoung24@gmail.com']; // Add Neil's emails here e.g. ['neil@auroraautoseattle.com', 'josieeyoung24@gmail.com']
  const FROM = 'Aurora Auto Repair <onboarding@resend.dev>';

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: 'Invalid JSON' }; }

  const { type, customerName, customerEmail, customerPhone, vehicle, service, date, eta, notes, priceLow, priceHigh } = body;

  try {
    if (type === 'booking') {
      // Email to Neil
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM,
          to: NEIL_EMAILS,
          subject: `New booking — ${customerName}`,
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
              <h2 style="font-size:20px;font-weight:600;margin-bottom:4px">New appointment request</h2>
              <p style="color:#888;font-size:14px;margin-bottom:24px">Aurora Auto Repair</p>
              <table style="width:100%;font-size:14px;border-collapse:collapse">
                <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;width:140px">Customer</td><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:500">${customerName}</td></tr>
                <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Phone</td><td style="padding:10px 0;border-bottom:1px solid #eee"><a href="tel:${customerPhone}" style="color:#111">${customerPhone}</a></td></tr>
                <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Vehicle</td><td style="padding:10px 0;border-bottom:1px solid #eee">${vehicle || 'Not specified'}</td></tr>
                <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Service</td><td style="padding:10px 0;border-bottom:1px solid #eee">${service}</td></tr>
                <tr><td style="padding:10px 0;color:#888">Requested date</td><td style="padding:10px 0">${date || 'Flexible'}</td></tr>
              </table>
              ${notes ? `<div style="margin-top:16px;padding:14px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:13px;color:#555"><strong style="color:#333">Customer notes:</strong><br>${notes}</div>` : ''}
              <div style="margin-top:24px;padding:16px;background:#f7f7f5;border-radius:8px;font-size:13px;color:#888">
                Log into your admin panel to confirm or update this booking.
              </div>
            </div>`
        })
      });

      // Confirmation email to customer (only if they provided an email)
      if (customerEmail) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM,
            to: [customerEmail],
            subject: `Your appointment request — Aurora Auto Repair`,
            html: `
              <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
                <h2 style="font-size:20px;font-weight:600;margin-bottom:4px">We got your request, ${customerName.split(' ')[0]}!</h2>
                <p style="color:#888;font-size:14px;margin-bottom:24px">Aurora Auto Repair will confirm your appointment shortly.</p>
                <table style="width:100%;font-size:14px;border-collapse:collapse">
                  <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;width:140px">Vehicle</td><td style="padding:10px 0;border-bottom:1px solid #eee">${vehicle || 'Not specified'}</td></tr>
                  <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Service</td><td style="padding:10px 0;border-bottom:1px solid #eee">${service}</td></tr>
                  <tr><td style="padding:10px 0;color:#888">Requested date</td><td style="padding:10px 0">${date || 'Flexible'}</td></tr>
                </table>
                <div style="margin-top:24px;padding:16px;background:#f7f7f5;border-radius:8px;font-size:13px;color:#555">
                  Questions? Call us at <strong>(206) 367-8833</strong><br>
                  10712 Aurora Ave N, Seattle WA 98133
                </div>
              </div>`
          })
        });
      }
    }

    if (type === 'quote') {
      // Email to shop
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM,
          to: NEIL_EMAILS,
          subject: `New quote request — ${customerName}`,
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
              <h2 style="font-size:20px;font-weight:600;margin-bottom:4px">New quote request</h2>
              <p style="color:#888;font-size:14px;margin-bottom:24px">Aurora Auto Repair</p>
              <table style="width:100%;font-size:14px;border-collapse:collapse">
                <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;width:140px">Customer</td><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:500">${customerName}</td></tr>
                <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Phone</td><td style="padding:10px 0;border-bottom:1px solid #eee"><a href="tel:${customerPhone}" style="color:#111">${customerPhone}</a></td></tr>
                ${customerEmail ? `<tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Email</td><td style="padding:10px 0;border-bottom:1px solid #eee">${customerEmail}</td></tr>` : ''}
                <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Vehicle</td><td style="padding:10px 0;border-bottom:1px solid #eee">${vehicle}</td></tr>
                <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Service</td><td style="padding:10px 0;border-bottom:1px solid #eee">${service}</td></tr>
                <tr><td style="padding:10px 0;color:#888">Estimate shown</td><td style="padding:10px 0;font-weight:500">$${priceLow} – $${priceHigh}</td></tr>
              </table>
              <div style="margin-top:24px;padding:16px;background:#f7f7f5;border-radius:8px;font-size:13px;color:#888">
                Log into your admin panel to confirm or adjust the price.
              </div>
            </div>`
        })
      });

      // Confirmation email to customer
      if (customerEmail) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM,
            to: [customerEmail],
            subject: `Your quote request — Aurora Auto Repair`,
            html: `
              <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
                <h2 style="font-size:20px;font-weight:600;margin-bottom:4px">We got your quote request, ${customerName.split(' ')[0]}!</h2>
                <p style="color:#888;font-size:14px;margin-bottom:24px">We'll review your request and get back to you shortly with a confirmed price.</p>
                <table style="width:100%;font-size:14px;border-collapse:collapse">
                  <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;width:140px">Vehicle</td><td style="padding:10px 0;border-bottom:1px solid #eee">${vehicle}</td></tr>
                  <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Service</td><td style="padding:10px 0;border-bottom:1px solid #eee">${service}</td></tr>
                  <tr><td style="padding:10px 0;color:#888">Estimate range</td><td style="padding:10px 0;font-weight:500">$${priceLow} – $${priceHigh}</td></tr>
                </table>
                <div style="margin-top:24px;padding:16px;background:#f7f7f5;border-radius:8px;font-size:13px;color:#555">
                  Questions? Call us at <strong>(206) 367-8833</strong><br>
                  10712 Aurora Ave N, Seattle WA 98133
                </div>
              </div>`
          })
        });
      }
    }

    if (type === 'quote-declined') {
      if (!customerEmail) return { statusCode: 200, body: JSON.stringify({ ok: true }) };
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM,
          to: [customerEmail],
          subject: `Regarding your quote — Aurora Auto Repair`,
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
              <h2 style="font-size:20px;font-weight:600;margin-bottom:4px">Hi ${customerName.split(' ')[0]},</h2>
              <p style="color:#555;font-size:14px;margin-bottom:24px;line-height:1.6">Thank you for reaching out about your <strong>${service}</strong> on your <strong>${vehicle}</strong>. Unfortunately we're unable to provide a quote for this service at this time.</p>
              <p style="color:#555;font-size:14px;line-height:1.6">Please give us a call and we'd be happy to discuss your options.</p>
              <div style="margin-top:24px;padding:16px;background:#f7f7f5;border-radius:8px;font-size:13px;color:#555">
                <strong>Aurora Auto Repair</strong><br>
                10712 Aurora Ave N, Seattle WA 98133<br>
                <a href="tel:2063678833" style="color:#111">(206) 367-8833</a>
              </div>
            </div>`
        })
      });
    }

    if (type === 'quote-confirmed') {
      if (!customerEmail) return { statusCode: 200, body: JSON.stringify({ ok: true }) };
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM,
          to: [customerEmail],
          subject: `Your quote is ready — Aurora Auto Repair`,
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
              <div style="background:#111;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
                <h2 style="color:#fff;font-size:22px;font-weight:500;margin-bottom:8px">Your quote is ready, ${customerName.split(' ')[0]}!</h2>
                <p style="color:rgba(255,255,255,0.75);font-size:14px;margin:0">Here's the confirmed price for your service.</p>
              </div>
              <table style="width:100%;font-size:14px;border-collapse:collapse">
                <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;width:140px">Vehicle</td><td style="padding:10px 0;border-bottom:1px solid #eee">${vehicle}</td></tr>
                <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Service</td><td style="padding:10px 0;border-bottom:1px solid #eee">${service}</td></tr>
                <tr><td style="padding:10px 0;color:#888">Confirmed price</td><td style="padding:10px 0;font-size:18px;font-weight:600">$${priceLow}${priceHigh && priceHigh !== priceLow ? ' – $' + priceHigh : ''}</td></tr>
              </table>
              <div style="margin-top:24px;padding:16px;background:#f0faf4;border:1px solid #b8e8c8;border-radius:8px;font-size:13px;color:#1a6b3a;font-weight:500">
                Ready to book? Call us or visit our website to schedule your appointment.
              </div>
              <div style="margin-top:16px;padding:16px;background:#f7f7f5;border-radius:8px;font-size:13px;color:#555">
                <strong>Aurora Auto Repair</strong><br>
                10712 Aurora Ave N, Seattle WA 98133<br>
                <a href="tel:2063678833" style="color:#111">(206) 367-8833</a>
              </div>
            </div>`
        })
      });
    }

    if (type === 'confirmed') {
      if (!customerEmail) return { statusCode: 200, body: JSON.stringify({ ok: true }) };
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM,
          to: [customerEmail],
          subject: `Your appointment is confirmed — Aurora Auto Repair`,
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
              <div style="background:#111;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
                <h2 style="color:#fff;font-size:22px;font-weight:500;margin-bottom:8px">Appointment confirmed!</h2>
                <p style="color:rgba(255,255,255,0.75);font-size:14px;margin:0">See you soon, ${customerName.split(' ')[0]}.</p>
              </div>
              <table style="width:100%;font-size:14px;border-collapse:collapse">
                <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;width:140px">Vehicle</td><td style="padding:10px 0;border-bottom:1px solid #eee">${vehicle || 'Your vehicle'}</td></tr>
                <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Service</td><td style="padding:10px 0;border-bottom:1px solid #eee">${service || 'Service'}</td></tr>
                ${date ? `<tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Date</td><td style="padding:10px 0;border-bottom:1px solid #eee">${date}</td></tr>` : ''}
              </table>
              <div style="margin-top:24px;padding:16px;background:#f7f7f5;border-radius:8px;font-size:13px;color:#555">
                Questions? Call us at <strong>(206) 367-8833</strong><br>
                10712 Aurora Ave N, Seattle WA 98133
              </div>
            </div>`
        })
      });
    }

    if (type === 'ready') {
      if (!customerEmail) return { statusCode: 200, body: JSON.stringify({ ok: true }) };
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM,
          to: [customerEmail],
          subject: `Your car is ready for pickup — Aurora Auto Repair`,
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
              <div style="background:#16a34a;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
                <h2 style="color:#fff;font-size:22px;font-weight:600;margin-bottom:8px">Your car is ready!</h2>
                <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0">Head over whenever you're ready — we're open and waiting.</p>
              </div>
              <table style="width:100%;font-size:14px;border-collapse:collapse">
                <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;width:140px">Vehicle</td><td style="padding:10px 0;border-bottom:1px solid #eee">${vehicle || 'Your vehicle'}</td></tr>
                <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Service</td><td style="padding:10px 0;border-bottom:1px solid #eee">${service || 'Service complete'}</td></tr>
                ${eta ? `<tr><td style="padding:10px 0;color:#888">Ready since</td><td style="padding:10px 0">${eta}</td></tr>` : ''}
              </table>
              <div style="margin-top:24px;padding:16px;background:#f7f7f5;border-radius:8px;font-size:13px;color:#555">
                <strong>Aurora Auto Repair</strong><br>
                10712 Aurora Ave N, Seattle WA 98133<br>
                <a href="tel:2063678833" style="color:#111">(206) 367-8833</a>
              </div>
            </div>`
        })
      });
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
