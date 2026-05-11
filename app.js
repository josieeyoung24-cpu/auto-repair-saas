const SUPABASE_URL = 'https://jmksxvvbgxqcijrbdwos.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impta3N4dnZiZ3hxY2lqcmJkd29zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MjEzMzIsImV4cCI6MjA5MTQ5NzMzMn0.Lu6zdmKHX5lOwHWKC9C2qJEqf6qGM28ItMsstBoV5AI';
  const SHOP_ID = 'red-rock-auto';
  const { createClient } = supabase;
  const db = createClient(SUPABASE_URL, SUPABASE_KEY);

  function openTab(name) {
    document.querySelectorAll('.tab-btn').forEach((btn, i) => {
      btn.classList.toggle('active', ['book','status','quote'][i] === name);
    });
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-' + name).classList.add('active');
    document.getElementById('tools').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function submitBooking() {
    const first = document.getElementById('b-first').value.trim();
    const last = document.getElementById('b-last').value.trim();
    const phone = document.getElementById('b-phone').value.trim();
    const email = document.getElementById('b-email').value.trim();
    const vtype = document.getElementById('b-vtype').value;
    const vmake = document.getElementById('b-vmake').value;
    const vyear = document.getElementById('b-vyear').value;
    const vehicle = [vyear, vmake, vtype].filter(Boolean).join(' ') || '';
    const checkedServices = getSelectedServices();
    const service = checkedServices.map(cb => cb.value).join(', ');
    const date = document.getElementById('b-date').value;
    const timeVal = document.getElementById('b-time').value;
    const notes = document.getElementById('b-notes').value.trim();
    if (!first || !phone || checkedServices.length === 0) { alert('Please fill in your name, phone, and select at least one service.'); return; }
    if (!date && timeVal !== 'call-to-confirm') { alert('Please select a date and time slot.'); return; }
    if (!timeVal) { alert('Please select a time slot.'); return; }
    const isCallToConfirm = timeVal === 'call-to-confirm';
    const [startTime, endTime] = isCallToConfirm ? ['', ''] : timeVal.split('|');
    const btn = document.getElementById('book-btn');
    btn.textContent = 'Submitting...'; btn.disabled = true;

    // Save booking
    const { error } = await db.from('bookings').insert([{
      name: first + ' ' + last, phone, email, vehicle, service, date,
      notes, shop_id: SHOP_ID
    }]);
    if (error) {
      btn.textContent = 'Confirm appointment'; btn.disabled = false;
      document.getElementById('book-error').classList.add('show');
      return;
    }

    // Block the time slot immediately (skip if call-to-confirm)
    if (!isCallToConfirm) {
      await db.from('appointments').insert([{
        booking_date: date, start_time: startTime, end_time: endTime,
        service, customer_name: first + ' ' + last, shop_id: SHOP_ID, status: 'pending'
      }]);
    }

    fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'booking', customerName: first + ' ' + last, customerEmail: email, customerPhone: phone, vehicle, service, date: date + ' at ' + formatTime(startTime), notes })
    });

    document.getElementById('book-form-wrap').style.display = 'none';
    const details = document.getElementById('book-success-details');
    details.innerHTML =
      (vehicle ? '<div><span style="opacity:.7">Vehicle</span>&nbsp;&nbsp;' + vehicle + '</div>' : '') +
      '<div><span style="opacity:.7">Service</span>&nbsp;&nbsp;' + service + '</div>' +
      '<div><span style="opacity:.7">Date</span>&nbsp;&nbsp;' + (isCallToConfirm ? 'We will call to schedule' : date + ' at ' + formatTime(startTime)) + '</div>' +
      '<div><span style="opacity:.7">Phone</span>&nbsp;&nbsp;' + phone + '</div>' +
      (email ? '<div><span style="opacity:.7">Email</span>&nbsp;&nbsp;' + email + '</div>' : '') +
      (notes ? '<div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.2)"><span style="opacity:.7">Notes</span>&nbsp;&nbsp;' + notes + '</div>' : '');
    document.getElementById('book-success-screen').style.display = 'block';
    btn.textContent = 'Confirm appointment'; btn.disabled = false;
  }

  function resetBookingForm() {
    ['b-first','b-last','b-phone','b-email','b-notes'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('b-vtype').value = '';
    document.getElementById('b-vmake').innerHTML = '<option value="">Make</option>';
    document.getElementById('b-vmake').disabled = true;
    document.getElementById('b-vyear').innerHTML = '<option value="">Year</option>';
    document.getElementById('b-vyear').disabled = true;
    document.querySelectorAll('#svc-checkboxes input').forEach(cb => cb.checked = false);
    document.getElementById('b-date').value = '';
    document.getElementById('b-time').value = '';
    document.getElementById('slot-picker').style.display = 'none';
    document.getElementById('slots-wrap').style.display = 'none';
    document.getElementById('book-form-wrap').style.display = 'block';
    document.getElementById('book-success-screen').style.display = 'none';
  }

  // Set min date to tomorrow
  const d = new Date(); d.setDate(d.getDate() + 1);
  const minDate = d.toISOString().split('T')[0];
  document.getElementById('b-date').min = minDate;

  async function lookupStatus() {
    const val = document.getElementById('status-input').value.trim();
    if (!val) { alert('Enter your name to look up your repair.'); return; }
    const card = document.getElementById('status-card');
    const notFound = document.getElementById('status-not-found');
    card.classList.remove('show'); notFound.classList.remove('show');
    const { data, error } = await db.from('tickets').select('*')
      .eq('shop_id', SHOP_ID).ilike('customer_name', '%' + val + '%')
      .order('created_at', { ascending: false }).limit(1);
    if (error || !data || data.length === 0) { notFound.classList.add('show'); return; }
    const t = data[0];
    const steps = { 'checked-in': 1, 'diagnosing': 2, 'in-repair': 3, 'ready': 4 };
    const cur = steps[t.status] || 1;
    const fills = [0, 0, 33, 66, 100];
    document.getElementById('s-vehicle').textContent = t.vehicle || 'Your vehicle';
    document.getElementById('s-sub').textContent = t.customer_name + ' · #AAR-' + t.id;
    document.getElementById('s-badge').textContent = (t.status || 'checked in').replace('-', ' ');
    document.getElementById('s-badge').className = 'status-badge' + (t.status === 'ready' ? ' ready' : '');
    document.getElementById('progress-fill').style.width = fills[cur] + '%';
    document.getElementById('s-note').innerHTML = '<strong>' + (t.service || 'Service in progress') + '</strong>' +
      (t.eta ? ' · Est. ready: ' + t.eta : '') + '. We\'ll call you when it\'s done.';

    // Show inspection photo if uploaded
    const photoEl = document.getElementById('s-photo');
    const photoImg = document.getElementById('s-photo-img');
    if (t.photo_url) {
      photoImg.src = t.photo_url;
      photoEl.style.display = 'block';
      const noteEl = document.getElementById('s-photo-note');
      if (noteEl) noteEl.textContent = t.photo_note ? '"' + t.photo_note + '"' : '';
    } else {
      photoEl.style.display = 'none';
    }

    ['1','2','3','4'].forEach(n => {
      const s = parseInt(n);
      const dot = document.getElementById('dot-' + n);
      const lbl = document.getElementById('lbl-' + n);
      dot.className = 'step-dot' + (s < cur ? ' done' : s === cur ? ' active' : '');
      dot.textContent = s < cur ? '✓' : n;
      lbl.className = 'step-label' + (s < cur ? ' done' : s === cur ? ' active' : '');
    });
    card.classList.add('show');
    document.getElementById('ready-banner').classList.toggle('show', t.status === 'ready');
    // Animate steps in and add wrench
    setTimeout(animateStepsIn, 150);
    setTimeout(addWraenchIfNeeded, 300);
  }

  document.getElementById('status-input').addEventListener('keydown', e => { if (e.key === 'Enter') lookupStatus(); });

  function onQuoteMakeChange() {
    const make = document.getElementById('q-make').value;
    const modelEl = document.getElementById('q-model');
    const yearEl = document.getElementById('q-year');
    modelEl.innerHTML = '<option value="">Select model</option>';
    yearEl.innerHTML = '<option value="">Select year</option>';
    yearEl.disabled = true;
    if (!make) { modelEl.disabled = true; return; }
    (VEHICLE_DATA[make] || ['Other']).forEach(m => {
      const o = document.createElement('option');
      o.value = m; o.textContent = m; modelEl.appendChild(o);
    });
    modelEl.disabled = false;
  }

  function onQuoteModelChange() {
    const model = document.getElementById('q-model').value;
    const yearEl = document.getElementById('q-year');
    yearEl.innerHTML = '<option value="">Select year</option>';
    if (!model) { yearEl.disabled = true; return; }
    for (let y = new Date().getFullYear() + 1; y >= 1950; y--) {
      const o = document.createElement('option');
      o.value = y; o.textContent = y; yearEl.appendChild(o);
    }
    yearEl.disabled = false;
  }

  function getQuote() {
    const make = document.getElementById('q-make').value;
    const model = document.getElementById('q-model').value;
    const year = document.getElementById('q-year').value;
    const svcEl = document.getElementById('q-service');
    const opt = svcEl.options[svcEl.selectedIndex];
    if (!make || !year || !opt.dataset.low) { alert('Please select a make, model, year, and service.'); return; }
    const vehicle = [year, make, model].filter(Boolean).join(' ');
    document.getElementById('quote-price').textContent = '$' + opt.dataset.low + ' – $' + opt.dataset.high;
    document.getElementById('quote-detail').textContent = opt.text + ' · ' + vehicle + ' · Parts + labor included';
    document.getElementById('quote-result').classList.add('show');
    document.getElementById('q-success').style.display = 'none';
    document.getElementById('q-error').style.display = 'none';
  }

  async function submitQuote() {
    const name = document.getElementById('q-name').value.trim();
    const phone = document.getElementById('q-phone').value.trim();
    const email = document.getElementById('q-email').value.trim();
    const make = document.getElementById('q-make').value;
    const model = document.getElementById('q-model').value;
    const year = document.getElementById('q-year').value;
    const notes = document.getElementById('q-notes').value.trim();
    const svcEl = document.getElementById('q-service');
    const opt = svcEl.options[svcEl.selectedIndex];
    if (!name || !phone || !email) { alert('Please enter your name, phone number, and email.'); return; }
    const vehicle = [year, make, model].filter(Boolean).join(' ');
    const btn = document.getElementById('q-submit-btn');
    btn.textContent = 'Sending...'; btn.disabled = true;
    const { error } = await db.from('quotes').insert([{
      name, phone, email,
      make: vehicle,
      year,
      service: opt.text,
      price_low: opt.dataset.low,
      price_high: opt.dataset.high,
      shop_id: SHOP_ID,
      status: 'pending'
    }]);
    fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'quote',
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        vehicle,
        service: opt.text,
        notes,
        priceLow: opt.dataset.low,
        priceHigh: opt.dataset.high
      })
    });
    btn.textContent = 'Send quote request'; btn.disabled = false;
    if (error) {
      document.getElementById('q-error').style.display = 'block';
    } else {
      document.getElementById('q-success').style.display = 'block';
      ['q-name','q-phone','q-email','q-notes'].forEach(id => document.getElementById(id).value = '');
    }
  }

  const DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const SERVICE_DURATION = { 'Oil change':60,'Brake service':120,'Tire rotation':45,'Engine diagnostic':90,'AC service':90,'Transmission service':120,'Other / not sure':60 };

  function getSelectedServices() {
    return [...document.querySelectorAll('#svc-checkboxes input:checked')];
  }

  function onServiceCheck() {
    const checked = getSelectedServices();
    const picker = document.getElementById('slot-picker');
    const otherOnly = checked.length > 0 && checked.every(cb => cb.value === 'Other / not sure');
    const hasOther = checked.some(cb => cb.value === 'Other / not sure');
    const hasKnown = checked.some(cb => cb.value !== 'Other / not sure');

    if (checked.length === 0) {
      picker.style.display = 'none';
      return;
    }

    // If ONLY "Other / not sure" is selected — no slot picker, just a call note
    if (otherOnly) {
      picker.style.display = 'block';
      document.getElementById('b-date').style.display = 'none';
      document.getElementById('slots-wrap').style.display = 'none';
      document.getElementById('b-time').value = 'call-to-confirm';
      let callNote = document.getElementById('other-call-note');
      if (!callNote) {
        callNote = document.createElement('div');
        callNote.id = 'other-call-note';
        callNote.style.cssText = 'background:#f7f7f5;border:1px solid #e8e8e4;border-radius:10px;padding:14px 16px;font-size:14px;color:#888880;margin-top:8px';
        callNote.textContent = 'Our team will call you to discuss the service and schedule a time that works. Just fill in your details below and submit.';
        picker.appendChild(callNote);
      }
      callNote.style.display = 'block';
      return;
    }

    // Otherwise show normal date/slot picker
    const callNote = document.getElementById('other-call-note');
    if (callNote) callNote.style.display = 'none';
    document.getElementById('b-date').style.display = '';
    picker.style.display = 'block';
    document.getElementById('slots-wrap').style.display = 'none';
    document.getElementById('b-date').value = '';
    document.getElementById('b-time').value = '';
  }

  // Keep onServiceChange as alias for compatibility
  function onServiceChange() { onServiceCheck(); }

  async function loadTimeSlots() {
    const dateVal = document.getElementById('b-date').value;
    const checked = getSelectedServices();
    if (!dateVal || checked.length === 0) return;

    const date = new Date(dateVal + 'T00:00:00');
    const dayName = DAYS[date.getDay()];
    // Total duration = sum of all selected services
    const duration = checked.reduce((sum, cb) => sum + (parseInt(cb.dataset.duration) || 60), 0);

    const slotsWrap = document.getElementById('slots-wrap');
    const slotsGrid = document.getElementById('slots-grid');
    const slotsEmpty = document.getElementById('slots-empty');
    slotsGrid.innerHTML = '<span style="font-size:13px;color:var(--muted)">Loading...</span>';
    slotsWrap.style.display = 'block';
    slotsEmpty.style.display = 'none';

    // Get availability for this day
    const { data: avail } = await db.from('availability')
      .select('*').eq('shop_id', SHOP_ID).eq('day_of_week', dayName).single();

    if (!avail || avail.is_closed === 'true') {
      slotsGrid.innerHTML = '';
      slotsEmpty.textContent = 'We\'re closed on this day. Please pick another date.';
      slotsEmpty.style.display = 'block';
      return;
    }

    // Get existing appointments for this date
    const { data: appts } = await db.from('appointments')
      .select('*').eq('shop_id', SHOP_ID).eq('booking_date', dateVal).neq('status','cancelled');

    // Generate slots every 30 minutes within open hours
    const slots = [];
    const [openH, openM] = avail.open_time.split(':').map(Number);
    const [closeH, closeM] = avail.close_time.split(':').map(Number);
    const openMins = openH * 60 + openM;
    const closeMins = closeH * 60 + closeM;

    for (let m = openMins; m + duration <= closeMins; m += 30) {
      const endM = m + duration;
      const startStr = `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
      const endStr = `${String(Math.floor(endM/60)).padStart(2,'0')}:${String(endM%60).padStart(2,'0')}`;

      // Check if this slot overlaps any existing appointment
      const taken = (appts || []).some(a => {
        const aStart = a.start_time.slice(0,5);
        const aEnd = a.end_time.slice(0,5);
        const aStartM = parseInt(aStart.split(':')[0])*60 + parseInt(aStart.split(':')[1]);
        const aEndM = parseInt(aEnd.split(':')[0])*60 + parseInt(aEnd.split(':')[1]);
        return m < aEndM && endM > aStartM;
      });

      if (!taken) slots.push({ start: startStr, end: endStr });
    }

    if (slots.length === 0) {
      slotsGrid.innerHTML = '';
      slotsEmpty.textContent = 'No available slots on this day. Please pick another date.';
      slotsEmpty.style.display = 'block';
      return;
    }

    slotsEmpty.style.display = 'none';
    slotsGrid.innerHTML = slots.map(s => {
      const label = formatTime(s.start) + ' – ' + formatTime(s.end);
      return `<button class="slot-btn" onclick="selectSlot(this,'${s.start}','${s.end}')">${formatTime(s.start)}</button>`;
    }).join('');
    document.getElementById('b-time').value = '';
  }

  function formatTime(t) {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
  }

  function selectSlot(btn, start, end) {
    document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById('b-time').value = start + '|' + end;
  }

  // ── STAFF LOGIN ──
  function openAdminModal() {
    const modal = document.getElementById('admin-modal');
    modal.style.display = 'flex';
    setTimeout(() => document.getElementById('admin-pw').focus(), 100);
  }

  function closeAdminModal() {
    document.getElementById('admin-modal').style.display = 'none';
    document.getElementById('admin-pw').value = '';
    document.getElementById('admin-login-err').style.display = 'none';
  }

  async function checkAdminLogin() {
    const pw = document.getElementById('admin-pw').value;
    const errEl = document.getElementById('admin-login-err');
    errEl.style.display = 'none';

    // Check Supabase first (works across all devices), fallback to localStorage
    try {
      const { data } = await db.from('shop_settings').select('admin_password').eq('shop_id', SHOP_ID).limit(1);
      const savedPw = (data && data[0] && data[0].admin_password) ? data[0].admin_password : (localStorage.getItem('aurora-admin-pw') || 'aurora2025');
      if (pw === savedPw) {
        // Also sync to localStorage for offline fallback
        localStorage.setItem('aurora-admin-pw', savedPw);
        closeAdminModal();
        window.open('/admin.html?auth=' + btoa(pw), '_blank');
      } else {
        errEl.style.display = 'block';
      }
    } catch(e) {
      // Fallback to localStorage if Supabase fails
      const fallback = localStorage.getItem('aurora-admin-pw') || 'aurora2025';
      if (pw === fallback) {
        closeAdminModal();
        window.open('/admin.html?auth=' + btoa(pw), '_blank');
      } else {
        errEl.style.display = 'block';
      }
    }
  }

  // Close modal on background click
  document.getElementById('admin-modal').addEventListener('click', function(e) {
    if (e.target === this) closeAdminModal();
  });

  // Hide page loader when ready
  window.addEventListener('load', () => {
    setTimeout(() => {
      const loader = document.getElementById('page-loader');
      loader.classList.add('hidden');
      setTimeout(() => loader.style.display = 'none', 400);
    }, 900);
  });

  // Load nav hours dynamically from availability table
  async function loadNavHours() {
    const { data } = await db.from('availability').select('*').eq('shop_id', SHOP_ID).order('id');
    if (!data || data.length === 0) {
      document.getElementById('nav-hours').style.display = 'block';
      return;
    }
    const order = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    const sorted = [...data].sort((a,b) => order.indexOf(a.day_of_week) - order.indexOf(b.day_of_week));

    function fmt(t) {
      if (!t) return '';
      const [h,m] = t.split(':').map(Number);
      return `${h%12||12}${m?':'+String(m).padStart(2,'0'):''}${h>=12?'pm':'am'}`;
    }

    // Group weekdays
    const weekdays = sorted.filter(d => ['monday','tuesday','wednesday','thursday','friday'].includes(d.day_of_week) && d.is_closed !== 'true');
    const sat = sorted.find(d => d.day_of_week === 'saturday');
    const sun = sorted.find(d => d.day_of_week === 'sunday');

    let line1 = '', line2 = '';
    if (weekdays.length > 0) {
      const w = weekdays[0];
      line1 = `Mon–Fri ${fmt(w.open_time)}–${fmt(w.close_time)}`;
    }
    const satText = sat && sat.is_closed !== 'true' ? `Sat ${fmt(sat.open_time)}–${fmt(sat.close_time)}` : 'Sat Closed';
    const sunText = sun && sun.is_closed !== 'true' ? `Sun ${fmt(sun.open_time)}–${fmt(sun.close_time)}` : 'Sun Closed';
    line2 = `${satText} · ${sunText}`;

    const el = document.getElementById('nav-hours');
    el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${line1} · ${line2}`;
  }
  // ── BRAND COLORS ──
  // Pre-fetch color immediately so loader car recolors before animation ends
  (async function preloadColor() {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/shop_settings?shop_id=eq.${SHOP_ID}&select=brand_color,car_color&limit=1`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
      });
      const data = await res.json();
      if (!data || !data[0]) return;
      const s = data[0];
      const carColor = s.car_color || s.brand_color;
      if (carColor) {
        // Recolor loader car SVG body parts
        document.querySelectorAll('#loader-car-svg rect, #loader-car-svg path').forEach(el => {
          const fill = el.getAttribute('fill');
          if (fill && !['#111','#555','#90caf9','#ffd54f','#ef5350'].includes(fill)) {
            el.setAttribute('fill', carColor);
            if (el.tagName === 'path') el.setAttribute('stroke', carColor);
          }
        });
      }
    } catch(e) {}
  })();

  async function loadBrandColors() {
    const { data } = await db.from('shop_settings').select('brand_color,car_color').eq('shop_id', SHOP_ID).limit(1);
    if (!data || data.length === 0) return;
    const s = data[0];

    if (s.brand_color && s.brand_color !== '') {
      // Override every CSS usage of the accent red
      const style = document.createElement('style');
      const c = s.brand_color;
      // Simple darken for hover
      const hex = c.replace('#','');
      const r = Math.max(0, parseInt(hex.slice(0,2),16) - 25);
      const g = Math.max(0, parseInt(hex.slice(2,4),16) - 25);
      const b = Math.max(0, parseInt(hex.slice(4,6),16) - 25);
      const dark = '#' + [r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
      style.textContent = `:root { --accent-red: ${c} !important; }
        .btn-primary { background: ${c} !important; }
        .btn-primary:hover { background: ${dark} !important; }
        .trust-bar { background: ${c} !important; }
        .nav-links a:hover { color: ${c} !important; }
        .tab-btn.active { color: ${c} !important; border-bottom-color: ${c} !important; }
        .service-card { border-left-color: ${c} !important; }
        .review-card { border-left-color: ${c} !important; }
        .service-price { color: ${c} !important; }
        .slot-btn:hover { border-color: ${c} !important; color: ${c} !important; }
        .slot-btn.selected { background: ${c} !important; border-color: ${c} !important; }
        .hero-eyebrow { color: ${c} !important; }
        .hero-eyebrow::before { background: ${c} !important; }
        .section-header h2::after { background: ${c} !important; }
        nav { border-bottom-color: ${c} !important; }`;
      document.head.appendChild(style);
    }

    if (s.car_color && s.car_color !== '') {
      const carColor = s.car_color;
      // Recolor nav logo car
      document.querySelectorAll('.nav-logo svg rect, .nav-logo svg path').forEach(el => {
        const fill = el.getAttribute('fill');
        if (fill && !['#111','#555','#90caf9','#ffd54f','#ef5350'].includes(fill)) {
          el.setAttribute('fill', carColor);
          if (el.tagName === 'path') el.setAttribute('stroke', carColor);
        }
      });
      // Recolor loader car
      document.querySelectorAll('#loader-car-svg rect, #loader-car-svg path').forEach(el => {
        const fill = el.getAttribute('fill');
        if (fill && !['#111','#555','#90caf9','#ffd54f','#ef5350'].includes(fill)) {
          el.setAttribute('fill', carColor);
          if (el.tagName === 'path') el.setAttribute('stroke', carColor);
        }
      });
    }
  }
  loadBrandColors();

  loadNavHours();
  // ── HERO SLIDESHOW ──
  let slideIndex = 0;
  let slideTimer = null;

  async function loadHeroMedia() {
    const { data } = await db.from('shop_settings').select('*').eq('shop_id', SHOP_ID).limit(1);
    if (!data || data.length === 0) return;
    const s = data[0];
    const el = document.getElementById('hero-media');

    if (s.hero_video_url) {
      let embedUrl = s.hero_video_url;
      const ytMatch = s.hero_video_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
      if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${ytMatch[1]}&controls=0`;
      el.innerHTML = `<iframe src="${embedUrl}" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
      el.classList.add('show');
      return;
    }

    let photos = [];
    if (s.hero_photos) { try { photos = JSON.parse(s.hero_photos) || []; } catch(e) {} }
    if (!photos.length && s.hero_photo_url) photos = [s.hero_photo_url];
    if (!photos.length) return;

    if (photos.length === 1) {
      el.innerHTML = `<img src="${photos[0]}" alt="Red Rock Auto Repair" style="width:100%;height:420px;object-fit:cover;display:block">`;
      el.classList.add('show');
      return;
    }

    el.innerHTML = `<div style="position:relative">
      ${photos.map((p, i) => `<div class="slide${i===0?' active':''}"><img src="${p}" alt="Shop photo" style="width:100%;height:420px;object-fit:cover;display:block"></div>`).join('')}
      <button class="slide-arrow prev" onclick="changeSlide(-1)">&#8249;</button>
      <button class="slide-arrow next" onclick="changeSlide(1)">&#8250;</button>
      <div class="slide-dots">${photos.map((_,i) => `<button class="slide-dot${i===0?' active':''}" onclick="goSlide(${i})"></button>`).join('')}</div>
    </div>`;
    el.classList.add('show');
    slideTimer = setInterval(() => changeSlide(1), 6000);
  }

  function changeSlide(dir) {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.slide-dot');
    if (!slides.length) return;
    slides[slideIndex].classList.remove('active');
    if(dots[slideIndex]) dots[slideIndex].classList.remove('active');
    slideIndex = (slideIndex + dir + slides.length) % slides.length;
    slides[slideIndex].classList.add('active');
    if(dots[slideIndex]) dots[slideIndex].classList.add('active');
  }

  function goSlide(i) {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.slide-dot');
    slides[slideIndex].classList.remove('active');
    if(dots[slideIndex]) dots[slideIndex].classList.remove('active');
    slideIndex = i;
    slides[slideIndex].classList.add('active');
    if(dots[slideIndex]) dots[slideIndex].classList.add('active');
    clearInterval(slideTimer);
    slideTimer = setInterval(() => changeSlide(1), 6000);
  }

  loadHeroMedia();

  // Wake up Supabase immediately on page load so first action is instant
  db.from('bookings').select('id').limit(1).then(() => console.log('Supabase ready'));

  // Load services into quote dropdown from Supabase (falls back to defaults)
  async function loadQuoteServices() {
    const { data } = await db.from('services').select('*')
      .eq('shop_id', SHOP_ID).eq('active', 'true').order('id');
    const select = document.getElementById('q-service');
    if (!data || data.length === 0) return; // keep hardcoded defaults
    select.innerHTML = '<option value="" data-low="" data-high="">Select service</option>' +
      data.map(s => `<option data-low="${s.price_low}" data-high="${s.price_high||s.price_low}">${s.name}</option>`).join('');
  }
  loadQuoteServices();

  // Load announcements banner
  async function loadBanner() {
    const { data } = await db.from('announcements').select('*')
      .eq('shop_id', SHOP_ID).eq('active', 'true').order('id', { ascending: false });
    const banner = document.getElementById('ann-banner');
    if (!data || data.length === 0) { banner.style.display = 'none'; return; }
    const colors = {
      info: { bg: '#e8f0fe', border: '#93b4f5', text: '#1a3a8b' },
      promo: { bg: '#f0faf4', border: '#6fcf97', text: '#1a6b3a' },
      warning: { bg: '#fff8e1', border: '#f0d070', text: '#7a5500' }
    };
    banner.innerHTML = data.map(a => {
      const c = colors[a.type] || colors.info;
      return `<div style="background:${c.bg};border-bottom:1px solid ${c.border};padding:12px 40px;font-size:14px;color:${c.text};display:flex;align-items:center;gap:10px">
        <span style="font-weight:500">${a.type === 'promo' ? 'Special offer' : a.type === 'warning' ? 'Notice' : 'Info'}:</span>
        <span>${a.messages}</span>
      </div>`;
    }).join('');
    banner.style.display = 'block';
  }
  loadBanner();

  // Load services from Supabase — falls back to hardcoded if none added yet
  async function loadServicesGrid() {
    const { data } = await db.from('services').select('*')
      .eq('shop_id', SHOP_ID).eq('active', 'true').order('id');
    if (!data || data.length === 0) return; // keep hardcoded defaults
    const grid = document.getElementById('services-grid');
    grid.innerHTML = data.map(s => `
      <div class="service-card">
        <div class="service-name">${s.name}</div>
        <div class="service-desc">${s.duration_mins} min service</div>
        <div class="service-price">${s.price_low && s.price_high && s.price_low !== s.price_high ? '$'+s.price_low+' – $'+s.price_high : s.price_low ? 'From $'+s.price_low : 'Call for pricing'}</div>
      </div>`).join('');
  }
  loadServicesGrid();

  // ── NAV SCROLL EFFECT ──
  window.addEventListener('scroll', () => {
    document.querySelector('nav').classList.toggle('scrolled', window.scrollY > 10);
  });

  // ── SCROLL REVEAL ──
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); revealObserver.unobserve(e.target); } });
  }, { threshold: 0.15 });
  document.querySelectorAll('.trust-bar, .tools-section, .services-section, .reviews-section').forEach(el => {
    el.classList.add('reveal');
    revealObserver.observe(el);
  });

  // ── COUNT UP ANIMATION ──
  const countObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      if (!target) return;
      let start = 0;
      const duration = 1200;
      const step = 16;
      const increment = target / (duration / step);
      const timer = setInterval(() => {
        start += increment;
        if (start >= target) { el.textContent = target + suffix; clearInterval(timer); }
        else { el.textContent = (target % 1 === 0 ? Math.floor(start) : start.toFixed(1)) + suffix; }
      }, step);
      countObserver.unobserve(el);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('[data-count]').forEach(el => countObserver.observe(el));


  // ── WRENCH + STEP ANIMATION (patched cleanly) ──
  function animateStepsIn() {
    ['1','2','3','4'].forEach((n, i) => {
      const dot = document.getElementById('dot-' + n);
      if (dot) {
        dot.style.opacity = '0';
        dot.style.transform = 'scale(0.5)';
        setTimeout(() => {
          dot.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          dot.style.opacity = '1';
          dot.style.transform = '';
        }, i * 120);
      }
    });
  }

  function addWraenchIfNeeded() {
    const badge = document.getElementById('s-badge');
    if (badge && badge.textContent.toLowerCase().includes('in repair') && !badge.querySelector('.status-wrench')) {
      badge.innerHTML = '<span class="status-wrench">🔧</span>' + badge.textContent;
    }
  }

  // ── VEHICLE CASCADE: Brand → Model → Year ──
  const VEHICLE_DATA = {
    'Toyota': ['4Runner','Avalon','C-HR','Camry','Celica','Corolla','Corolla Cross','Crown','Echo','FJ Cruiser','GR86','GR Corolla','GR Supra','Highlander','Land Cruiser','Matrix','MR2','Prius','Prius C','Prius Prime','Prius V','RAV4','RAV4 Prime','Sequoia','Sienna','Solara','Supra','Tacoma','Tercel','Tundra','Venza','Yaris','Other'],
    'Honda': ['Accord','Civic','Clarity','CR-V','CR-V Hybrid','CR-Z','Element','Fit','HR-V','Insight','Odyssey','Passport','Pilot','Prologue','Ridgeline','S2000','Other'],
    'Ford': ['Bronco','Bronco Sport','Edge','Escape','Expedition','Explorer','F-150','F-150 Lightning','F-250','F-350','F-450','Flex','Focus','Fusion','Maverick','Mustang','Mustang Mach-E','Ranger','Taurus','Transit','Transit Connect','Other'],
    'Chevrolet': ['Blazer','Bolt EV','Bolt EUV','Camaro','Colorado','Corvette','Equinox','Equinox EV','Express','HHR','Impala','Malibu','Monte Carlo','Silverado 1500','Silverado 2500HD','Silverado 3500HD','Sonic','Spark','Suburban','Tahoe','Traverse','Trax','Volt','Other'],
    'Nissan': ['370Z','Altima','Armada','Cube','Frontier','GT-R','Juke','Kicks','Leaf','Maxima','Murano','Pathfinder','Quest','Rogue','Rogue Sport','Sentra','Titan','Titan XD','Versa','Xterra','Z','Other'],
    'BMW': ['1 Series','2 Series','3 Series','4 Series','5 Series','6 Series','7 Series','8 Series','i3','i4','i7','i8','iX','M2','M3','M4','M5','M6','M8','X1','X2','X3','X3M','X4','X4M','X5','X5M','X6','X6M','X7','Z3','Z4','Other'],
    'Mercedes-Benz': ['A-Class','AMG GT','C-Class','CLA','CLS','E-Class','EQB','EQC','EQE','EQS','G-Class','GLA','GLB','GLC','GLE','GLS','S-Class','SL','SLC','SLK','Sprinter','Other'],
    'Subaru': ['Ascent','BRZ','Crosstrek','Forester','Impreza','Legacy','Outback','SVX','Tribeca','WRX','WRX STI','XV Crosstrek','Other'],
    'Audi': ['A3','A4','A5','A6','A7','A8','e-tron','e-tron GT','Q3','Q4 e-tron','Q5','Q7','Q8','R8','RS3','RS4','RS5','RS6','RS7','S3','S4','S5','S6','S7','S8','SQ5','SQ7','SQ8','TT','TT RS','TTS','Other'],
    'Volkswagen': ['Arteon','Atlas','Atlas Cross Sport','Beetle','CC','EOS','Golf','Golf Alltrack','Golf GTI','Golf R','Golf SportWagen','ID.4','ID.Buzz','Jetta','Jetta GLI','Passat','Taos','Tiguan','Touareg','Other'],
    'Jeep': ['Cherokee','Commander','Compass','Gladiator','Grand Cherokee','Grand Cherokee L','Grand Cherokee 4xe','Grand Wagoneer','Patriot','Renegade','Wagoneer','Wrangler','Wrangler 4xe','Other'],
    'Dodge': ['Challenger','Charger','Dart','Durango','Grand Caravan','Journey','Neon','Nitro','Viper','Other'],
    'Ram': ['1500','1500 Classic','2500','3500','4500','5500','ProMaster','ProMaster City','Other'],
    'GMC': ['Acadia','Canyon','Envoy','Envoy XL','Jimmy','Safari','Sierra 1500','Sierra 2500HD','Sierra 3500HD','Sonoma','Terrain','Yukon','Yukon XL','Other'],
    'Hyundai': ['Accent','Azera','Elantra','Elantra GT','Elantra N','Entourage','Ioniq','Ioniq 5','Ioniq 6','Kona','Kona Electric','Nexo','Palisade','Santa Cruz','Santa Fe','Santa Fe Sport','Sonata','Sonata Hybrid','Tiburon','Tucson','Tucson Hybrid','Veloster','Veloster N','Other'],
    'Kia': ['Cadenza','Carnival','EV6','EV9','Forte','K5','K900','Niro','Niro EV','Optima','Rio','Rondo','Sedona','Seltos','Sorento','Soul','Soul EV','Sportage','Stinger','Telluride','Other'],
    'Lexus': ['CT','ES','ES Hybrid','GS','GS Hybrid','GX','IS','IS F','LC','LC Hybrid','LFA','LS','LS Hybrid','LX','NX','NX Hybrid','RC','RC F','RX','RX Hybrid','RZ','UX','UX Hybrid','Other'],
    'Mazda': ['CX-3','CX-30','CX-5','CX-50','CX-9','CX-90','Mazda2','Mazda3','Mazda5','Mazda6','MX-5 Miata','MX-30','RX-7','RX-8','Tribute','Other'],
    'Tesla': ['Cybertruck','Model 3','Model S','Model X','Model Y','Roadster','Other'],
    'Acura': ['ILX','Integra','MDX','NSX','RDX','RLX','RSX','TL','TLX','TSX','ZDX','Other'],
    'Infiniti': ['EX','FX','G Coupe','G Sedan','JX','M','Q40','Q45','Q50','Q60','Q70','QX30','QX50','QX55','QX56','QX60','QX70','QX80','Other'],
    'Cadillac': ['ATS','ATS-V','CT4','CT4-V','CT5','CT5-V','CTS','CTS-V','DeVille','DTS','Eldorado','Escalade','Escalade ESV','Escalade EXT','ELR','Lyriq','SRX','STS','XT4','XT5','XT6','XTS','Other'],
    'Lincoln': ['Aviator','Continental','Corsair','MKC','MKS','MKT','MKX','MKZ','Navigator','Navigator L','Nautilus','Town Car','Zephyr','Other'],
    'Buick': ['Cascada','Century','Enclave','Encore','Encore GX','Envision','Envoy','LaCrosse','LeSabre','Lucerne','Regal','Regal TourX','Rendezvous','Terraza','Verano','Other'],
    'Chrysler': ['200','300','300C','Aspen','Crossfire','Pacifica','Pacifica Hybrid','PT Cruiser','Sebring','Town & Country','Voyager','Other'],
    'Volvo': ['C30','C40 Recharge','C70','S40','S60','S60 Cross Country','S80','S90','V40','V50','V60','V60 Cross Country','V70','V90','V90 Cross Country','XC40','XC40 Recharge','XC60','XC70','XC90','Other'],
    'Land Rover': ['Defender','Defender 90','Defender 110','Discovery','Discovery Sport','Freelander','LR2','LR3','LR4','Range Rover','Range Rover Evoque','Range Rover Sport','Range Rover Velar','Other'],
    'Jaguar': ['E-Pace','F-Pace','F-Type','I-Pace','S-Type','X-Type','XE','XF','XJ','XK','Other'],
    'Porsche': ['718 Boxster','718 Cayman','911','Cayenne','Cayenne Coupe','Macan','Panamera','Taycan','Taycan Cross Turismo','Other'],
    'Mini': ['Clubman','Convertible','Countryman','Coupe','Hardtop 2 Door','Hardtop 4 Door','Paceman','Roadster','Other'],
    'Mitsubishi': ['Eclipse','Eclipse Cross','Endeavor','Galant','i-MiEV','Lancer','Lancer Evolution','Mirage','Mirage G4','Montero','Montero Sport','Outlander','Outlander Sport','Outlander PHEV','Other'],
    'Genesis': ['G70','G80','G90','GV60','GV70','GV80','Other'],
    'Pontiac': ['Aztek','Bonneville','Firebird','G5','G6','G8','Grand Am','Grand Prix','Montana','Solstice','Torrent','Vibe','Other'],
    'Saturn': ['Aura','Ion','L-Series','Outlook','Relay','SC','Sky','SL','SW','Vue','Other'],
    'Scion': ['FR-S','iA','iM','iQ','tC','xA','xB','xD','Other'],
    'Hummer': ['H1','H2','H3','H3T','EV','EV SUV','Other'],
    'Other': ['Other']
  };

  function onVehicleTypeChange() {
    const brand = document.getElementById('b-vtype').value;
    const modelEl = document.getElementById('b-vmake');
    const yearEl = document.getElementById('b-vyear');
    modelEl.innerHTML = '<option value="">Model</option>';
    yearEl.innerHTML = '<option value="">Year</option>';
    yearEl.disabled = true;
    if (!brand) { modelEl.disabled = true; return; }
    (VEHICLE_DATA[brand] || ['Other']).forEach(m => {
      const o = document.createElement('option');
      o.value = m; o.textContent = m; modelEl.appendChild(o);
    });
    modelEl.disabled = false;
  }

  function onVehicleMakeChange() {
    const model = document.getElementById('b-vmake').value;
    const yearEl = document.getElementById('b-vyear');
    yearEl.innerHTML = '<option value="">Year</option>';
    if (!model) { yearEl.disabled = true; return; }
    for (let y = new Date().getFullYear() + 1; y >= 1950; y--) {
      const o = document.createElement('option');
      o.value = y; o.textContent = y; yearEl.appendChild(o);
    }
    yearEl.disabled = false;
  }
