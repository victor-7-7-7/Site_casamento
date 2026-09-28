(() => {
  'use strict';
  const c = window.WEDDING_CONFIG;
  if (!c) return;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const make = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };
  const webUrl = value => {
    try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; }
    catch { return ''; }
  };
  const imageUrl = value => {
    if (typeof value !== 'string') return 'assets/images/foto-placeholder.svg';
    return /^(assets\/|https:\/\/)/.test(value) ? value : 'assets/images/foto-placeholder.svg';
  };
  function photo(img, data) {
    img.alt = data?.alt || 'Foto do casal a adicionar';
    img.decoding = 'async';
    img.addEventListener('error', () => {
      img.src = 'assets/images/foto-placeholder.svg';
      img.alt = 'Espaço reservado para uma fotografia do casal';
    }, { once: true });
    img.src = imageUrl(data?.src);
    if (data?.position) img.style.objectPosition = data.position;
  }
  c.couple = `${c.bride} & ${c.groom}`;
  const eventDate = c.dateISO ? new Date(c.dateISO) : null;
  const validDate = eventDate && Number.isFinite(eventDate.getTime());
  if (validDate) {
    try {
      c.dateLabel = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: c.timeZone }).format(eventDate);
      c.timeLabel = `Cerimônia às ${new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: c.timeZone }).format(eventDate)}`;
    } catch { /* Mantém os rótulos editáveis se o fuso for inválido. */ }
  }
  document.title = `${c.couple} | Nosso casamento`;
  $$('[data-text]').forEach(el => {
    const value = el.dataset.text.split('.').reduce((object, key) => object?.[key], c);
    if (typeof value === 'string') el.textContent = value;
  });
  $$('[data-photo]').forEach(img => photo(img, c.photos[img.dataset.photo]));
  $$('.photo-note, .image-disclaimer').forEach(el => { el.hidden = !c.photosAreIllustrative; });
  const mapUrl = webUrl(c.venue.mapUrl);
  $$('[data-map]').forEach(link => {
    if (mapUrl) { link.href = mapUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; }
    else { link.setAttribute('aria-disabled', 'true'); link.textContent = 'Localização em breve'; }
  });

  const toggle = $('.menu-toggle'), menu = $('#menu');
  function setMenu(open) {
    menu.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  }
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  $$('a', menu).forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setMenu(false); toggle.focus(); }
  });
  document.addEventListener('click', event => { if (!event.target.closest('.header')) setMenu(false); });
  matchMedia('(min-width: 761px)').addEventListener('change', () => setMenu(false));

  function updateCountdown() {
    if (!validDate) return;
    const remaining = Math.max(0, Math.floor((eventDate.getTime() - Date.now()) / 1000));
    const parts = { days: Math.floor(remaining / 86400), hours: Math.floor(remaining / 3600) % 24, minutes: Math.floor(remaining / 60) % 60, seconds: remaining % 60 };
    Object.entries(parts).forEach(([id, value]) => { $(`#${id}`).textContent = String(value).padStart(2, '0'); });
    const message = remaining === 0 ? c.afterEvent : 'Para viver esse dia ao seu lado.';
    if ($('#countdown-message').textContent !== message) $('#countdown-message').textContent = message;
    return remaining;
  }
  updateCountdown();
  if (validDate && eventDate.getTime() > Date.now()) {
    const timer = setInterval(() => { if (updateCountdown() === 0) clearInterval(timer); }, 1000);
  }
  if (validDate) {
    $('#save-date').hidden = false;
    $('#save-date').addEventListener('click', () => {
      const escapeICS = value => String(value).replace(/\\/g, '\\\\').replace(/\r?\n|\r/g, '\\n').replace(/[,;]/g, '\\$&');
      const stamp = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      // Dobrar por bytes mantém nomes acentuados dentro do limite do formato ICS.
      const fold = line => {
        let result = '', length = 0;
        for (const char of line) {
          const size = new TextEncoder().encode(char).length;
          if (length + size > 74) { result += '\r\n '; length = 1; }
          result += char; length += size;
        }
        return result;
      };
      const content = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nosso casamento//PT-BR', 'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT', `UID:casamento-${eventDate.getTime()}@nosso-casamento`, `DTSTAMP:${stamp(new Date())}`,
        `DTSTART:${stamp(eventDate)}`, `SUMMARY:${escapeICS(`Casamento de ${c.couple}`)}`,
        `LOCATION:${escapeICS(`${c.venue.name}, ${c.venue.address}`)}`, `DESCRIPTION:${escapeICS(c.welcome)}`,
        'END:VEVENT', 'END:VCALENDAR'].map(fold).join('\r\n') + '\r\n';
      const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }));
      const link = make('a'); link.href = url; link.download = 'nosso-casamento.ics';
      document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }
  const galleryDialog = $('#gallery-dialog');
  let galleryIndex = 0, galleryTrigger;
  function showGallery(index) {
    galleryIndex = (index + c.gallery.length) % c.gallery.length;
    const item = c.gallery[galleryIndex];
    photo($('#gallery-large'), item);
    $('#gallery-caption').textContent = item.caption;
    $('#gallery-position').textContent = `${galleryIndex + 1} / ${c.gallery.length}`;
  }
  c.gallery.forEach((item, index) => {
    const figure = make('figure'), img = make('img');
    img.loading = 'lazy'; img.width = 700; img.height = 875; photo(img, item);
    const button = make('button', 'gallery-open'); button.type = 'button';
    button.setAttribute('aria-label', `Ampliar fotografia: ${item.caption}`);
    button.setAttribute('aria-haspopup', 'dialog');
    button.append(img);
    button.addEventListener('click', () => {
      galleryTrigger = button; showGallery(index); galleryDialog.showModal(); document.body.style.overflow = 'hidden';
    });
    figure.append(button, make('figcaption', '', item.caption)); $('#gallery').append(figure);
  });
  $('#close-gallery').addEventListener('click', () => galleryDialog.close());
  $('#gallery-previous').addEventListener('click', () => showGallery(galleryIndex - 1));
  $('#gallery-next').addEventListener('click', () => showGallery(galleryIndex + 1));
  galleryDialog.addEventListener('keydown', event => {
    if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault(); showGallery(galleryIndex + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  galleryDialog.addEventListener('close', () => { document.body.style.overflow = ''; galleryTrigger?.focus(); });
  function openEnvelope() {
    $('#envelope').classList.add('open');
    $('#open-envelope').setAttribute('aria-expanded', 'true');
    $('#open-envelope').setAttribute('aria-label', 'Convite aberto');
    $('#invitation-card').inert = false;
    $('#envelope-hint').textContent = 'Esperamos você para celebrar com a gente.';
  }
  $('#open-envelope').addEventListener('click', openEnvelope);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.08 });
    if (!reducedMotion) { document.body.classList.add('motion-ready'); $$('.reveal').forEach(el => observer.observe(el)); }
    const envelopeObserver = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { openEnvelope(); envelopeObserver.disconnect(); }
    }, { threshold: 0.65 });
    envelopeObserver.observe($('#envelope'));
  }

  const video = $('#proposal-video');
  function videoFallback() { video.hidden = true; $('#video-placeholder').hidden = false; }
  video.addEventListener('error', videoFallback);
  $('source', video).addEventListener('error', videoFallback);
  if (c.videoAvailable) {
    video.hidden = false; $('#video-placeholder').hidden = true;
    video.poster = imageUrl(c.photos.hero.src);
    if (c.videoCaptions) $('#video-captions').src = imageUrl(c.videoCaptions);
    video.preload = 'metadata'; video.load();
  }

  function renderGifts(filter = 'all') {
    const container = $('#gift-list'); container.replaceChildren();
    const gifts = c.gifts.filter(item => filter === 'all' || item.status === filter);
    $('#gift-empty').hidden = gifts.length > 0;
    gifts.forEach(gift => {
      const status = ['disponivel', 'reservado', 'ganhamos'].includes(gift.status) ? gift.status : 'reservado';
      const card = make('article', `gift-card${status === 'ganhamos' ? ' received' : ''}`);
      const img = make('img'); img.loading = 'lazy'; img.width = 500; img.height = 435;
      photo(img, { src: gift.image, alt: gift.name });
      const body = make('div', 'gift-body');
      body.append(make('span', 'gift-status', { disponivel: 'Disponível', reservado: 'Reservado com carinho', ganhamos: '✓ GANHAMOS!' }[status]), make('h3', '', gift.name));
      if (gift.description) body.append(make('p', '', gift.description));
      body.append(make('strong', 'gift-price', money(gift.price)));
      const url = webUrl(gift.url);
      if (status === 'disponivel' && url) {
        const link = make('a', 'button', 'Ver presente ↗'); link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.setAttribute('aria-label', `Ver ${gift.name} na loja (abre em nova aba)`); body.append(link);
      } else {
        const label = status === 'ganhamos' ? 'Obrigado pelo carinho ♡' : status === 'reservado' ? 'Já está reservado' : 'Link em breve';
        body.append(make('span', 'small', label));
      }
      card.append(img, body); container.append(card);
    });
  }
  renderGifts();
  $$('.filter').forEach(button => button.addEventListener('click', () => {
    $$('.filter').forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
    renderGifts(button.dataset.filter);
  }));
  c.party.palette.forEach(item => {
    const swatch = make('span');
    if (/^#[\da-f]{6}$/i.test(item.color)) swatch.style.background = item.color;
    swatch.setAttribute('role', 'img'); swatch.setAttribute('aria-label', item.name); swatch.title = item.name; $('#palette').append(swatch);
  });

  const dialog = $('#pix-dialog');
  let pixTrigger;
  c.symbolicGifts.forEach(gift => {
    const card = make('article', 'symbolic-card');
    const icon = make('span', 'symbolic-icon', gift.icon); icon.setAttribute('aria-hidden', 'true');
    const button = make('button', 'text-link', 'Presentear via Pix ↗');
    button.type = 'button'; button.setAttribute('aria-label', `Presentear: ${gift.name}`);
    button.addEventListener('click', () => {
      pixTrigger = button;
      $('#pix-dialog-title').textContent = gift.name; $('#pix-description').textContent = gift.description;
      $('#pix-amount').textContent = money(gift.price); $('#pix-key').value = c.pix.key;
      $('#pix-recipient').textContent = c.pix.key ? `Recebedor: ${c.pix.recipient}` : '';
      $('#pix-status').textContent = c.pix.key ? '' : 'A chave Pix será disponibilizada em breve.';
      $('#copy-pix').disabled = !c.pix.key;
      dialog.showModal(); document.body.style.overflow = 'hidden';
    });
    card.append(icon, make('h3', '', gift.name), make('p', '', gift.description), make('strong', 'gift-price', money(gift.price)), button);
    $('#symbolic-list').append(card);
  });
  $('#close-pix').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const box = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => { document.body.style.overflow = ''; pixTrigger?.focus(); });
  $('#copy-pix').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(c.pix.key); $('#pix-status').textContent = 'Chave copiada. Agora é só abrir o aplicativo do seu banco.'; }
    catch { $('#pix-key').focus(); $('#pix-key').select(); $('#pix-status').textContent = 'Selecione e copie a chave acima manualmente.'; }
  });

  const form = $('#rsvp-form'), count = $('#companion-count'), submit = $('#rsvp-submit'), status = $('#rsvp-status');
  const remoteReady = Boolean(webUrl(c.supabase.url) && c.supabase.publishableKey.startsWith('sb_publishable_'));
  let ready = remoteReady;
  submit.disabled = !ready;
  if (!ready) {
    status.textContent = 'A confirmação on-line estará disponível em breve. Aguarde as orientações do casal.';
    if (location.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(location.hostname)) {
      fetch('/api/health', { signal: AbortSignal.timeout(4000), credentials: 'omit' })
        .then(response => response.ok ? response.json() : null)
        .then(health => {
          if (health?.service === 'wedding-rsvp' && health.ready === true) {
            ready = true; submit.disabled = false;
            status.textContent = 'Prévia local: as respostas serão salvas neste computador.';
          }
        }).catch(() => {});
    }
  }
  function companionFields() {
    const previous = $$('input', $('#companion-fields')).map(input => input.value);
    $('#companion-fields').replaceChildren();
    for (let index = 0; index < Number(count.value); index++) {
      const row = make('div'), label = make('label', '', `Nome completo do acompanhante ${index + 1} *`), input = make('input');
      input.id = `companion-${index}`; input.name = `companion-${index}`; input.required = true; input.minLength = 3; input.maxLength = 120;
      input.autocomplete = 'off'; input.value = previous[index] || ''; label.htmlFor = input.id; row.append(label, input); $('#companion-fields').append(row);
    }
  }
  count.addEventListener('change', companionFields);
  $$('input[name=attending]').forEach(radio => radio.addEventListener('change', () => {
    const attending = radio.value === 'yes'; $('#companions-group').hidden = !attending;
    if (!attending) { count.value = '0'; companionFields(); }
  }));
  function normalizePhone(raw) {
    const digits = raw.replace(/\D/g, '');
    if (raw.trim().startsWith('+')) return /^[1-9]\d{9,14}$/.test(digits) ? `+${digits}` : '';
    if (/^\d{10,11}$/.test(digits)) return `+55${digits}`;
    if (/^55\d{10,11}$/.test(digits)) return `+${digits}`;
    return '';
  }
  const fullName = name => name.trim().replace(/\s+/g, ' ');
  const validName = name => /^[\p{L}\p{M}][\p{L}\p{M}'’.-]*(?:\s+[\p{L}\p{M}][\p{L}\p{M}'’.-]*)+$/u.test(name);
  let sending = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending || !ready || !form.reportValidity()) return;
    status.className = ''; status.textContent = '';
    const data = new FormData(form);
    if (data.get('website')) return;
    const name = fullName(String(data.get('full_name') || ''));
    const phone = normalizePhone(String(data.get('phone') || ''));
    const attending = data.get('attending') === 'yes';
    const companions = attending ? $$('input', $('#companion-fields')).map(input => fullName(input.value)) : [];
    if (!validName(name) || !phone || companions.some(value => !validName(value))) {
      status.className = 'error'; status.textContent = 'Confira o telefone com DDD e informe nome e sobrenome de cada pessoa.'; return;
    }
    const payload = { full_name: name, phone, attending, companion_count: companions.length, companions, notes: String(data.get('notes') || '').trim(), consent: true };
    sending = true; submit.disabled = true; submit.textContent = 'Enviando com carinho…';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const endpoint = remoteReady ? `${c.supabase.url.trim().replace(/\/+$/, '')}/rest/v1/wedding_rsvps` : '/api/rsvp';
      const headers = { 'Content-Type': 'application/json' };
      if (remoteReady) Object.assign(headers, { apikey: c.supabase.publishableKey, Prefer: 'return=minimal' });
      const response = await fetch(endpoint, {
        method: 'POST', headers,
        body: JSON.stringify(payload), signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer'
      });
      if (!response.ok) {
        if (response.status === 429) {
          status.className = 'error'; status.textContent = 'Aguarde um minuto antes de tentar novamente.'; return;
        }
        if (response.status === 409) {
          status.className = 'error'; status.textContent = 'Já existe uma resposta para este nome e telefone. Para conferir ou alterar, fale com o casal.'; return;
        }
        throw new Error('Não foi possível salvar');
      }
      status.className = 'success';
      status.textContent = attending ? 'Resposta recebida com carinho! Estamos felizes em celebrar esse dia com você. ♡' : 'Resposta recebida. Obrigado por nos avisar e por fazer parte da nossa história. ♡';
      form.reset(); $('#companions-group').hidden = true; companionFields();
    } catch {
      status.className = 'error'; status.textContent = 'Não conseguimos confirmar o recebimento. Verifique sua conexão e tente novamente. Se já recebemos a resposta, o reenvio não criará outra.';
    } finally {
      clearTimeout(timeout); sending = false; submit.disabled = false; submit.textContent = 'Enviar minha resposta ↗';
    }
  });
})();
