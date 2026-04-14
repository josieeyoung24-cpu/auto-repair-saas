export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const RESEND_KEY = 're_NdQSmbr8_DLAEADNqhzyWTUYrfamsqzHz';
  const NEIL_EMAILS = ['josieeyoung24@gmail.com'];
  const FROM = 'Aurora Auto Repair <onboarding@resend.dev>';

  const { type, customerName, customerEmail, customerPhone, vehicle, service, date, eta, notes, priceLow, priceHigh } = req.body;

  async function sendEmail(to, subject, html) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: Array.isArray(to) ? to : [to], subject, html })
    });
    return r.ok;
  }

  try {
    if (type === 'booking') {
      await sendEmail(NEIL_EMAILS, `New booking — ${customerName}`, `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
          <h2 style="font-size:20px;font-weight:600;margin-bottom:4px">New appointment request</h2>
          <p style="color:#888;font-size:14px;margin-bottom:24px">Aurora Auto Repair</p>
          <table style="width:100%;font-size:14px;border-collapse:collapse">
            <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;width:140px">Customer</td><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:500">${customerName}</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Phone</td><td style="padding:10px 0;border-bottom:1px solid #eee">${customerPhone}</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Vehicle</td><td style="padding:10px 0;border-bottom:1px solid #eee">${vehicle||'Not specified'}</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Service</td><td style="padding:10px 0;border-bottom:1px solid #eee">${service}</td></tr>
            <tr><td style="padding:10px 0;color:#888">Date</td><td style="padding:10px 0">${date||'Flexible'}</td></tr>
          </table>
          ${notes?`<div style="margin-top:16px;padding:14px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:13px;color:#555"><strong>Notes:</strong> ${notes}</div>`:''}
        </div>`);
      if (customerEmail) await sendEmail(customerEmail, `Your appointment request — Aurora Auto Repair`, `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
          <h2 style="font-size:20px;font-weight:600;margin-bottom:4px">We got your request, ${customerName.split(' ')[0]}!</h2>
          <p style="color:#888;font-size:14px;margin-bottom:24px">We'll confirm your appointment shortly.</p>
          <table style="width:100%;font-size:14px;border-collapse:collapse">
            <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;width:140px">Vehicle</td><td style="padding:10px 0;border-bottom:1px solid #eee">${vehicle||'Not specified'}</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Service</td><td style="padding:10px 0;border-bottom:1px solid #eee">${service}</td></tr>
            <tr><td style="padding:10px 0;color:#888">Date</td><td style="padding:10px 0">${date||'Flexible'}</td></tr>
          </table>
          <div style="margin-top:24px;padding:16px;background:#f7f7f5;border-radius:8px;font-size:13px;color:#555">Questions? Call us at <strong>(206) 367-8833</strong></div>
        </div>`);
    }

    if (type === 'confirmed') {
      if (!customerEmail) return res.status(200).json({ ok: true });
      await sendEmail(customerEmail, `Your appointment is confirmed — Aurora Auto Repair`, `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
          <div style="background:#111;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
            <h2 style="color:#fff;font-size:22px;font-weight:500;margin-bottom:8px">Appointment confirmed!</h2>
            <p style="color:rgba(255,255,255,0.75);font-size:14px;margin:0">See you soon, ${customerName.split(' ')[0]}.</p>
          </div>
          <table style="width:100%;font-size:14px;border-collapse:collapse">
            <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;width:140px">Vehicle</td><td style="padding:10px 0;border-bottom:1px solid #eee">${vehicle||'Your vehicle'}</td></tr>
            <tr><td style="padding:10px 0;color:#888">Service</td><td style="padding:10px 0">${service}</td></tr>
          </table>
          <div style="margin-top:24px;padding:16px;background:#f7f7f5;border-radius:8px;font-size:13px;color:#555">Questions? Call us at <strong>(206) 367-8833</strong><br>10712 Aurora Ave N, Seattle WA 98133</div>
        </div>`);
    }

    if (type === 'ready') {
      if (!customerEmail) return res.status(200).json({ ok: true });
      await sendEmail(customerEmail, `Your car is ready for pickup — Aurora Auto Repair`, `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
          <div style="background:#16a34a;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
            <h2 style="color:#fff;font-size:22px;font-weight:600;margin-bottom:8px">Your car is ready!</h2>
            <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0">Head over whenever you're ready.</p>
          </div>
          <table style="width:100%;font-size:14px;border-collapse:collapse">
            <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;width:140px">Vehicle</td><td style="padding:10px 0;border-bottom:1px solid #eee">${vehicle||'Your vehicle'}</td></tr>
            <tr><td style="padding:10px 0;color:#888">Service</td><td style="padding:10px 0">${service}</td></tr>
            ${eta?`<tr><td style="padding:10px 0;color:#888">Ready since</td><td style="padding:10px 0">${eta}</td></tr>`:''}
          </table>
          <div style="margin-top:24px;padding:16px;background:#f7f7f5;border-radius:8px;font-size:13px;color:#555"><strong>Aurora Auto Repair</strong><br>10712 Aurora Ave N, Seattle WA 98133<br>(206) 367-8833</div>
        </div>`);
    }

    if (type === 'quote') {
      await sendEmail(NEIL_EMAILS, `New quote request — ${customerName}`, `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
          <h2 style="font-size:20px;font-weight:600;margin-bottom:4px">New quote request</h2>
          <table style="width:100%;font-size:14px;border-collapse:collapse">
            <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;width:140px">Customer</td><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:500">${customerName}</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Phone</td><td style="padding:10px 0;border-bottom:1px solid #eee">${customerPhone}</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Vehicle</td><td style="padding:10px 0;border-bottom:1px solid #eee">${vehicle}</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Service</td><td style="padding:10px 0;border-bottom:1px solid #eee">${service}</td></tr>
            <tr><td style="padding:10px 0;color:#888">Estimate shown</td><td style="padding:10px 0;font-weight:500">$${priceLow} – $${priceHigh}</td></tr>
          </table>
        </div>`);
      if (customerEmail) await sendEmail(customerEmail, `Your quote request — Aurora Auto Repair`, `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
          <h2 style="font-size:20px;font-weight:600;margin-bottom:4px">We got your quote request!</h2>
          <p style="color:#888;font-size:14px;margin-bottom:24px">We'll review and get back to you with a confirmed price shortly.</p>
          <table style="width:100%;font-size:14px;border-collapse:collapse">
            <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;width:140px">Vehicle</td><td style="padding:10px 0;border-bottom:1px solid #eee">${vehicle}</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Service</td><td style="padding:10px 0;border-bottom:1px solid #eee">${service}</td></tr>
            <tr><td style="padding:10px 0;color:#888">Estimate range</td><td style="padding:10px 0;font-weight:500">$${priceLow} – $${priceHigh}</td></tr>
          </table>
          <div style="margin-top:24px;padding:16px;background:#f7f7f5;border-radius:8px;font-size:13px;color:#555">Questions? Call <strong>(206) 367-8833</strong></div>
        </div>`);
    }

    if (type === 'quote-confirmed') {
      if (!customerEmail) return res.status(200).json({ ok: true });
      await sendEmail(customerEmail, `Your quote is ready — Aurora Auto Repair`, `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
          <div style="background:#111;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
            <h2 style="color:#fff;font-size:22px;font-weight:500;margin-bottom:8px">Your quote is ready!</h2>
          </div>
          <table style="width:100%;font-size:14px;border-collapse:collapse">
            <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;width:140px">Vehicle</td><td style="padding:10px 0;border-bottom:1px solid #eee">${vehicle}</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Service</td><td style="padding:10px 0;border-bottom:1px solid #eee">${service}</td></tr>
            <tr><td style="padding:10px 0;color:#888">Confirmed price</td><td style="padding:10px 0;font-size:18px;font-weight:600">$${priceLow}${priceHigh&&priceHigh!==priceLow?' – $'+priceHigh:''}</td></tr>
          </table>
          <div style="margin-top:24px;padding:16px;background:#f0faf4;border:1px solid #b8e8c8;border-radius:8px;font-size:13px;color:#1a6b3a;font-weight:500">Ready to book? Call us or visit our website.</div>
          <div style="margin-top:16px;padding:16px;background:#f7f7f5;border-radius:8px;font-size:13px;color:#555"><strong>Aurora Auto Repair</strong><br>10712 Aurora Ave N, Seattle WA 98133<br>(206) 367-8833</div>
        </div>`);
    }

    if (type === 'quote-declined') {
      if (!customerEmail) return res.status(200).json({ ok: true });
      await sendEmail(customerEmail, `Regarding your quote — Aurora Auto Repair`, `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
          <h2 style="font-size:20px;font-weight:600;margin-bottom:8px">Hi ${customerName.split(' ')[0]},</h2>
          <p style="color:#555;font-size:14px;line-height:1.6;margin-bottom:16px">Thank you for reaching out about your <strong>${service}</strong> on your <strong>${vehicle}</strong>. Unfortunately we're unable to provide a quote for this service at this time.</p>
          <p style="color:#555;font-size:14px;line-height:1.6">Please give us a call and we'd be happy to discuss your options.</p>
          <div style="margin-top:24px;padding:16px;background:#f7f7f5;border-radius:8px;font-size:13px;color:#555"><strong>Aurora Auto Repair</strong><br>10712 Aurora Ave N, Seattle WA 98133<br>(206) 367-8833</div>
        </div>`);
    }

    return res.status(200).json({ ok: true });
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
