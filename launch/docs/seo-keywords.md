# IMCircle — SEO Keyword & Messaging Reference

## Brand
- Founder: Rishu Raj
- Tagline: The social network for people who grow.
- Mission: IMCircle is a growth-focused social network for students, creators, founders, professionals, freelancers, and ambitious people who want to build, learn, share journeys, find opportunities, and grow with the right circle.

## Founder story (canonical copy — reuse verbatim across SEO/about/store content)
Rishu Raj came from a small-town/village background and moved to Delhi with big dreams. He believes that a person's future is shaped by the people around them. Many young people in Bharat do not get the right environment, network, or exposure. IMCircle is built to give them a digital circle where they can find builders, learners, creators, founders, opportunities, journeys, and inspiration.

## Primary keyword themes
- IMCircle
- growth social network
- social network for students
- social network for founders
- social network for creators
- builder community
- startup community India
- entrepreneur network India
- learning journey platform
- career growth network
- opportunity network
- professional social network India
- find your circle
- grow together
- Bharat builders community
- student founder network
- creator founder community
- networking app India

## Where these are already applied
- `frontend/index.html` — <title>, meta description, meta keywords, Open Graph, Twitter Card, JSON-LD (Organization, WebSite, MobileApplication + founder Person).
- `frontend/src/hooks/useSEO.js` — per-route client-side title/description/OG updater, wired into Home, About, UserProfile, JourneyProfile, LearningView, CommunityGuidelines.
- `frontend/public/manifest.json` / vite-plugin-pwa manifest — name, short_name, description all use the tagline.
- `launch/docs/play-store-listing.md` and `app-store-listing.md` — full descriptions built around these themes.

## Per-page-type SEO guidance (for future pages / when adding SSR)

| Page type | Title pattern | Notes |
|---|---|---|
| Home | "IMCircle — The Social Network for People Who Grow" | Root domain, primary landing/OG target |
| User profile | "{Name} (@{username}) — IMCircle" | Use `og:type=profile`; profile tagline/bio as description |
| Journey | "{Journey title} — Journey — IMCircle" | Use `og:type=article`; journey cover image as OG image |
| Learning | "Learning — IMCircle" | Individual learning posts are ephemeral/short-form; keep generic unless a title field is added |
| Opportunity | "{Role} at {Org} — Opportunity — IMCircle" | Not yet a live route (feature-flagged off) — apply this pattern when it ships |
| About / Founder | "About & Founder Story — IMCircle" | Should always include the founder story copy above verbatim |
| Privacy Policy / Terms / Community Guidelines | "{Page name} — IMCircle" | Low priority for ranking, but must be crawlable (not behind auth) |

## Known structural limitation (read before promising ranking results)
IMCircle is a client-side-rendered SPA. `useSEO.js` updates `document.title` and meta tags correctly for real users and for browser tab titles, but search engine crawlers and social unfurl bots (Googlebot's first pass, Facebook/WhatsApp/Slack/Twitter link previews) largely do not execute JavaScript. A shared profile/journey/learning link will currently unfurl using only the generic tags in `index.html`, not the specific user/journey content. Fixing this requires either SSR/prerendering for public routes or a backend "unfurl" endpoint serving static OG tags to known bot user-agents — see `launch/docs/launch-checklist.md`.
