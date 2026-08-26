/* ============================================================================
   PURE BEAUTY — SITE DATA
   ----------------------------------------------------------------------------
   THIS FILE IS THE ENTIRE WEBSITE.

   Everything you see on the site is built from what's below. There is no
   database, no admin login, no monthly fee. When someone moves in or out, you
   edit this one file and the whole site updates itself — landing page, service
   menu, bios, booking buttons, all of it.

   THE THREE THINGS YOU'LL EVER EDIT:
     1. SALON     — address, phone, hours, the "about us" story.
     2. CATEGORIES— the big buttons on the landing page ("Hair", "Nails"...).
     3. PROS      — one entry per woman. Her bio + every service she offers.

   ADDING A NEW PRACTITIONER:
     Copy any block inside PROS from `{` to `},`, paste it at the end, and
     change the values. That's it. She appears on the landing page, in the
     service menu, and gets her own bio page automatically.

   REMOVING ONE:
     Delete her block. Or, to keep her info around for later, change
     `active: true` to `active: false` and she quietly disappears from the site.

   THE BOOKING RULE:
     Every woman uses a different booking site (Square, Vagaro, StyleSeat,
     Booksy, GlossGenius...). This site does NOT try to run anyone's calendar.
     It just hands the customer off to whatever platform she already uses, as
     fast as possible. You paste her booking link, we do the rest.

     For someone who is always full and does NOT want an open calendar, set
     `booking.type` to "contact" instead of "online". She keeps her bio and all
     the exposure, but customers get a pre-written text message instead of her
     schedule. (This is the setup for anyone like Heather.)
   ============================================================================ */


/* --- 1. THE SALON --------------------------------------------------------- */

const SALON = {
  /* Set this to false once real info is in and you're ready to go live.
     While true, a small "sample content" ribbon shows at the top. */
  demoMode: true,

  name: "Pure Beauty",
  tagline: "Five studios. One roof.",
  intro:
    "Pure Beauty is home to five independent beauty professionals — each running " +
    "her own studio, each an expert at her own craft. Hair, lashes, skin, nails, " +
    "waxing and more, all under one roof. Find what you're after, meet the woman " +
    "who does it, and book in about thirty seconds.",

  /* The "about us" section on the landing page. */
  story:
    "We built Pure Beauty for the kind of talent that doesn't fit in a chain salon " +
    "— women who've spent years getting great at one thing and wanted a place of " +
    "their own to do it. Everyone here owns her own business, sets her own hours " +
    "and keeps her own books. What they share is a building, a standard, and a " +
    "front door that's easy to walk through.",

  /* ⚠️ SAMPLE contact info — swap in the real details before sharing widely. */
  phone: "(360) 555-0142",
  email: "hello@purebeautysalon.com",
  address: {
    line1: "500 Main Street",
    line2: "Vancouver, WA 98660",
    mapUrl: "https://maps.google.com/?q=500+Main+Street+Vancouver+WA"
  },
  instagram: "@purebeauty",
  instagramUrl: "https://instagram.com/",

  /* In a suite salon everyone sets her own schedule, so we say so plainly
     instead of posting hours that aren't true for anybody. */
  hoursNote: "Hours vary by studio — each pro sets her own. Online booking is open 24/7.",
  parkingNote: "Free parking in the lot out front, plus street parking on Main.",

  /* Shown on the "Rent a Suite" page. */
  suites: {
    total: 6,
    available: 1,
    rateFrom: "$275/week",
    includes: [
      "Your own private, lockable suite",
      "24/7 keyed access — work the hours you want",
      "All utilities, wifi and laundry included",
      "Shared break room and client waiting area",
      "Free parking for you and your clients",
      "Your name on the door and a page on this website",
      "No commission, no split — you keep 100% of what you make"
    ]
  }
};


/* --- 2. THE CATEGORIES ---------------------------------------------------- */
/* These are the big buttons a customer taps first: "what are you trying to get
   done?" Every service below tags one of these ids. Add or rename freely —
   just keep the `id` matching what the services use.                          */

const CATEGORIES = [
  { id: "hair",    label: "Hair",             blurb: "Cuts, color, extensions & styling" },
  { id: "lashes",  label: "Lashes & Brows",   blurb: "Extensions, lifts, tints & shaping" },
  { id: "skin",    label: "Skin",             blurb: "Facials, peels & dermaplaning" },
  { id: "nails",   label: "Nails",            blurb: "Manicures, pedicures & enhancements" },
  { id: "waxing",  label: "Waxing",           blurb: "Face, body & Brazilian" },
  { id: "body",    label: "Massage & Body",   blurb: "Massage, spray tans & body treatments" },
  { id: "makeup",  label: "Makeup",           blurb: "Bridal, event & lessons" },
  { id: "pmu",     label: "Permanent Makeup", blurb: "Microblading, powder brows & lip blush" }
];


/* --- 3. THE PRACTITIONERS ------------------------------------------------- */
/*
   Every field explained:

     id          short nickname used in the web address. lowercase, no spaces.
     active      false hides her from the site without deleting anything.
     name        her name as customers should see it.
     company     her business name (each woman owns her own company).
     suite       which suite she's in.
     title       one short line: "Color Specialist", "Master Esthetician".

     BIO — a template, not a blank box. Fill each field and the page writes
     itself the same way for everyone, so nobody's bio looks better than
     anyone else's just because she's a better writer.
       yearsExperience   a number.
       licensedSince     the year.
       specialties       3–5 short phrases. These show as little tags.
       about             two or three sentences, in her voice.
       languages         optional.
       photo             a photo file name like "danielle.jpg" (drop the file in
                         this same folder). Leave "" and we draw her initials.

     BOOKING
       type      "online"  → big Book button straight to her booking site.
                 "contact" → she's full / doesn't want an open calendar. We show
                             a pre-written text message instead. Still gets the
                             full bio and every bit of exposure.
       platform  what her site is called — shown on the button ("Book on Vagaro").
       url       her actual booking link. THE most important field on this page.
       note      optional line under the button, e.g. how far out she's booked.

     SERVICES — everything she does. Each one shows up on the landing page under
     its category, with a Book button that goes straight to her platform.
       name, price, duration are free text — write them however she quotes them.
       category  must match a CATEGORIES id above.
       popular   true puts it in the "Booked most this week" row on the homepage.
*/

const PROS = [

  /* ---------------------------------------------------------------- HAIR -- */
  {
    id: "danielle",
    active: true,
    name: "Danielle Reyes",
    company: "Wildflower Hair Co.",
    suite: "Suite 1",
    title: "Color Specialist",

    yearsExperience: 12,
    licensedSince: 2013,
    specialties: ["Balayage", "Vivid color", "Curly cuts", "Color correction"],
    about:
      "I've been behind the chair for twelve years and I still think color is the " +
      "most fun thing you can do to a person's day. I take my time, I don't rush " +
      "a consultation, and I'd rather talk you out of something than send you home " +
      "with hair you don't love.",
    languages: ["English", "Spanish"],
    photo: "",

    booking: {
      type: "online",
      platform: "Vagaro",
      url: "https://www.vagaro.com/",
      note: ""
    },
    contact: { phone: "(360) 555-0143", instagram: "@wildflowerhairco" },

    services: [
      { name: "Women's Cut & Style",      price: "$65",       duration: "1 hr",     category: "hair" },
      { name: "Men's Cut",                price: "$40",       duration: "45 min",   category: "hair" },
      { name: "Curly Cut (dry)",          price: "$80",       duration: "1 hr 15",  category: "hair" },
      { name: "Balayage",                 price: "from $185", duration: "3 hr",     category: "hair", popular: true },
      { name: "Full Highlight",           price: "from $165", duration: "2 hr 30",  category: "hair" },
      { name: "Partial Highlight",        price: "from $120", duration: "2 hr",     category: "hair" },
      { name: "Root Touch-Up",            price: "$85",       duration: "1 hr 30",  category: "hair" },
      { name: "All-Over Color",           price: "$95",       duration: "2 hr",     category: "hair" },
      { name: "Vivid / Fashion Color",    price: "from $200", duration: "4 hr",     category: "hair" },
      { name: "Color Correction",         price: "Consult",   duration: "varies",   category: "hair" },
      { name: "Gloss & Tone",             price: "$55",       duration: "45 min",   category: "hair" },
      { name: "Blowout",                  price: "$45",       duration: "45 min",   category: "hair", popular: true },
      { name: "Special Occasion Style",   price: "$85",       duration: "1 hr",     category: "hair" },
      { name: "Keratin Smoothing",        price: "from $250", duration: "2 hr 30",  category: "hair" },
      { name: "Deep Conditioning Treatment", price: "$35",    duration: "30 min",   category: "hair" }
    ]
  },

  /* ------------------------------------------------ LASHES, BROWS & PMU -- */
  {
    id: "sofia",
    active: true,
    name: "Sofia Marchetti",
    company: "Lash Theory",
    suite: "Suite 2",
    title: "Lash Artist & PMU Artist",

    yearsExperience: 8,
    licensedSince: 2017,
    specialties: ["Volume lashes", "Brow lamination", "Microblading", "Bridal"],
    about:
      "Lashes and brows are the two things that make you look put together when " +
      "you've done absolutely nothing else — that's why I love them. I'm certified " +
      "in permanent makeup and I map every brow to your face before a single stroke.",
    languages: ["English"],
    photo: "",

    booking: {
      type: "online",
      platform: "GlossGenius",
      url: "https://glossgenius.com/",
      note: ""
    },
    contact: { phone: "(360) 555-0144", instagram: "@lashtheory" },

    services: [
      { name: "Classic Lash Full Set",     price: "$150",      duration: "2 hr",    category: "lashes", popular: true },
      { name: "Hybrid Lash Full Set",      price: "$175",      duration: "2 hr 15", category: "lashes" },
      { name: "Volume Lash Full Set",      price: "$200",      duration: "2 hr 30", category: "lashes" },
      { name: "Lash Fill (2–3 weeks)",     price: "$65",       duration: "1 hr",    category: "lashes" },
      { name: "Lash Lift & Tint",          price: "$95",       duration: "1 hr",    category: "lashes" },
      { name: "Lash Removal",              price: "$25",       duration: "30 min",  category: "lashes" },
      { name: "Brow Wax & Shape",          price: "$28",       duration: "20 min",  category: "lashes", popular: true },
      { name: "Brow Tint",                 price: "$25",       duration: "20 min",  category: "lashes" },
      { name: "Brow Lamination",           price: "$85",       duration: "1 hr",    category: "lashes" },
      { name: "Brow Lamination + Tint",    price: "$105",      duration: "1 hr 15", category: "lashes" },
      { name: "Microblading",              price: "from $450", duration: "2 hr 30", category: "pmu" },
      { name: "Powder Brows",              price: "from $475", duration: "3 hr",    category: "pmu" },
      { name: "Lip Blush",                 price: "from $425", duration: "2 hr 30", category: "pmu" },
      { name: "PMU Touch-Up (6–8 weeks)",  price: "$125",      duration: "1 hr 30", category: "pmu" },
      { name: "Event Makeup",              price: "$85",       duration: "1 hr",    category: "makeup" },
      { name: "Bridal Makeup (trial + day of)", price: "from $250", duration: "2 hr", category: "makeup" }
    ]
  },

  /* ---------------------------------------------------------------- SKIN -- */
  {
    id: "renee",
    active: true,
    name: "Renee Calloway",
    company: "The Glow Room",
    suite: "Suite 3",
    title: "Master Esthetician",

    yearsExperience: 15,
    licensedSince: 2010,
    specialties: ["Acne treatment", "Chemical peels", "Dermaplaning", "Sensitive skin"],
    about:
      "Fifteen years in and I've never met a skin type I couldn't work with. I do a " +
      "real analysis at every appointment instead of running the same facial on " +
      "everyone, and I'll always tell you honestly whether a treatment is worth your " +
      "money. Free consults, always.",
    languages: ["English"],
    photo: "",

    booking: {
      type: "online",
      platform: "Square",
      url: "https://squareup.com/appointments",
      note: ""
    },
    contact: { phone: "(360) 555-0145", instagram: "@theglowroom" },

    services: [
      { name: "Signature Facial",          price: "$95",       duration: "1 hr",    category: "skin", popular: true },
      { name: "Deep Cleansing Facial",     price: "$110",      duration: "1 hr 15", category: "skin" },
      { name: "Hydrating Glow Facial",     price: "$115",      duration: "1 hr 15", category: "skin" },
      { name: "Acne Treatment Facial",     price: "$105",      duration: "1 hr",    category: "skin" },
      { name: "Teen Facial",               price: "$70",       duration: "45 min",  category: "skin" },
      { name: "Back Facial",               price: "$95",       duration: "1 hr",    category: "skin" },
      { name: "Dermaplaning",              price: "$85",       duration: "45 min",  category: "skin" },
      { name: "Dermaplane + Facial",       price: "$145",      duration: "1 hr 30", category: "skin", popular: true },
      { name: "Chemical Peel",             price: "from $120", duration: "45 min",  category: "skin" },
      { name: "Microdermabrasion",         price: "$110",      duration: "1 hr",    category: "skin" },
      { name: "LED Light Therapy (add-on)", price: "$25",      duration: "20 min",  category: "skin" },
      { name: "Skincare Consultation",     price: "Free",      duration: "20 min",  category: "skin" }
    ]
  },

  /* --------------------------------------------------------------- NAILS -- */
  {
    id: "talia",
    active: true,
    name: "Talia Brooks",
    company: "Polished by Talia",
    suite: "Suite 4",
    title: "Nail Technician",

    yearsExperience: 6,
    licensedSince: 2019,
    specialties: ["Structured gel", "Nail art", "Spa pedicures", "Nail repair"],
    about:
      "I'm the person you come to when you want your nails to actually last. " +
      "Structured gel is my specialty and hand-painted art is my favorite part of " +
      "the job — bring me a screenshot and let's see what happens.",
    languages: ["English"],
    photo: "",

    booking: {
      type: "online",
      platform: "Booksy",
      url: "https://booksy.com/",
      note: ""
    },
    contact: { phone: "(360) 555-0146", instagram: "@polishedbytalia" },

    services: [
      { name: "Classic Manicure",       price: "$35",  duration: "45 min",   category: "nails" },
      { name: "Gel Manicure",           price: "$50",  duration: "1 hr",     category: "nails", popular: true },
      { name: "Builder Gel Overlay",    price: "$65",  duration: "1 hr 15",  category: "nails" },
      { name: "Acrylic Full Set",       price: "$75",  duration: "1 hr 30",  category: "nails" },
      { name: "Acrylic Fill",           price: "$55",  duration: "1 hr",     category: "nails" },
      { name: "Dip Powder",             price: "$60",  duration: "1 hr",     category: "nails" },
      { name: "Classic Pedicure",       price: "$50",  duration: "45 min",   category: "nails" },
      { name: "Deluxe Spa Pedicure",    price: "$70",  duration: "1 hr",     category: "nails", popular: true },
      { name: "Gel Pedicure",           price: "$65",  duration: "1 hr",     category: "nails" },
      { name: "Nail Art (per nail)",    price: "$5+",  duration: "5 min",    category: "nails" },
      { name: "Soak-Off & Removal",     price: "$20",  duration: "30 min",   category: "nails" },
      { name: "Paraffin Treatment (add-on)", price: "$15", duration: "15 min", category: "nails" }
    ]
  },

  /* ------------------------------------------------- WAXING, BODY & SPA -- */
  /*  ⭐ THIS IS THE "ALWAYS FULL, NO OPEN CALENDAR" SETUP.
      Note `booking.type: "contact"`. She gets the exact same bio, the same
      placement in the service menu and the same exposure as everyone else —
      but instead of showing her schedule, the button opens a text message to
      her with the service already typed in. Copy this pattern for anyone who
      doesn't want online booking.                                            */
  {
    id: "marisol",
    active: true,
    name: "Marisol Vega",
    company: "Smooth Studio",
    suite: "Suite 5",
    title: "Waxing Specialist & LMT",

    yearsExperience: 10,
    licensedSince: 2015,
    specialties: ["Brazilian wax", "Sugaring", "Deep tissue massage", "Spray tan"],
    about:
      "Fast, gentle, and absolutely no judgment — that's the whole promise. I've " +
      "been waxing for ten years and I'm also a licensed massage therapist, so I " +
      "can take care of a whole lot in one visit. Regulars get first pick of my " +
      "openings, so it's worth getting on the book.",
    languages: ["English", "Spanish"],
    photo: "",

    booking: {
      type: "contact",
      platform: "",
      url: "",
      note: "Marisol books by text and is usually 2–3 weeks out. She'll get back to you the same day."
    },
    contact: { phone: "(360) 555-0147", instagram: "@smoothstudio" },

    services: [
      { name: "Brazilian Wax",              price: "$65",       duration: "30 min",  category: "waxing", popular: true },
      { name: "Bikini Line",                price: "$40",       duration: "20 min",  category: "waxing" },
      { name: "Underarm Wax",               price: "$25",       duration: "15 min",  category: "waxing" },
      { name: "Lip or Chin",                price: "$15",       duration: "10 min",  category: "waxing" },
      { name: "Full Face Wax",              price: "$55",       duration: "30 min",  category: "waxing" },
      { name: "Half Leg",                   price: "$45",       duration: "30 min",  category: "waxing" },
      { name: "Full Leg Wax",               price: "$75",       duration: "45 min",  category: "waxing" },
      { name: "Full Arm",                   price: "$50",       duration: "30 min",  category: "waxing" },
      { name: "Back or Chest",              price: "$60",       duration: "30 min",  category: "waxing" },
      { name: "Full Body Wax",              price: "from $220", duration: "2 hr",    category: "waxing" },
      { name: "Sugaring — Brazilian",       price: "$75",       duration: "40 min",  category: "waxing" },
      { name: "60-Minute Relaxation Massage", price: "$95",     duration: "1 hr",    category: "body" },
      { name: "90-Minute Deep Tissue",      price: "$135",      duration: "1 hr 30", category: "body" },
      { name: "Spray Tan",                  price: "$45",       duration: "30 min",  category: "body" }
    ]
  }

];
