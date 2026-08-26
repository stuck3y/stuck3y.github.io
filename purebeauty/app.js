/* ============================================================================
   PURE BEAUTY — app
   ----------------------------------------------------------------------------
   You shouldn't need to touch this file. All the content lives in data.js.

   What this does: reads data.js, builds an index of every service across every
   practitioner, and renders the pages. The whole point is that "who does this
   service?" is just a filter over one small list.
   ============================================================================ */

(function () {
  "use strict";

  /* --- little helpers ---------------------------------------------------- */

  const $ = (sel, root) => (root || document).querySelector(sel);
  const view = $("#view");

  /* Escape anything that came out of data.js before it hits the page, so a
     stray < or & in someone's bio can't break the layout. */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
  }

  const initials = (name) =>
    name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();


  /* --- the index --------------------------------------------------------- */
  /* Everything the site does is a filter over these three lists. */

  const ACTIVE = PROS.filter((p) => p.active !== false);

  /* Every service in the building, flattened, each one remembering who does it. */
  const ALL_SERVICES = ACTIVE.flatMap((pro) =>
    (pro.services || []).map((svc) => Object.assign({}, svc, { pro }))
  );

  const proById = (id) => ACTIVE.find((p) => p.id === id);
  const catById = (id) => CATEGORIES.find((c) => c.id === id);

  const servicesIn = (catId) => ALL_SERVICES.filter((s) => s.category === catId);

  /* Only show categories somebody actually offers — no dead-end buttons. */
  const liveCategories = () =>
    CATEGORIES.filter((c) => servicesIn(c.id).length > 0);

  const prosIn = (catId) => {
    const seen = new Set();
    return servicesIn(catId).filter((s) =>
      seen.has(s.pro.id) ? false : (seen.add(s.pro.id), true)
    ).map((s) => s.pro);
  };

  const categoriesFor = (pro) => {
    const ids = [...new Set((pro.services || []).map((s) => s.category))];
    return ids.map(catById).filter(Boolean);
  };


  /* --- booking hand-off -------------------------------------------------- */
  /* The one job this site has: get the customer to the right calendar fast.  */

  function bookLabel(pro) {
    return pro.booking.type === "online"
      ? "Book on " + (pro.booking.platform || "her site")
      : "Text to book";
  }

  /* Builds a text message with the service already written out, so booking with
     an always-full pro is still one tap. */
  function smsHref(pro, serviceName) {
    const body =
      "Hi " + pro.name.split(" ")[0] + "! I'd like to book " +
      (serviceName ? "a " + serviceName : "an appointment") +
      " — saw you on the Pure Beauty site.";
    const num = (pro.contact.phone || "").replace(/[^\d+]/g, "");
    return "sms:" + num + "?&body=" + encodeURIComponent(body);
  }

  /* A Book button. For online pros it's a plain link straight out to their
     platform. For contact-only pros it opens the text sheet. */
  function bookBtn(pro, serviceName, cls) {
    const klass = cls || "btn btn-primary";
    if (pro.booking.type === "online") {
      return '<a class="' + klass + '" href="' + esc(pro.booking.url) +
        '" target="_blank" rel="noopener">' + esc(bookLabel(pro)) + " &rarr;</a>";
    }
    return '<button class="' + klass + '" type="button" data-book="' + esc(pro.id) +
      '" data-service="' + esc(serviceName || "") + '">' + esc(bookLabel(pro)) + "</button>";
  }

  /* Compact Book button used on every row of the service menu. */
  function rowBookBtn(svc) {
    return bookBtn(svc.pro, svc.name, "btn btn-book");
  }

  function avatar(pro, size) {
    const cls = "avatar avatar-" + (size || "md");
    if (pro.photo) {
      return '<img class="' + cls + '" src="' + esc(pro.photo) + '" alt="' + esc(pro.name) + '" />';
    }
    return '<span class="' + cls + '" data-cat="' + esc((pro.services[0] || {}).category || "hair") +
      '">' + esc(initials(pro.name)) + "</span>";
  }


  /* --- reusable chunks --------------------------------------------------- */

  function categoryGrid() {
    return '<div class="cat-grid">' + liveCategories().map((c) =>
      '<a class="cat-card" href="#/services/' + esc(c.id) + '" data-cat="' + esc(c.id) + '">' +
        '<span class="cat-wash"></span>' +
        '<span class="cat-body">' +
          "<h3>" + esc(c.label) + "</h3>" +
          "<p>" + esc(c.blurb) + "</p>" +
          '<span class="cat-count">' + servicesIn(c.id).length + " services</span>" +
        "</span>" +
      "</a>"
    ).join("") + "</div>";
  }

  /* One line of the service menu: what it is, who does it, what it costs, book. */
  function serviceRow(svc, opts) {
    const showPro = !opts || opts.showPro !== false;
    return '<li class="svc-row">' +
      '<div class="svc-main">' +
        '<span class="svc-name">' + esc(svc.name) +
          (svc.popular ? ' <span class="tag-pop">Popular</span>' : "") +
        "</span>" +
        (showPro
          ? '<a class="svc-pro" href="#/pro/' + esc(svc.pro.id) + '">' +
              avatar(svc.pro, "xs") +
              "<span>" + esc(svc.pro.name) + ' <em>&middot; ' + esc(svc.pro.company) + "</em></span>" +
            "</a>"
          : "") +
      "</div>" +
      '<div class="svc-meta">' +
        '<span class="svc-price">' + esc(svc.price) + "</span>" +
        '<span class="svc-dur">' + esc(svc.duration) + "</span>" +
      "</div>" +
      rowBookBtn(svc) +
    "</li>";
  }

  function proCard(pro) {
    const cats = categoriesFor(pro).map((c) => c.label).join(" &middot; ");
    return '<a class="pro-card" href="#/pro/' + esc(pro.id) + '">' +
      avatar(pro, "lg") +
      '<h3>' + esc(pro.name) + "</h3>" +
      '<p class="pro-company">' + esc(pro.company) + "</p>" +
      '<p class="pro-cats">' + cats + "</p>" +
      '<span class="pro-link">View bio &amp; book &rarr;</span>' +
    "</a>";
  }


  /* --- pages ------------------------------------------------------------- */

  function viewHome() {
    const popular = ALL_SERVICES.filter((s) => s.popular).slice(0, 6);

    return (
      '<section class="hero">' +
        '<p class="eyebrow">' + esc(SALON.tagline) + "</p>" +
        "<h1>What are you looking<br />to get done?</h1>" +
        '<p class="hero-sub">' + esc(SALON.intro) + "</p>" +
        '<div class="search-wrap">' +
          '<input id="search" type="search" autocomplete="off" placeholder="Try &ldquo;brow wax&rdquo;, &ldquo;balayage&rdquo;, &ldquo;pedicure&rdquo;&hellip;" aria-label="Search services" />' +
          '<div id="results" class="results" hidden></div>' +
        "</div>" +
      "</section>" +

      '<section class="section">' + categoryGrid() + "</section>" +

      (popular.length
        ? '<section class="section">' +
            '<h2 class="section-title">Booked most this week</h2>' +
            '<ul class="svc-list">' + popular.map((s) => serviceRow(s)).join("") + "</ul>" +
          "</section>"
        : "") +

      '<section class="section">' +
        '<h2 class="section-title">Meet the talent</h2>' +
        '<p class="section-sub">Five women, five businesses, one roof. Every one of them owns her own studio.</p>' +
        '<div class="pro-grid">' + ACTIVE.map(proCard).join("") + "</div>" +
      "</section>" +

      '<section class="section about">' +
        '<h2 class="section-title">About Pure Beauty</h2>' +
        "<p>" + esc(SALON.story) + "</p>" +
        '<a class="btn btn-ghost" href="#/suites">Interested in a suite? &rarr;</a>' +
      "</section>"
    );
  }

  function viewServices(catId) {
    const cats = liveCategories();
    const active = catId && catById(catId) ? catId : null;
    const list = active ? servicesIn(active) : ALL_SERVICES;
    const cat = active ? catById(active) : null;

    const pills = '<div class="pills">' +
      '<a class="pill' + (active ? "" : " is-on") + '" href="#/services">Everything</a>' +
      cats.map((c) =>
        '<a class="pill' + (active === c.id ? " is-on" : "") + '" href="#/services/' + esc(c.id) + '">' +
          esc(c.label) + "</a>"
      ).join("") + "</div>";

    /* When you're inside one category, show who does it up front — that's the
       "and who's going to do the job" step from the sketch. */
    const who = active ? prosIn(active) : [];
    const whoDoesIt = active
      ? '<div class="who-row">' + who.map((p) =>
          '<a class="who-chip" href="#/pro/' + esc(p.id) + '">' + avatar(p, "xs") +
            "<span>" + esc(p.name.split(" ")[0]) + "</span></a>"
        ).join("") + "</div>"
      : "";

    /* If one woman does everything in this category, her name is already on the
       chip above — repeating it on all 11 rows is just noise. */
    const showPro = who.length !== 1;

    return (
      '<section class="page-head">' +
        '<p class="eyebrow">Services</p>' +
        "<h1>" + esc(cat ? cat.label : "Everything we do") + "</h1>" +
        "<p>" + esc(cat ? cat.blurb : "Every service offered by every studio at Pure Beauty.") + "</p>" +
      "</section>" +
      '<section class="section">' + pills + whoDoesIt +
        '<ul class="svc-list">' +
          list.map((s) => serviceRow(s, { showPro: showPro })).join("") +
        "</ul>" +
      "</section>"
    );
  }

  function viewTalent() {
    return (
      '<section class="page-head">' +
        '<p class="eyebrow">The Talent</p>' +
        "<h1>Five studios. One roof.</h1>" +
        "<p>Each of these women runs her own independent business inside Pure Beauty.</p>" +
      "</section>" +
      '<section class="section"><div class="pro-grid">' +
        ACTIVE.map(proCard).join("") +
      "</div></section>"
    );
  }

  function viewPro(id) {
    const pro = proById(id);
    if (!pro) return notFound();

    /* Her bio, rendered from the template fields so everyone's looks equally good. */
    const facts = [
      ["Experience", pro.yearsExperience + " years"],
      ["Licensed since", pro.licensedSince],
      ["Studio", pro.suite],
      pro.languages && pro.languages.length ? ["Speaks", pro.languages.join(", ")] : null,
      pro.contact.instagram ? ["Instagram", pro.contact.instagram] : null
    ].filter(Boolean);

    /* Her menu, grouped by category. */
    const byCat = categoriesFor(pro).map((c) => {
      const mine = (pro.services || [])
        .filter((s) => s.category === c.id)
        .map((s) => Object.assign({}, s, { pro }));
      return '<h3 class="menu-cat">' + esc(c.label) + "</h3>" +
        '<ul class="svc-list">' +
          mine.map((s) => serviceRow(s, { showPro: false })).join("") +
        "</ul>";
    }).join("");

    return (
      '<section class="pro-head">' +
        avatar(pro, "xl") +
        '<div class="pro-head-text">' +
          '<p class="eyebrow">' + esc(pro.company) + " &middot; " + esc(pro.suite) + "</p>" +
          "<h1>" + esc(pro.name) + "</h1>" +
          '<p class="pro-title">' + esc(pro.title) + "</p>" +
          '<div class="chips">' +
            (pro.specialties || []).map((s) => '<span class="chip">' + esc(s) + "</span>").join("") +
          "</div>" +
          '<div class="pro-cta">' +
            bookBtn(pro, "", "btn btn-primary btn-lg") +
            (pro.booking.note ? '<p class="cta-note">' + esc(pro.booking.note) + "</p>" : "") +
          "</div>" +
        "</div>" +
      "</section>" +

      '<section class="section">' +
        '<div class="bio-grid">' +
          '<div class="bio-about"><h2 class="section-title">About</h2><p>' + esc(pro.about) + "</p></div>" +
          '<dl class="bio-facts">' +
            facts.map(([k, v]) => "<div><dt>" + esc(k) + "</dt><dd>" + esc(v) + "</dd></div>").join("") +
          "</dl>" +
        "</div>" +
      "</section>" +

      '<section class="section">' +
        '<h2 class="section-title">' + esc(pro.name.split(" ")[0]) + "&rsquo;s menu</h2>" +
        byCat +
      "</section>" +

      '<div class="sticky-cta">' + bookBtn(pro, "", "btn btn-primary btn-block") + "</div>"
    );
  }

  function viewSuites() {
    const s = SALON.suites;
    const availability = s.available > 0
      ? s.available + (s.available === 1 ? " suite is" : " suites are") + " available right now"
      : "All suites are currently full — get on the waitlist";

    return (
      '<section class="page-head">' +
        '<p class="eyebrow">For Beauty Professionals</p>' +
        "<h1>Rent a suite at Pure Beauty</h1>" +
        "<p>Run your own business, keep your own book, and keep 100% of what you make.</p>" +
      "</section>" +

      '<section class="section">' +
        '<div class="avail-banner">' +
          "<strong>" + esc(availability) + "</strong>" +
          "<span>From " + esc(s.rateFrom) + " &middot; " + s.total + " suites total</span>" +
        "</div>" +
        '<h2 class="section-title">What&rsquo;s included</h2>' +
        '<ul class="check-list">' +
          s.includes.map((i) => "<li>" + esc(i) + "</li>").join("") +
        "</ul>" +
      "</section>" +

      '<section class="section">' +
        '<h2 class="section-title">Ask about availability</h2>' +
        '<form id="suite-form" class="form">' +
          '<label>Your name<input name="name" required autocomplete="name" /></label>' +
          '<label>Phone or email<input name="contact" required /></label>' +
          '<label>What do you do?<input name="craft" placeholder="Hair, lashes, nails, skin&hellip;" /></label>' +
          '<label>Anything else?<textarea name="notes" rows="3"></textarea></label>' +
          '<button class="btn btn-primary btn-lg" type="submit">Send inquiry</button>' +
          '<p class="form-note">Opens your email app with the message ready to send. ' +
            "Or just call <a href=\"tel:" + esc(SALON.phone.replace(/[^\d+]/g, "")) + '">' +
            esc(SALON.phone) + "</a>.</p>" +
        "</form>" +
      "</section>"
    );
  }

  function viewVisit() {
    const a = SALON.address;
    const tel = SALON.phone.replace(/[^\d+]/g, "");
    return (
      '<section class="page-head">' +
        '<p class="eyebrow">Visit</p>' +
        "<h1>Come see us</h1>" +
        "<p>" + esc(SALON.hoursNote) + "</p>" +
      "</section>" +
      '<section class="section">' +
        '<div class="visit-grid">' +
          "<div><h3>Address</h3><p>" + esc(a.line1) + "<br />" + esc(a.line2) + "</p>" +
            '<a class="btn btn-ghost" href="' + esc(a.mapUrl) + '" target="_blank" rel="noopener">Get directions &rarr;</a></div>' +
          "<div><h3>Phone</h3><p><a href=\"tel:" + esc(tel) + '">' + esc(SALON.phone) + "</a></p>" +
            "<h3>Email</h3><p><a href=\"mailto:" + esc(SALON.email) + '">' + esc(SALON.email) + "</a></p></div>" +
          "<div><h3>Hours</h3><p>" + esc(SALON.hoursNote) + "</p>" +
            "<h3>Parking</h3><p>" + esc(SALON.parkingNote) + "</p></div>" +
        "</div>" +
      "</section>"
    );
  }

  function notFound() {
    return '<section class="page-head"><h1>Page not found</h1>' +
      '<p><a class="btn btn-primary" href="#/">Back to the start</a></p></section>';
  }


  /* --- search ------------------------------------------------------------ */
  /* This is the fast path: type "brow", tap Book, you're on her calendar. */

  function runSearch(q) {
    const box = $("#results");
    if (!box) return;
    const term = q.trim().toLowerCase();

    if (term.length < 2) { box.hidden = true; box.innerHTML = ""; return; }

    /* Rank matters more than it looks. Someone typing "brow" wants Brow Wax,
       not every service by the woman whose specialty list mentions brows — so
       what she *does* outranks who she *is*. Lower score wins. */
    const score = (s) => {
      const name = s.name.toLowerCase();
      if (name.startsWith(term)) return 0;
      if (name.includes(term)) return 1;
      const cat = catById(s.category);
      if (cat && cat.label.toLowerCase().includes(term)) return 2;
      if (s.pro.name.toLowerCase().includes(term)) return 3;
      if (s.pro.company.toLowerCase().includes(term)) return 3;
      if ((s.pro.specialties || []).some((sp) => sp.toLowerCase().includes(term))) return 4;
      return Infinity;
    };

    const hits = ALL_SERVICES
      .map((s) => ({ s: s, r: score(s) }))
      .filter((h) => h.r !== Infinity)
      .sort((a, b) => a.r - b.r)
      .slice(0, 8)
      .map((h) => h.s);

    box.hidden = false;
    box.innerHTML = hits.length
      ? '<ul class="svc-list">' + hits.map((s) => serviceRow(s)).join("") + "</ul>"
      : '<p class="no-hits">Nothing matches &ldquo;' + esc(q) + '&rdquo; yet. ' +
        '<a href="#/services">Browse everything</a> instead?</p>';
  }


  /* --- the text-to-book sheet -------------------------------------------- */

  function openSheet(pro, serviceName) {
    const back = $("#sheet");
    $("#sheet-title").textContent = "Book with " + pro.name.split(" ")[0];
    $("#sheet-note").textContent =
      pro.booking.note || (pro.name + " takes bookings by text or phone.");
    $("#sheet-actions").innerHTML =
      '<a class="btn btn-primary btn-lg" href="' + esc(smsHref(pro, serviceName)) + '">' +
        "Text " + esc(pro.name.split(" ")[0]) + (serviceName ? " about " + esc(serviceName) : "") +
      "</a>" +
      '<a class="btn btn-ghost" href="tel:' + esc((pro.contact.phone || "").replace(/[^\d+]/g, "")) + '">' +
        "Call " + esc(pro.contact.phone) + "</a>";
    back.hidden = false;
    document.body.classList.add("locked");
  }

  function closeSheet() {
    $("#sheet").hidden = true;
    document.body.classList.remove("locked");
  }


  /* --- routing ----------------------------------------------------------- */

  function route() {
    const parts = (location.hash.replace(/^#\/?/, "") || "").split("/").filter(Boolean);
    const page = parts[0] || "home";
    let html;

    if (page === "home")          html = viewHome();
    else if (page === "services") html = viewServices(parts[1]);
    else if (page === "talent")   html = viewTalent();
    else if (page === "pro")      html = viewPro(parts[1]);
    else if (page === "suites")   html = viewSuites();
    else if (page === "visit")    html = viewVisit();
    else                          html = notFound();

    view.innerHTML = html;
    window.scrollTo(0, 0);

    document.querySelectorAll("[data-nav]").forEach((a) =>
      a.classList.toggle("is-on", a.dataset.nav === page)
    );

    const search = $("#search");
    if (search) search.addEventListener("input", (e) => runSearch(e.target.value));

    const form = $("#suite-form");
    if (form) form.addEventListener("submit", onSuiteInquiry);
  }

  /* No backend needed for the prototype — compose the email and hand it off. */
  function onSuiteInquiry(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    const body =
      "Name: " + (f.get("name") || "") + "\n" +
      "Contact: " + (f.get("contact") || "") + "\n" +
      "Does: " + (f.get("craft") || "") + "\n\n" +
      (f.get("notes") || "");
    location.href = "mailto:" + SALON.email +
      "?subject=" + encodeURIComponent("Suite inquiry — Pure Beauty") +
      "&body=" + encodeURIComponent(body);
  }


  /* --- chrome ------------------------------------------------------------ */

  function initChrome() {
    $("#year").textContent = new Date().getFullYear();
    $("#footer-tagline").textContent = SALON.tagline;

    const a = SALON.address;
    $("#footer-cols").innerHTML =
      "<div><h4>Visit</h4><p>" + esc(a.line1) + "<br />" + esc(a.line2) + "</p>" +
        '<p><a href="tel:' + esc(SALON.phone.replace(/[^\d+]/g, "")) + '">' + esc(SALON.phone) + "</a></p></div>" +
      "<div><h4>Browse</h4>" +
        '<p><a href="#/services">All services</a></p>' +
        '<p><a href="#/talent">The talent</a></p>' +
        '<p><a href="#/suites">Rent a suite</a></p></div>' +
      "<div><h4>Follow</h4>" +
        '<p><a href="' + esc(SALON.instagramUrl) + '" target="_blank" rel="noopener">' +
          esc(SALON.instagram) + "</a></p>" +
        '<p><a href="mailto:' + esc(SALON.email) + '">' + esc(SALON.email) + "</a></p></div>";

    if (SALON.demoMode) {
      const r = document.getElementById("demo-ribbon");
      r.hidden = false;
      r.querySelector("button").addEventListener("click", () => (r.hidden = true));
    }

    /* One delegated listener handles every text-to-book button on every page. */
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-book]");
      if (btn) {
        const pro = proById(btn.dataset.book);
        if (pro) openSheet(pro, btn.dataset.service);
        return;
      }
      if (e.target.closest(".sheet-close") || e.target.id === "sheet") closeSheet();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("#sheet").hidden) closeSheet();
    });
  }

  window.addEventListener("hashchange", route);
  initChrome();
  route();
})();
