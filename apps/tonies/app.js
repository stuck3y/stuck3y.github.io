// Tonie Rental — a prototype for a play place that lends Tonies.
//
// Three views over one piece of state:
//   #catalog  what's on the shelf and what's out
//   #mine     a family looks up their rental by phone number
//   #admin    the front desk: check out, return, late fees, inventory, settings
//
// Everything lives in localStorage on this device. That's the prototype's one
// big lie: a real version needs a shared backend so the desk and the families
// see the same data.

(() => {
  'use strict';

  const DAY = 24 * 60 * 60 * 1000;
  const STORE = 'tonies:v1';
  const ME = 'tonies:me';

  // --- Dates & money -----------------------------------------------------

  const startOfDay = (ms) => new Date(ms).setHours(0, 0, 0, 0);
  const today = () => startOfDay(Date.now());
  const daysFromToday = (n) => today() + n * DAY;
  const daysBetween = (from, to) => Math.round((to - from) / DAY);

  const fmtDate = (ms) =>
    new Date(ms).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const money = (n) => '$' + n.toFixed(2);
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  const digits = (s) => String(s).replace(/\D/g, '').slice(-10);
  const fmtPhone = (d) => (d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : d);

  const uid = () => Math.random().toString(36).slice(2, 9);

  // --- State -------------------------------------------------------------

  function seed() {
    const tonies = [
      ['🦁', 'Lion Cub Adventures', 'Stories'],
      ['❄️', 'Snow Queen Sing-Along', 'Songs'],
      ['🚒', 'Fire Truck Rescue', 'Stories'],
      ['🦖', 'Dinosaur Facts', 'Learning'],
      ['🌙', 'Sleepy Time Lullabies', 'Bedtime'],
      ['🐷', 'Muddy Puddle Tales', 'Stories'],
      ['🚀', 'Space Explorers', 'Learning'],
      ['🧜‍♀️', 'Under the Sea Songs', 'Songs'],
      ['🐻', 'Honey Bear Stories', 'Bedtime'],
      ['🎸', 'Kids Dance Party', 'Songs'],
      ['📖', 'Bible Stories for Little Ones', 'Stories'],
      ['🔤', 'ABC & 123 Songs', 'Learning'],
    ].map(([emoji, name, series], i) => ({ id: 't' + i, emoji, name, series }));

    const members = [
      { id: 'm0', name: 'Carter family', phone: '6155550142' },
      { id: 'm1', name: 'Nguyen family', phone: '6155550187' },
      { id: 'm2', name: 'Brooks family', phone: '6155550119' },
    ];

    // Seeded relative to today so the demo always shows every situation.
    const rental = (tonieId, memberId, outDaysAgo, extra = {}) => ({
      id: uid(), tonieId, memberId,
      outAt: daysFromToday(-outDaysAgo),
      dueAt: daysFromToday(14 - outDaysAgo),
      returnedAt: null, renewed: false, fee: 0, feeStatus: 'none',
      ...extra,
    });

    const rentals = [
      rental('t0', 'm0', 4),                       // comfortably out
      rental('t4', 'm0', 12),                      // due in 2 days
      rental('t3', 'm1', 17),                      // 3 days late
      rental('t7', 'm2', 1),                       // just checked out
      rental('t9', 'm2', 24, {                     // came back late, fee unpaid
        returnedAt: daysFromToday(-5), fee: 5, feeStatus: 'owed',
      }),
    ];

    return {
      settings: { place: 'Your Play Place', days: 14, feePerDay: 1, feeCap: 15 },
      tonies, members, rentals,
    };
  }

  let state = sys.storage.get(STORE, null) || seed();
  const save = () => sys.storage.set(STORE, state);

  // --- Rules: the whole rental policy is these few functions --------------

  const daysLate = (r) => Math.max(0, daysBetween(r.dueAt, startOfDay(r.returnedAt ?? Date.now())));

  const lateFee = (r) => Math.min(state.settings.feeCap, daysLate(r) * state.settings.feePerDay);

  // What a rental costs right now: frozen once returned, accruing while out.
  const feeOf = (r) => (r.returnedAt ? (r.feeStatus === 'owed' ? r.fee : 0) : lateFee(r));

  const isOut = (r) => !r.returnedAt;
  const outRentals = () => state.rentals.filter(isOut).sort((a, b) => a.dueAt - b.dueAt);
  const owedRentals = () => state.rentals.filter((r) => r.feeStatus === 'owed');
  const rentalOf = (tonieId) => state.rentals.find((r) => r.tonieId === tonieId && isOut(r));
  const canRenew = (r) => isOut(r) && !r.renewed && daysLate(r) === 0;

  const tonie = (id) => state.tonies.find((t) => t.id === id) || { emoji: '🎧', name: 'Retired Tonie', series: '' };
  const member = (id) => state.members.find((m) => m.id === id);
  const memberByPhone = (phone) => state.members.find((m) => m.phone === digits(phone));

  function dueStatus(r) {
    const late = daysLate(r);
    const left = daysBetween(today(), r.dueAt);
    if (late > 0) return { tone: 'late', text: `${plural(late, 'day')} late · ${money(lateFee(r))} fee` };
    if (left === 0) return { tone: 'soon', text: 'Due today' };
    if (left <= 3) return { tone: 'soon', text: `Due ${fmtDate(r.dueAt)} · ${plural(left, 'day')} left` };
    return { tone: '', text: `Due ${fmtDate(r.dueAt)} · ${plural(left, 'day')} left` };
  }

  // --- Actions -----------------------------------------------------------

  const actions = {
    checkout({ name, phone, tonieId }) {
      const d = digits(phone);
      if (d.length < 10) return toast('Enter a 10-digit phone number');
      if (!tonieId || rentalOf(tonieId)) return toast('Pick an available Tonie');

      let m = memberByPhone(d);
      if (!m) {
        if (!name.trim()) return toast('New family — add a name');
        m = { id: uid(), name: name.trim(), phone: d };
        state.members.push(m);
      }
      state.rentals.push({
        id: uid(), tonieId, memberId: m.id,
        outAt: Date.now(), dueAt: daysFromToday(state.settings.days),
        returnedAt: null, renewed: false, fee: 0, feeStatus: 'none',
      });
      toast(`${tonie(tonieId).name} → ${m.name}`);
    },

    return({ id }) {
      const r = state.rentals.find((x) => x.id === id);
      r.returnedAt = Date.now();
      r.fee = lateFee(r);
      r.feeStatus = r.fee > 0 ? 'owed' : 'none';
      toast(r.fee > 0 ? `Returned · ${money(r.fee)} late fee added` : 'Returned. Back on the shelf.');
    },

    renew({ id }) {
      const r = state.rentals.find((x) => x.id === id);
      if (!canRenew(r)) return;
      r.dueAt += 7 * DAY;
      r.renewed = true;
      toast(`Renewed. Now due ${fmtDate(r.dueAt)}.`);
    },

    settle({ id, as }) {
      state.rentals.find((x) => x.id === id).feeStatus = as; // 'paid' | 'waived'
      toast(as === 'paid' ? 'Marked paid' : 'Fee waived');
    },

    addTonie({ emoji, name, series }) {
      if (!name.trim()) return toast('Give it a name');
      state.tonies.push({ id: uid(), emoji: emoji.trim() || '🎧', name: name.trim(), series: series.trim() });
      toast(`${name.trim()} added to the shelf`);
    },

    removeTonie({ id }) {
      if (rentalOf(id)) return toast("It's checked out. Return it first.");
      if (!confirm(`Remove “${tonie(id).name}” from the catalog?`)) return;
      state.tonies = state.tonies.filter((t) => t.id !== id);
    },

    settings({ place, days, feePerDay, feeCap }) {
      state.settings = {
        place: place.trim() || 'Your Play Place',
        days: Math.max(1, Math.round(+days) || 14),
        feePerDay: Math.max(0, +feePerDay || 0),
        feeCap: Math.max(0, +feeCap || 0),
      };
      toast('Settings saved');
    },

    reset() {
      if (!confirm('Reset to the sample data? Everything entered here is replaced.')) return;
      state = seed();
      sys.storage.remove(ME);
    },

    signIn({ phone }) {
      const m = memberByPhone(phone);
      if (!m) { signInError = "We couldn't find a rental under that number. Check with the front desk."; return; }
      signInError = '';
      sys.storage.set(ME, m.id);
    },

    signOut() { sys.storage.remove(ME); },
  };

  // --- Views -------------------------------------------------------------

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  // Template tag: arrays join, and a failed `cond && markup` renders nothing.
  const show = (v) => (Array.isArray(v) ? v.join('') : v === false || v == null ? '' : v);
  const html = (strings, ...values) => strings.reduce((out, s, i) => out + show(values[i - 1]) + s);

  let query = '';
  let signInError = '';

  const rentalRow = (r, { sub, actions = '' }) => html`
    <div class="row">
      <span class="emoji" aria-hidden="true">${tonie(r.tonieId).emoji}</span>
      <div class="body">
        <div class="title">${esc(tonie(r.tonieId).name)}</div>
        ${sub}
      </div>
      <div class="actions">${actions}</div>
    </div>`;

  const views = {
    catalog() {
      const q = query.trim().toLowerCase();
      const shown = state.tonies.filter((t) => (t.name + ' ' + t.series).toLowerCase().includes(q));
      const free = state.tonies.filter((t) => !rentalOf(t.id)).length;

      return html`
        <div class="page-head">
          <h2>Catalog</h2>
          <p>${free} of ${state.tonies.length} on the shelf. Borrow one for ${plural(state.settings.days, 'day')} at the front desk.</p>
        </div>
        <input class="search" type="search" placeholder="Search Tonies" aria-label="Search Tonies" data-search value="${esc(query)}" />
        <div class="grid" id="grid">${catalogCards(shown)}</div>`;
    },

    mine() {
      const me = member(sys.storage.get(ME, null));
      const { days, feePerDay, feeCap } = state.settings;

      if (!me) return html`
        <div class="page-head">
          <h2>My Rental</h2>
          <p>See what you've borrowed and when it's due back.</p>
        </div>
        <form class="card pad" data-form="signIn">
          <label>Phone number
            <input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="615-555-0142" required />
          </label>
          <button class="btn primary big" style="margin-top: var(--space-4)">Find my rental</button>
          ${signInError && `<p class="error">${esc(signInError)}</p>`}
          <p class="hint">Showing this off? <button type="button" data-action="signIn" data-phone="6155550142">Try the sample family</button></p>
        </form>
        <section>
          <h3>How it works</h3>
          <ul class="card pad steps">
            <li><b>Borrow</b> any Tonie on the shelf for ${plural(days, 'day')}.</li>
            <li><b>Renew</b> once from here for one more week.</li>
            <li><b>Late?</b> ${money(feePerDay)} a day, never more than ${money(feeCap)}.</li>
          </ul>
        </section>`;

      const mine = (r) => r.memberId === me.id;
      const out = outRentals().filter(mine);
      const balance = state.rentals.filter(mine).reduce((sum, r) => sum + feeOf(r), 0);

      return html`
        <div class="page-head hello">
          <div>
            <h2>Hi, ${esc(me.name)}</h2>
            <p>${out.length ? `You have ${plural(out.length, 'Tonie')} at home.` : 'Nothing checked out right now.'}</p>
          </div>
          <button class="btn quiet" data-action="signOut">Not you?</button>
        </div>

        ${balance > 0 && html`
          <div class="card pad balance" style="margin-bottom: var(--space-5)">
            <div>
              <strong>${money(balance)}</strong>
              <p>Late fees. Settle up at the front desk on your next visit.</p>
            </div>
          </div>`}

        <div class="card rows">
          ${out.length ? out.map((r) => {
            const s = dueStatus(r);
            return rentalRow(r, {
              sub: `<div class="sub ${s.tone === 'late' ? 'late' : ''}">${s.text}</div>`,
              actions: canRenew(r)
                ? `<button class="btn" data-action="renew" data-id="${r.id}">Renew 1 week</button>`
                : r.renewed ? '<span class="pill">Renewed</span>' : '',
            });
          }) : `<div class="empty">Come pick one out. <a href="#catalog">Browse the catalog</a></div>`}
        </div>`;
    },

    admin() {
      const out = outRentals();
      const overdue = out.filter((r) => daysLate(r) > 0);
      const owed = owedRentals();
      const owedTotal = owed.reduce((sum, r) => sum + r.fee, 0);
      const accruing = overdue.reduce((sum, r) => sum + lateFee(r), 0);
      const available = state.tonies.filter((t) => !rentalOf(t.id));
      const s = state.settings;

      return html`
        <div class="page-head">
          <h2>Front Desk</h2>
          <p>${fmtDate(Date.now())}</p>
        </div>

        <div class="stats">
          <div class="card stat"><span>Out now</span><strong>${out.length}</strong></div>
          <div class="card stat ${overdue.length ? 'alert' : ''}"><span>Overdue</span><strong>${overdue.length}</strong></div>
          <div class="card stat"><span>Fees owed</span><strong>${money(owedTotal)}</strong></div>
        </div>

        <section>
          <h3>Check out</h3>
          <form class="card pad form" data-form="checkout">
            <label>Phone
              <input name="phone" type="tel" inputmode="tel" list="families" placeholder="615-555-0142" required />
            </label>
            <label>Family name
              <input name="name" placeholder="Only if they're new" />
            </label>
            <label>Tonie
              <select name="tonieId" required>
                <option value="">${available.length ? 'Choose…' : 'Nothing on the shelf'}</option>
                ${available.map((t) => `<option value="${t.id}">${t.emoji} ${esc(t.name)}</option>`)}
              </select>
            </label>
            <button class="btn primary">Check out</button>
            <datalist id="families">
              ${state.members.map((m) => `<option value="${fmtPhone(m.phone)}">${esc(m.name)}</option>`)}
            </datalist>
          </form>
        </section>

        <section>
          <h3>Out now</h3>
          <div class="card rows">
            ${out.length ? out.map((r) => {
              const st = dueStatus(r);
              const m = member(r.memberId);
              return rentalRow(r, {
                sub: `<div class="sub">${esc(m.name)} · ${fmtPhone(m.phone)}</div>
                      <div class="sub ${st.tone === 'late' ? 'late' : ''}">${st.text}${r.renewed ? ' · renewed' : ''}</div>`,
                actions: `<button class="btn primary" data-action="return" data-id="${r.id}">Return</button>`,
              });
            }) : '<div class="empty">Every Tonie is home.</div>'}
          </div>
          ${accruing > 0 && `<p class="footnote">${money(accruing)} in late fees is still accruing. It's added to the family's balance when the Tonie comes back.</p>`}
        </section>

        <section>
          <h3>Late fees to collect</h3>
          <div class="card rows">
            ${owed.length ? owed.map((r) => rentalRow(r, {
              sub: `<div class="sub">${esc(member(r.memberId).name)} · ${plural(daysLate(r), 'day')} late · returned ${fmtDate(r.returnedAt)}</div>
                    <div class="sub late">${money(r.fee)} owed</div>`,
              actions: `<button class="btn" data-action="settle" data-as="waived" data-id="${r.id}">Waive</button>
                        <button class="btn primary" data-action="settle" data-as="paid" data-id="${r.id}">Paid</button>`,
            })) : '<div class="empty">Nobody owes anything.</div>'}
          </div>
        </section>

        <section>
          <h3>Inventory</h3>
          <div class="card rows">
            ${state.tonies.map((t) => html`
              <div class="row">
                <span class="emoji" aria-hidden="true">${t.emoji}</span>
                <div class="body">
                  <div class="title">${esc(t.name)}</div>
                  <div class="sub">${esc(t.series)}</div>
                </div>
                <div class="actions">
                  ${rentalOf(t.id)
                    ? '<span class="pill">Out</span>'
                    : `<button class="btn quiet" data-action="removeTonie" data-id="${t.id}">Remove</button>`}
                </div>
              </div>`)}
          </div>
          <form class="card pad form" data-form="addTonie" style="margin-top: var(--space-3)">
            <label>Emoji <input name="emoji" maxlength="8" placeholder="🎧" /></label>
            <label>Name <input name="name" placeholder="New Tonie" required /></label>
            <label>Shelf <input name="series" placeholder="Stories, Songs…" /></label>
            <button class="btn">Add Tonie</button>
          </form>
        </section>

        <section>
          <h3>Rental rules</h3>
          <form class="card pad form" data-form="settings">
            <label>Play place name <input name="place" value="${esc(s.place)}" /></label>
            <label>Rental length (days) <input name="days" type="number" min="1" value="${s.days}" /></label>
            <label>Late fee per day ($) <input name="feePerDay" type="number" min="0" step="0.25" value="${s.feePerDay}" /></label>
            <label>Most a fee can reach ($) <input name="feeCap" type="number" min="0" step="1" value="${s.feeCap}" /></label>
            <button class="btn primary">Save</button>
          </form>
          <p class="footnote">Prototype: data stays in this browser. <button class="btn quiet" data-action="reset">Reset sample data</button></p>
        </section>`;
    },
  };

  function catalogCards(tonies) {
    if (!tonies.length) return '<p class="empty">No Tonies match that search.</p>';
    return tonies.map((t) => {
      const r = rentalOf(t.id);
      return html`
        <article class="card tonie ${r ? 'out' : ''}">
          <div class="art" aria-hidden="true">${t.emoji}</div>
          <h4>${esc(t.name)}</h4>
          <small>${esc(t.series)}</small>
          ${!r ? '<span class="pill ok">Available</span>'
            : `<span class="pill">${daysLate(r) ? 'Checked out' : `Back by ${fmtDate(r.dueAt)}`}</span>`}
        </article>`;
    }).join('');
  }

  // --- Shell: routing, rendering, events ---------------------------------

  const view = document.getElementById('view');
  const route = () => (views[location.hash.slice(1)] ? location.hash.slice(1) : 'catalog');

  function render() {
    const name = route();
    document.getElementById('place').textContent = state.settings.place;
    document.querySelectorAll('.tabs a').forEach((a) =>
      a.dataset.tab === name ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
    view.className = name === 'mine' ? 'narrow' : '';
    view.innerHTML = views[name]();
  }

  function run(name, payload) {
    actions[name](payload);
    save();
    render();
  }

  view.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (el) run(el.dataset.action, { ...el.dataset });
  });

  view.addEventListener('submit', (e) => {
    e.preventDefault();
    run(e.target.dataset.form, Object.fromEntries(new FormData(e.target)));
  });

  // Search re-renders only the grid, so the field keeps focus while typing.
  view.addEventListener('input', (e) => {
    if (!e.target.matches('[data-search]')) return;
    query = e.target.value;
    const q = query.trim().toLowerCase();
    document.getElementById('grid').innerHTML =
      catalogCards(state.tonies.filter((t) => (t.name + ' ' + t.series).toLowerCase().includes(q)));
  });

  let toastTimer;
  function toast(text) {
    const el = document.getElementById('toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  window.addEventListener('hashchange', () => { signInError = ''; render(); window.scrollTo(0, 0); });
  sys.theme.init();
  render();
})();
