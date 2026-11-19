'use strict';
// Calendrier Instagram NOX Studio (19/11) : copie du calendrier TikTok du Mac, adaptée aux 4 comptes Instagram.
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const NY = 'America/New_York', BE = 'Europe/Brussels';
const hm = (iso, tz = NY) => new Intl.DateTimeFormat('fr-FR', { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const nyDay = d => new Intl.DateTimeFormat('en-CA', { timeZone: NY, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const addDays = (day, n) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dayName = (day, opts) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', ...opts }).format(new Date(`${day}T12:00:00Z`));
const COLORS = { cy: '#e64980', lou: '#1c7ed6', sasha: '#f59f00', kai: '#37b24d' };
const KIND = { remix: 'remix', new: 'nouvelle', story: 'story' };
const hookTxt = h => h ? `${h.before} → ${h.after}` : '';
const api = (path, body) => fetch('/api/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) }).then(r => r.json());

const ui = { view: 'week', anchor: nyDay(new Date()), account: '', data: null, avv: Date.now() };
// 19/11 : photo de profil (image si dispo, sinon initiale) + mode anonyme (flou)
const av = (k, cls = '', dot = false) => `<span class="avatar ${cls}" style="background:${COLORS[k]}">${esc(k[0].toUpperCase())}<img src="${window.CAL ? 'avatars/' + esc(k) + '.jpg' : '/avatar/' + esc(k) + '?v=' + ui.avv}" alt="" onerror="this.remove()">${dot ? '<i class="on"></i>' : ''}</span>`;
const hdl = h => `<span class="hdl">${esc(h)}</span>`;
function setAnon(on) {
  document.body.classList.toggle('secret', on);
  const b = document.getElementById('anon'); if (b) { b.setAttribute('aria-checked', on); b.querySelector('.lbl').textContent = on ? 'Anonyme' : 'Normal'; }
  try { sessionStorage.setItem('nox-anon', on ? '1' : '0'); } catch {}
}

function mondayOf(day) { const wd = new Date(`${day}T12:00:00Z`).getUTCDay(); return addDays(day, wd === 0 ? -6 : 1 - wd); }
function range() {
  if (ui.view === 'day') return { start: ui.anchor, days: 1 };
  if (ui.view === 'week') return { start: mondayOf(ui.anchor), days: 7 };
  return { start: mondayOf(`${ui.anchor.slice(0, 7)}-01`), days: 42 };
}
async function load() {
  const { start, days } = range();
  if (window.CAL) { const C = window.CAL, dl = [...Array(days).keys()].map(k => addDays(start, k)), set = new Set(dl); ui.data = { ...C, days: dl, items: C.items.filter(i => set.has(i.day)), free: C.free.filter(f => set.has(f.day)), ready: [] }; if (!$('#preview').open) render(); return; }
  try {
    const res = await fetch(`/api/ig/calendar?start=${start}&days=${days}`);
    ui.data = await res.json();
    if (!res.ok) throw new Error(ui.data.error || 'Erreur');
    if (!$('#preview').open) render();
  } catch (e) { $('#board').innerHTML = `<div class="empty">Calendrier indisponible : ${esc(e.message)}</div>`; }
}

const visible = () => ui.data.items.filter(i => !ui.account || i.account === ui.account);
const freeVisible = () => ui.data.free.filter(f => !ui.account || f.account === ui.account);
const slotsPerDay = () => (ui.account ? 1 : ui.data.accounts.length) * (ui.data.accounts[0] ? ui.data.accounts[0].perDay : 5);

function accountsPanel() {
  $('#account-list').innerHTML = `<div class="phone-group">proxy US dédié par compte</div>` + ui.data.accounts.map(a => {
    const ready = ui.data.ready.filter(r => r.account === a.short).length;
    return `<button class="acc ${ui.account === a.short ? 'on' : ''}" data-account="${esc(a.short)}">${av(a.short, '', true)}<span><b>${hdl(a.handle)}</b><small>${a.perDay} Reels / jour${ready ? ` · ${ready} prêt${ready > 1 ? 's' : ''}` : ''}</small></span><span class="cam" data-cam="${esc(a.short)}" title="Changer la photo de profil">📷</span></button>`;
  }).join('');
  document.querySelector('.acc.all').classList.toggle('on', !ui.account);
}

function stats() {
  const items = visible(), c = s => items.filter(i => i.status === s).length, free = freeVisible();
  const ready = ui.data.ready.filter(r => !ui.account || r.account === ui.account).length;
  $('#stats').innerHTML = `<span class="stat ok">✓ ${c('published')} publiés</span><span class="stat plan">▣ ${c('scheduled')} programmés</span>`
    + (ready ? `<button class="ready-btn" data-ready="1">● ${ready} prêts à placer</button>` : '')
    + `<span class="stat free">◌ ${free.length} libres (${free.filter(f => f.kind === 'remix').length} remix · ${free.filter(f => f.kind === 'new').length} nouvelles)</span>`;
}

const thumb = i => i.type === 'story' && i.media[0] ? `<span class="thumb" style="background-image:url('${i.media[0]}')"></span>` : i.media[0] ? `<span class="thumb" style="background:#111"><video src="${i.media[0]}#t=0.6" preload="metadata" muted playsinline></video></span>` : `<span class="thumb text">▶</span>`;
function card(i, compact = false) {
  return `<button class="card ${esc(i.status)}" data-item="${esc(i.id)}" title="${esc(i.label)}">${thumb(i)}<span class="meta">
    <span class="t">${hm(i.at)}<span class="kind ${i.kind}">${KIND[i.kind]}</span>${compact ? '' : `<small>${hm(i.at, BE)} BE</small>`}</span>
    <span class="who">${av(i.account, 'sm')}${hdl(i.handle)}</span>
    <span class="cap">${esc(i.hook ? hookTxt(i.hook) : i.caption)}</span></span></button>`;
}
const freeCard = f => f.kind === 'story' ? `<div class="free story"><span>${hm(f.at)} · story ${f.err ? '⚠ ' + esc(f.err) : f.ready ? 'prête' : 'auto (faite par l’app)'}</span><span>${ui.account ? '' : esc(f.account)}</span></div>` : `<button class="free ${f.kind}" data-free="${f.account}|${f.base}"><span>${hm(f.at)} · ${f.kind === 'new' ? 'nouvelle à faire' : 'remix à faire'}</span><span>${ui.account ? '' : esc(f.account)}</span></button>`;

function fillBar(day) {
  const n = visible().filter(i => i.day === day).length, total = slotsPerDay(), pct = total ? Math.min(100, Math.round(n / total * 100)) : 0;
  return `<div class="fill"><i style="width:${pct}%"></i></div><div class="fill-label">${n} / ${total} Reels</div>`;
}

function week() {
  const today = ui.data.today;
  return `<div class="week">${ui.data.days.map(day => {
    const items = visible().filter(i => i.day === day).sort((a, b) => a.at.localeCompare(b.at)), free = freeVisible().filter(f => f.day === day);
    const showFree = ui.account ? free.map(freeCard).join('') : (free.length ? `<div class="free-sum">${free.length} créneaux libres</div>` : '');
    return `<div class="col ${day === today ? 'today' : ''} ${day < today ? 'past' : ''}"><div class="col-head"><div><span>${esc(dayName(day, { weekday: 'short' }))}</span><b>${Number(day.slice(8))}</b></div></div>
      ${fillBar(day)}${items.map(i => card(i, true)).join('')}${showFree}${!items.length && !free.length ? '<div class="free-sum">rien ce jour</div>' : ''}</div>`;
  }).join('')}</div>`;
}

function dayView() {
  const day = ui.data.days[0], items = visible().filter(i => i.day === day), free = freeVisible().filter(f => f.day === day);
  const hourOf = iso => Number(new Intl.DateTimeFormat('en-US', { timeZone: NY, hour: '2-digit', hourCycle: 'h23' }).format(new Date(iso)));
  const hours = [...Array(24).keys()].filter(h => h >= 7 && h <= 23).map(h => {
    const its = items.filter(i => hourOf(i.at) === h).sort((a, b) => a.at.localeCompare(b.at)), fr = free.filter(f => hourOf(f.at) === h);
    return `<div class="hour"><b>${String(h).padStart(2, '0')}:00<br><small style="font-weight:500">${String((h + 6) % 24).padStart(2, '0')}:00 BE</small></b><div class="row">${its.map(i => card(i)).join('')}${fr.map(freeCard).join('')}</div></div>`;
  }).join('');
  const per = (ui.account ? ui.data.accounts.filter(a => a.short === ui.account) : ui.data.accounts).map(a => {
    const n = items.filter(i => i.account === a.short).length;
    return `<span class="chip ${n >= a.perDay ? 'full' : n === 0 ? 'none' : ''}">${esc(a.short)} ${n}/${a.perDay}</span>`;
  }).join('');
  const strip = [...items].sort((a, b) => a.at.localeCompare(b.at)).map(i => `<button data-item="${esc(i.id)}" style="background:#111"><video src="${i.media[0] || ''}#t=0.6" preload="metadata" muted playsinline style="width:100%;height:100%;object-fit:cover;border-radius:10px;pointer-events:none"></video><span>${hm(i.at)}</span></button>`).join('');
  const remix = items.filter(i => i.kind === 'remix').length;
  return `<div class="day"><div class="timeline">${hours}</div><aside class="summary">
    <h3>${esc(dayName(day, { weekday: 'long', day: 'numeric', month: 'long' }))}</h3><p>Ce qui sort ce jour-là, dans l’ordre (heure NY, Bruxelles en petit).</p>
    <div class="big"><div><b>${items.length}</b><span>Reels</span></div><div><b>${remix}</b><span>remix</span></div><div><b>${items.length - remix}</b><span>nouvelles</span></div></div>
    <div class="chips">${per}</div>
    <p><b>Le fil du jour</b> (clique pour voir le Reel)</p><div class="strip">${strip || '<span class="free-sum">Aucun Reel ce jour pour l’instant.</span>'}</div>
    ${free.length ? `<p style="margin-top:14px">${free.length} créneaux encore libres ce jour (clique sur un créneau pour y placer un Reel prêt).</p>` : ''}</aside></div>`;
}

function month() {
  const m = ui.anchor.slice(0, 7), today = ui.data.today;
  const head = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'].map(d => `<div class="mhead">${d}</div>`).join('');
  return `<div class="month">${head}${ui.data.days.map(day => {
    const items = visible().filter(i => i.day === day), free = freeVisible().filter(f => f.day === day).length;
    const mini = items.slice(0, 20).map(i => `<i class="${i.status === 'published' ? 'ok' : 'plan'}" style="background-color:${COLORS[i.account]}55"></i>`).join('');
    return `<button class="mcell ${day.slice(0, 7) !== m ? 'out' : ''} ${day === today ? 'today' : ''}" data-day="${day}"><span class="d">${Number(day.slice(8))}<small>${items.length ? items.length + ' Reels' : ''}</small></span>
      <span class="mini">${mini}</span>${free ? `<small style="color:var(--muted)">${free} libres</small>` : ''}</button>`;
  }).join('')}</div>`;
}

function render() {
  accountsPanel(); stats();
  const { days } = ui.data;
  $('#range').textContent = ui.view === 'day' ? dayName(days[0], { weekday: 'short', day: 'numeric', month: 'short' })
    : ui.view === 'week' ? `${Number(days[0].slice(8))} – ${dayName(days[6], { day: 'numeric', month: 'short' })}`
    : dayName(`${ui.anchor.slice(0, 7)}-15`, { month: 'long', year: 'numeric' });
  $('#title').innerHTML = ui.account ? hdl((ui.data.accounts.find(a => a.short === ui.account) || {}).handle.toUpperCase()) : 'CALENDRIER';
  document.querySelectorAll('.seg button').forEach(b => b.classList.toggle('on', b.dataset.view === ui.view));
  $('#board').innerHTML = ui.view === 'day' ? dayView() : ui.view === 'week' ? week() : month();
}

// créneaux libres des 10 prochains jours pour un compte (pour déplacer)
async function freeSlotsOf(account) {
  const d = await fetch(`/api/ig/calendar?start=${nyDay(new Date())}&days=10`).then(r => r.json());
  return d.free.filter(f => f.account === account);
}
const slotLabel = f => `${dayName(f.day, { weekday: 'short', day: 'numeric', month: 'short' })} ${hm(f.at)} NY (${hm(f.at, BE)} BE) · ${KIND[f.kind]}`;

// ---- aperçu façon Instagram ----
async function preview(id) {
  const i = ui.data.items.find(x => x.id === id); if (!i) return;
  const slots = i.status === 'scheduled' && !window.CAL ? await freeSlotsOf(i.account) : [];
  $('#preview-body').innerHTML = `<div class="pv"><div class="phone">${i.type === 'story' ? `<img src="${i.media[0]}">` : i.media[0] ? `<video src="${i.media[0]}" controls playsinline autoplay></video>` : '<div class="txt">vidéo absente</div>'}
      <div class="ui"><b>${av(i.account, 'md')}${hdl(i.handle)}</b><div class="cp">${esc(i.caption)}</div><div style="margin-top:6px">♫ Son original</div></div></div>
    <div class="info"><span class="badge ${esc(i.status)}">${esc(i.label)}</span> <span class="kind ${i.kind}">${KIND[i.kind]}</span><h3>${av(i.account, 'md')}${hdl(i.handle)}</h3><div class="sub">Reel · job ${esc(i.id)}</div>
      <div class="kv"><span>${i.status === 'published' ? 'Publié le' : 'Prévu le'}</span><b>${esc(dayName(i.day, { weekday: 'long', day: 'numeric', month: 'long' }))}</b>
        <span>Heure New York</span><b>${hm(i.at)}</b><span>Heure Bruxelles</span><b>${hm(i.at, BE)}</b>
        ${i.hook ? `<span>Hook</span><b>${esc(hookTxt(i.hook))}</b>` : ''}
        ${i.error ? `<span>Note</span><b>${esc(i.error)}</b>` : ''}
        ${i.url ? `<span>Lien</span><a class="iglink" href="${esc(i.url)}" target="_blank" rel="noopener">voir sur Instagram</a>` : ''}</div>
      ${i.status === 'scheduled' && !window.CAL ? `<div class="actions"><select id="mv">${slots.map(f => `<option value="${f.base}">${esc(slotLabel(f))}</option>`).join('')}</select><button class="btn" data-move="${i.id}">Déplacer ici</button><button class="btn red" data-unqueue="${i.id}">Retirer du calendrier</button></div><div class="msg" id="msg"></div>` : ''}
      <div class="actions">${i.type !== 'story' && i.media[0] ? `<a class="btn" href="${i.media[0]}" download="${esc(i.account)}-${esc(i.day)}-${esc(i.id)}.mp4">⬇ Télécharger la vidéo</a>` : ''}${i.caption ? `<button class="btn ghost" data-copy="${esc(i.id)}">📋 Copier la description</button>` : ''}<span class="copied" id="copied"></span></div>
      <div class="fullcap">${esc(i.caption)}</div></div></div>`;
  $('#preview').showModal();
}

// ---- placer un Reel prêt sur un créneau libre ----
function pickForSlot(account, base) {
  const f = ui.data.free.find(x => x.account === account && String(x.base) === String(base));
  const ready = ui.data.ready.filter(r => r.account === account);
  $('#preview-body').innerHTML = `<div class="pick"><h3>${hdl(ui.data.accounts.find(a => a.short === account).handle)} · ${f ? esc(slotLabel(f)) : ''}</h3>
    <p>${ready.length ? 'Choisis le Reel prêt à publier sur ce créneau.' : `Aucun Reel prêt pour ce compte. Ce créneau attend un${f && f.kind === 'new' ? 'e nouvelle vidéo' : ' remix'}.`}</p><div class="msg" id="msg"></div>
    ${ready.map(r => `<div class="opt"><video src="${r.media[0]}#t=0.6" preload="metadata" controls playsinline></video><small><span class="kind ${r.kind}">${KIND[r.kind]}</span> ${esc(hookTxt(r.hook))}</small><button class="btn" style="margin-top:6px;width:100%" data-place="${r.id}|${base}">Placer ici</button></div>`).join('')}</div>`;
  $('#preview').showModal();
}
function pickReady() {
  const ready = ui.data.ready.filter(r => !ui.account || r.account === ui.account);
  $('#preview-body').innerHTML = `<div class="pick"><h3>Prêts à placer</h3><p>Clique sur un créneau libre du compte dans le calendrier, ou mets le Reel au prochain créneau libre.</p><div class="msg" id="msg"></div>
    ${ready.map(r => `<div class="opt"><video src="${r.media[0]}#t=0.6" preload="metadata" controls playsinline></video><small><b>${esc(r.account)}</b> <span class="kind ${r.kind}">${KIND[r.kind]}</span> ${esc(hookTxt(r.hook))}</small><button class="btn" style="margin-top:6px;width:100%" data-next="${r.id}|${r.account}">Au prochain créneau libre</button></div>`).join('')}</div>`;
  $('#preview').showModal();
}
async function act(id, body, action) {
  const r = await api(`jobs/${id}/${action}`, body);
  if (r.error) { const m = $('#msg'); if (m) m.textContent = r.error; return; }
  $('#preview').close(); load();
}

document.addEventListener('click', async ev => {
  const t = ev.target;
  const cp = t.closest('[data-copy]'); if (cp) { const it = ui.data.items.find(x => x.id === cp.dataset.copy); const txt = it ? it.caption : ''; try { await navigator.clipboard.writeText(txt); } catch { const ta = document.createElement('textarea'); ta.value = txt; document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove(); } const m = document.getElementById('copied'); if (m) m.textContent = 'Copié ✓'; return; }
  const cam = t.closest('[data-cam]'); if (cam) { ev.stopPropagation(); ui.pfpFor = cam.dataset.cam; $('#pfp').click(); return; }
  if (t.closest('#anon')) { setAnon(!document.body.classList.contains('secret')); return; }
  const acc = t.closest('[data-account]'); if (acc) { ui.account = acc.dataset.account; render(); return; }
  const it = t.closest('[data-item]'); if (it) { preview(it.dataset.item); return; }
  const fr = !window.CAL && t.closest('[data-free]'); if (fr) { const [a, b] = fr.dataset.free.split('|'); pickForSlot(a, b); return; }
  if (t.closest('[data-ready]')) { pickReady(); return; }
  const pl = t.closest('[data-place]'); if (pl) { const [id, base] = pl.dataset.place.split('|'); act(id, { base: +base }, 'move'); return; }
  const nx = t.closest('[data-next]'); if (nx) { const [id, a] = nx.dataset.next.split('|'); const s = (await freeSlotsOf(a))[0]; if (!s) { $('#msg').textContent = 'Aucun créneau libre dans les 10 jours'; return; } act(id, { base: s.base }, 'move'); return; }
  const mv = t.closest('[data-move]'); if (mv) { act(mv.dataset.move, { base: +$('#mv').value }, 'move'); return; }
  const uq = t.closest('[data-unqueue]'); if (uq) { act(uq.dataset.unqueue, {}, 'unqueue'); return; }
  const v = t.closest('[data-view]'); if (v) { ui.view = v.dataset.view; load(); return; }
  const md = t.closest('[data-day]'); if (md) { ui.anchor = md.dataset.day; ui.view = 'day'; load(); return; }
  if (t.closest('#prev') || t.closest('#next')) {
    const dir = t.closest('#prev') ? -1 : 1;
    if (ui.view === 'day') ui.anchor = addDays(ui.anchor, dir);
    else if (ui.view === 'week') ui.anchor = addDays(ui.anchor, 7 * dir);
    else { const [y, m] = ui.anchor.split('-').map(Number); ui.anchor = new Date(Date.UTC(y, m - 1 + dir, 1)).toISOString().slice(0, 10); }
    load(); return;
  }
  if (t.closest('#today')) { ui.anchor = nyDay(new Date()); load(); return; }
  if (t.closest('#close')) $('#preview').close();
});
$('#preview').addEventListener('click', ev => { if (ev.target === $('#preview')) $('#preview').close(); });
$('#preview').addEventListener('close', () => { $('#preview-body').innerHTML = ''; render(); });
$('#pfp').addEventListener('change', async ev => {
  const f = ev.target.files[0]; ev.target.value = ''; if (!f || !ui.pfpFor) return;
  const r = await fetch('/api/avatar?account=' + encodeURIComponent(ui.pfpFor), { method: 'POST', body: f }).then(r => r.json()).catch(e => ({ error: e.message }));
  if (r.error) { alert(r.error); return; }
  ui.avv = Date.now(); render();
});
try { setAnon(sessionStorage.getItem('nox-anon') === '1'); } catch {}
(window.CAL ? Promise.resolve({json:()=>({})}) : fetch('/api/avatar-sync')).then(r => r.json()).then(() => { ui.avv = Date.now(); if (ui.data) render(); }).catch(() => {});
load(); setInterval(load, 20_000);
