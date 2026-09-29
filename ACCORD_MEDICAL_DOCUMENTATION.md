# Accord Medical Supplies — Website Rebuild Documentation

**Prepared:** September 2026
**Source site:** https://accordmedical.co.ke/
**Status of source data:** Compiled from the live site's indexed pages (Google cache/search snippets — the
live site currently blocks automated crawling via `robots.txt`, so pages were reconstructed from search
index content, the site's own social profiles, and business directories) plus company social/listing
profiles. Anything marked **[VERIFY]** should be confirmed directly with the company before publishing,
since it was not visible in the crawlable snippets.

---

## 1. Company Profile (as found)

| Field | Value |
|---|---|
| Legal/trading name | Accord Medical Supplies Ltd |
| Tagline | "Enabling Healthcare Delivery." |
| Founded | 2014 — over 10 years in the Kenyan market |
| Business type | Importer, distributor and accredited dealer of medical equipment (not a manufacturer — the site copy on ZoomInfo mislabels the industry as "Manufacturing"; the company's own language throughout is "accredited dealers" / "reseller") |
| Market served | Kenya and Uganda (per Instagram bio: "Scope: KE and UG market") |
| Specialties | Theatre equipment, laboratory equipment & reagents, dental equipment, maternity/delivery, renal/hemodialysis equipment, diagnostics & imaging, ICU/critical care, cold-chain, hospital furniture & linen, consumables & PPE |
| Services | Procurement, expert consultation, installation, calibration, preventive maintenance, commissioning, staff training, after-sales support, warranty, equipment financing assistance |

### Locations
Two addresses are used across the site/listings — likely **office/showroom** vs **warehouse**:

- **Office / Sales (front-of-house):** Commerce House, 3rd Floor, Room 308–309, Moi Avenue, Nairobi, 00200, Kenya
- **Warehouse:** Unicorn Sales & Services Godowns, Warehouse No. 16, Baba Dogo Road, Nairobi, Kenya

**[VERIFY]** Which is the primary public-facing address for the "Contact Us" page and Google Maps embed — recommend confirming with the client before launch, and get exact GPS coordinates for the map embed.

### Contact details
| Channel | Value |
|---|---|
| Phone / WhatsApp (primary) | +254 729 115000 |
| Phone (secondary) | +254 700 672600 |
| Email (sales) | sales@accordmedical.co.ke |
| Email (general/info) | info@accordmedical.co.ke |
| Website | https://accordmedical.co.ke |
| Facebook | facebook.com/AccordMedKe ("Accordmedicalke") |
| X / Twitter | x.com/AccordMedKe (@AccordMedKe) |
| Instagram | instagram.com/accordmedicalke (@accordmedicalke) |
| LinkedIn | ke.linkedin.com/company/accord-medical-supplies-ltd |

### Customer testimonial themes (for a Testimonials section)
- Reliable after-sales support after equipment breakdown (haematology analyzer example, ~18 months post-purchase)
- Long-term product durability (dental chair still performing after 3+ years)

---

## 2. Current Site — Platform & URL / SEO Structure

The existing site runs on **WordPress + WooCommerce**, with what looks like the "Flatsome" or a similar
WooCommerce theme (Wishlist, Compare, Quick View, cart widget, "Categories" mega-menu). Detected stack
signals: WooCommerce, Slider Revolution, Facebook Conversion Tracking pixel, hosted on Hetzner behind
Sectigo SSL.

To **preserve SEO equity** (rankings, backlinks, indexed snippets), the rebuild must keep the same URL
patterns and 301-redirect any that change. Confirmed URL patterns from indexed pages:

| Pattern | Example | Purpose |
|---|---|---|
| `/` | https://accordmedical.co.ke/ | Home |
| `/about-us/` | | About page |
| `/products` or `/products/` | https://accordmedical.co.ke/products | Shop / product archive |
| `/product/{slug}/` | `/product/aft-800-electrolyte-analyzer/` | Single product page |
| `/product-category/{cat}/{sub}/` | `/product-category/sterilizer-autoclave/washer-disinfector/` | Nested product category (WooCommerce hierarchical categories) |
| `/category/{slug}` | `/category/cold-chain`, `/category/medical-training-materials` | Older/alternate category taxonomy — appears to be a second, flatter taxonomy in parallel with `/product-category/` |
| `/product-tag/{tag}/` | `/product-tag/medical/` | Product tag archive |
| `/contact-us/` | | Contact page |
| `/news` | | Blog/news listing |
| `/jobs` | | Careers |

### Known product categories (partial list observed)
Diagnostic Equipment (Audiometer, Bone Densitometer, ECG Machine, Examination Lamp, Holter ECG & Stress
ECG, Ophthalmic Ultrasound, Pulse Oximeter, Spirometer, Ultrasound Scanner, Vein Finder) · Hemodialysis
Equipment (Dialysis Chair, Dialysis Consumables, Dialyzer Reprocessing Machine, Hemodiafiltration
Machine, Hemodialysis Machine, R.O Water Purification Machine) · Hospital Furniture (Appliance Cupboard,
Bedside Cabinet, Chairs, Child Bed, Electric Hospital Bed) · Sterilizer/Autoclave (Washer Disinfector) ·
Dental Equipment · Laboratory Equipment · Laboratory Consumables & Reagents · In-Vitro Diagnostic ·
Medical Equipment · Medical Consumables · Medical Human Model · Miscellaneous Products · Hospital Linen ·
Home Care Equipment · Cold Chain · Medical Training Materials

**Recommendation:** run a full crawl (Screaming Frog or `sitemap.xml` pull) once you have direct/authenticated
access to the site or hosting, to get the complete, exhaustive list of product slugs and category slugs
before go-live, and export Google Search Console's "top pages" report so the redirect map below is complete.
This document gives you the rebuild architecture to slot that data into.

### Redirect strategy for the rebuild
1. Keep `/product/[slug]` and `/product-category/[...slug]` exactly as-is in the new site's routing.
2. Add a `RedirectMap` table (see schema) so any legacy `/category/{slug}` URL 301s to the matching
   `/product-category/{slug}` URL without a code deploy.
3. Regenerate and submit a fresh `sitemap.xml` on launch day, and keep the old one live at its existing
   path returning 410/301s for a transition period.
4. Preserve exact page titles/meta descriptions for top-ranking pages where possible.

---

## 3. New Site — Feature Specification

In addition to recreating the existing structure (home, about, products/shop, product detail, nested
categories, contact), the rebuild adds:

### 3.1 Product Catalogue Upload / Download with Analytics
- Each **Product** (or **Category**) can have one or more **Catalogue** files (PDF/brochure) attached in
  the admin panel.
- Public product page shows a **"Download Catalogue"** button.
- Every click is logged (`CatalogueDownload`: catalogue id, product id, timestamp, IP hash, referrer,
  optional lead fields) before redirecting to the actual file — this is what powers the analytics.
- Admin dashboard shows: total downloads, downloads over time (chart), most-downloaded catalogues/products,
  and per-catalogue download counts, exportable to CSV.

### 3.2 Recent Installations (blog-style)
- New content type **Installation**: title, slug, cover photo/gallery, facility name, location, equipment
  installed (linked to Product/Category), narrative body (rich text), publish date.
- Public route: `/installations` (grid) and `/installations/[slug]` (detail) — functions as a
  project/case-study blog.
- Fully admin-editable (create/edit/delete/draft-publish).

### 3.3 Manufacturer Portal
- Public **"Become a Supplier / Manufacturer"** page explaining Accord is a reseller and inviting
  manufacturers to list products.
- Manufacturers can register and submit products for review via a lightweight portal
  (`/manufacturers/apply`, `/manufacturer/dashboard` once approved).
- Admin reviews/approves submissions before they appear as live Products, and can tag each product with
  its source Manufacturer (shown on the product page, e.g. "Distributed for: [Manufacturer]").

### 3.4 Offers
- New content type **Offer**: title, description, discount/price info, product(s) linked, start/end
  date, banner image.
- Public `/offers` page + optional homepage banner/carousel of active offers.
- Admin CRUD with scheduling (auto-expire past `endDate`).

### 3.5 Events
- New content type **Event**: title, description, date/time, location, cover image, optional
  registration link.
- Public `/events` page (upcoming + past).
- **Admin-only** create/upload and delete, as requested — no public submission.

### 3.6 Admin Area
Role-gated `/admin` dashboard (NextAuth-based) covering:
- Products & Categories (create/edit/delete, nested categories, image gallery, specs, price, linked catalogue)
- Catalogue library + download analytics
- Installations (blog CRUD)
- Manufacturers (approve/reject submissions, manage manufacturer accounts)
- Offers (CRUD + scheduling)
- Events (CRUD)
- Redirect map (manage legacy URL redirects)
- Basic site settings (contact info, social links, homepage banners)

---

## 4. Information Architecture / Sitemap (new site)

```
/                              Home
/about-us                      About
/products                      Product listing (filter by category, search)
/product/[slug]                Product detail (+ "Download catalogue" button)
/product-category/[...slug]    Nested category archive (matches legacy structure)
/contact-us                    Contact (map, form, phones, emails)
/installations                 Recent installations — list
/installations/[slug]          Installation detail
/manufacturers                 Manufacturer showcase + "apply" CTA
/manufacturers/apply            Manufacturer registration/product submission
/offers                        Current offers
/events                        Events list (upcoming/past)
/news                          General news/blog (kept from legacy site)
/jobs                          Careers (kept from legacy site)

/admin                         Admin dashboard (auth-gated)
/admin/products, /admin/categories, /admin/catalogues, /admin/catalogues/analytics
/admin/installations, /admin/manufacturers, /admin/offers, /admin/events, /admin/redirects, /admin/settings

/api/catalogues/[id]/download  Logs a download then streams/redirects to the file
/api/admin/...                 Authenticated CRUD endpoints backing the admin UI
```

---

## 5. Suggested Tech Stack

- **Framework:** Next.js 14 (App Router) + TypeScript — SSR/ISR for SEO-critical product & category pages
- **Styling:** Tailwind CSS
- **Database/ORM:** PostgreSQL + Prisma
- **Auth:** NextAuth.js (credentials for admin/manufacturer roles)
- **File storage:** S3-compatible bucket (or local `/uploads` in dev) for catalogues and images
- **Charts (analytics):** Recharts, on an admin-only page
- **Hosting:** Any Node-capable host; current site is on Hetzner, so a Hetzner VPS or a managed Node host both work

This is reflected in the scaffold delivered alongside this document — see `README.md` for setup.

---

## 6. Data Model Summary

See `prisma/schema.prisma` for the authoritative version. Core entities: `Category` (self-referential,
mirrors nested `/product-category/`), `Product`, `Catalogue`, `CatalogueDownload`, `Installation`,
`Manufacturer`, `ManufacturerSubmission`, `Offer`, `Event`, `AdminUser`, `RedirectMap`.

---

## 7. Open Items to Confirm With the Client Before Launch
1. Which physical address (Moi Avenue office vs Baba Dogo warehouse) is the canonical public address —
   and exact GPS coordinates for the map.
2. Full, authoritative export of every existing product (name, SKU, price, category, images, spec sheet)
   and every existing category/slug — ideally a WooCommerce CSV export or database access, since search
   snippets only surfaced a sample.
3. Whether prices should be public (legacy site showed `KShs` prices on some products) or quote-only.
4. Manufacturer approval workflow — who signs off on submitted products before they go live.
5. Brand assets (logo files, product photography) — not addressed here per your instruction to skip colors,
   but files will still be needed for launch.
