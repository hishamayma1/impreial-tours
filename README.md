# Imperial Tours

Luxury Egypt travel platform built from the approved Stitch design
(`stitch/egypt-offers-carousel/`). One Next.js application serves both the public
site and the Payload CMS dashboard.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router, React 19, Server Components) |
| CMS + dashboard | Payload 3, mounted at `/admin` inside the same app |
| Database | MongoDB (Atlas) via `@payloadcms/db-mongodb` |
| Client state | Zustand (+ `persist`) |
| i18n | `next-intl` — English, Español, Deutsch |
| Styling | Tailwind CSS 3 with the design's tokens |

## Getting started

```bash
npm install
cp .env.example .env      # fill in DATABASE_URI and PAYLOAD_SECRET
npm run seed              # optional: loads the design's content in all 3 languages
npm run dev
```

- Site: http://localhost:3000 (`/en`, `/es`, `/de` — the locale prefix is always shown)
- Dashboard: http://localhost:3000/admin

**First run:** there is no seeded admin account. Open `/admin` and Payload will show
its "create first user" screen — whoever signs up there becomes the first
administrator, and can then invite the rest of the team under Settings → Users.

`npm run seed` **replaces** all content collections. It never touches users, bookings
or quote requests — those are people's data, not seed content.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `start` | Production build and serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run seed` | Reset and load demo content |
| `npm run generate:types` | Regenerate `src/types/payload-types.ts` after schema edits |
| `npm run generate:importmap` | Regenerate the admin import map after adding custom admin components |

Run the last two whenever you change `src/payload/**`.

## Architecture

```
src/
  app/
    (frontend)/[locale]/   Public site. Root layout per language.
    (payload)/             Admin panel, REST and GraphQL routes.
  payload.config.ts        Collections, globals, localization.
  payload/
    collections/           Services, Offers, Destinations, Testimonials,
                           Posts, Categories, Bookings, Media, Users
    globals/               HomePage, Header, Footer, SiteSettings
    access/                Role-based access rules
    hooks/                 Slug formatting, cache-tag revalidation
    seed/                  Demo content + design imagery
  lib/
    payload/client.ts      Cached local-API client
    payload/queries.ts     Cache-tagged, locale-aware reads
    payload/mappers.ts     CMS documents -> view models
    actions/booking.ts     Server action for the hero search
  components/
    ui/                    Button, Container, Icon, CmsImage, SectionHeading
    layout/                Header, Footer, switchers, mobile nav
    sections/              Hero, Services, Offers, Destinations,
                           Testimonials, Journal
  stores/                  Zustand: ui, search, preferences
  i18n/                    Routing, navigation, request config
messages/                  en.json, es.json, de.json
```

### Why it is laid out this way

**Components never touch CMS shapes.** `queries.ts` maps every Payload document into
a view model from `src/types/content.ts`. A schema change is absorbed in one folder
instead of rippling through the UI.

**Reads are cache-tagged, not time-based.** Each query is wrapped in `unstable_cache`
with the collection slug as its tag; Payload `afterChange` hooks call `revalidateTag`.
The public pages are fully static between edits and refresh immediately after one.
The one-hour `revalidate` is only a safety net.

**A database outage degrades, it does not 500.** A failed read logs loudly and returns
an empty fallback; sections with no content hide themselves and global copy falls back
to the translated defaults.

**CMS copy overrides translations.** Chrome that is never edited (button labels, ARIA
text) lives in `messages/*.json`. Editorial copy lives in Payload. Components resolve
`firstFilled(cmsValue, translation)`, so a blank CMS field is never a blank page.

**Locales have one source of truth.** `src/i18n/routing.ts` defines the locale list and
`payload.config.ts` derives its `localization.locales` from it. Adding a language means
editing one array and adding one `messages/*.json`.

**Server-first.** Only the search widget, offers carousel, testimonial switcher,
currency switcher, locale switcher and mobile nav are client components. First-load JS
is ~139 kB for the whole homepage.

### Adding a language

1. Add the code to `locales` and `localeLabels` in `src/i18n/routing.ts`.
2. Add `messages/<code>.json`.
3. `npm run generate:types`.

## Notes

- Media is stored on the local filesystem under `public/media/` (gitignored), so Next
  serves uploads as static files. Reads never touch Payload's `/api/media/file/` route,
  which boots the REST layer and runs access control once per image *and* once per size
  variant. Swap in `@payloadcms/storage-s3` or similar before deploying to serverless
  hosting.
- Emails are written to the server log unless `SMTP_PASS` is set. Add `EMAIL_PREVIEW=1`
  to route them through a throwaway ethereal.email inbox instead — that opens a test
  account over the network on every server boot, so leave it off by default.
- `atlas-credentials.env` holds live database credentials and is gitignored.
- Seeded imagery is downloaded from the Stitch design at seed time; `alt` text is
  authored in English and falls back for ES/DE until translated in the dashboard.
"# impreial-tours" 
