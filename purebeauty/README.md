# Pure Beauty — working prototype

**Live:** https://www.jonsdata.com/purebeauty/

A working front-end for a salon-suite business: five independent pros under one
roof, each with her own company, her own services and her own booking platform.

The whole thing is four files and no build step. Open `index.html` in a browser
and it runs.

```
purebeauty/
  index.html    the shell — you'll rarely touch this
  data.js    ← THE WHOLE SITE LIVES HERE
  app.js        rendering + routing + search
  styles.css    colors and fonts are at the top
```

---

## The idea

The customer flow from the original sketch, unchanged:

> **Welcome to Pure Beauty → what are you trying to get done? → what service →
> who's going to do it → their availability**

The site is a **broker**, not a booking system. It never tries to run anyone's
calendar. It gets a customer from "my eyebrows need waxing" to the right
practitioner's existing booking platform in about two taps, then gets out of the
way.

Three ways in, all landing in the same place:

1. **Search** — type "brow", the matching service appears with a Book button
   next to it. Two taps from landing page to her calendar. This is the fast path.
2. **Category grid** — Hair, Lashes & Brows, Skin, Nails, Waxing… tap one, see
   every service in it and who does it.
3. **The talent** — browse the women first, book from her page.

---

## Editing it

Everything is in **`data.js`**, which is written to be edited by a person, not a
programmer. It's heavily commented. Three sections:

| Section      | What it holds                                             |
| ------------ | --------------------------------------------------------- |
| `SALON`      | address, phone, hours, the about-us story, suite rental info |
| `CATEGORIES` | the big buttons on the landing page                        |
| `PROS`       | one block per woman — her bio and every service she offers |

**Someone moves in:** copy any block inside `PROS`, paste it at the end, change
the values. She appears on the landing page, in the service menu, and gets her
own bio page automatically.

**Someone moves out:** delete her block, or set `active: false` to hide her
while keeping her info around.

Nothing else needs to change. The landing page, the category counts, the service
menu and the "who does this" lists are all computed from that one array.

---

## The two things worth pointing out

**1. Services belong to people, not to the salon.**
Each service sits inside a practitioner's block and tags a category. That's why
"who does this service?" is instant — it's a filter over one list. It's also
why adding a pro requires touching exactly one place.

**2. Not everyone wants an open calendar.**
Some pros are always full and don't want their schedule exposed — but they still
want the bio and the exposure. Set `booking.type: "contact"` instead of
`"online"` and the Book button becomes a pre-written text message to her, with
the service already typed in:

> *"Hi Marisol! I'd like to book a Brazilian Wax — saw you on the Pure Beauty site."*

She gets identical placement, an identical bio, and zero calendar exposure.
Marisol Vega in the sample data is set up this way — that's the pattern to copy.

**Bios are a template, not a blank box.** `yearsExperience`, `licensedSince`,
`specialties`, `about`. Everyone's page comes out looking equally good regardless
of who's the better writer, and nobody has to stare at an empty text field.

---

## Booking platforms

Everyone uses something different — Square, Vagaro, StyleSeat, Booksy,
GlossGenius. The site doesn't care. Each pro supplies one link and we hand off
to it.

Deliberately **not** doing: pulling live availability out of those platforms and
showing real open slots on this site. That means a real integration per platform,
each with its own API, auth and rate limits, plus keeping it all in sync — it's
the difference between a weekend and a project. The current design gets ~90% of
the "too easy to book" feeling for ~5% of the work. Worth revisiting later if
the handoff turns out to be the thing losing bookings.

---

## Before going live

- [ ] Set `demoMode: false` in `data.js` to hide the prototype ribbon.
- [ ] Replace all sample names, bios, prices and photos with the real ones.
- [ ] **Replace the placeholder phone numbers** — everything is `555-01xx`.
- [ ] Paste each pro's real booking link into `booking.url`.
- [ ] Drop headshots in this folder and set `photo: "hername.jpg"` (initials
      show until then).
- [ ] Real address and map link in `SALON.address`.

## Later, if it's worth it

- **Real photos** do more for a salon site than any other single change.
- **SEO** — this renders in the browser, which Google handles but doesn't love.
  If search traffic matters, the fix is pre-rendering a static page per
  practitioner. Not hard, just a step.
- **An onboarding form** so a new pro fills in her own bio, services and booking
  link instead of texting them over. That's when a small back end starts earning
  its keep.
- **Analytics** on which services get tapped — that tells you what the salon
  should advertise.
