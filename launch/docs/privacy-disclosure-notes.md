# IMCircle — Privacy Disclosure Notes (for Play Console Data Safety & App Store Privacy Nutrition Label)

These notes translate IMCircle's actual data handling (as implemented in
`backend/src/`) into the categories each store's privacy questionnaire asks
for. Fill the console forms using this as the source of truth — don't
guess at what's collected.

## Data collected
| Category | Collected? | Notes |
|---|---|---|
| Name | Yes | Profile name |
| Email address | Yes | Signup/login (email or phone-based, plus Google Sign-In) |
| Phone number | Yes | OTP-based signup/login via MSG91 |
| User IDs | Yes | Internal account ID |
| Profile photo / user photos | Yes | Avatar, post/journey/learning media — stored on Cloudinary |
| User-generated content | Yes | Posts, journey updates, comments, messages |
| Precise/approximate location | No | Not collected (Google Maps key present for a browser-restricted key, not used for user location tracking — confirm before submission if this changes) |
| Financial info | No | Not collected |
| Health/fitness | No | Not collected |
| Contacts | No | Not collected |
| Web browsing/app activity (analytics) | Yes | In-app product analytics events (`AnalyticsEvent` model) — used for product improvement, not ad targeting |
| Device or other identifiers | Minimal | Standard session/auth cookies only |

## Purpose of collection
Account creation and authentication, providing core app functionality (posts, journeys, messaging, circles), customer support (Report a Problem / Help & Support), and product analytics to improve the app. **Not used for advertising** — IMCircle has no ad SDK and does not sell data to third parties.

## Third-party data processors (name these explicitly — both stores require this)
- **Google** — Sign-In authentication, Google Maps JS API (browser-restricted key)
- **Cloudinary** — media (image/video) storage and CDN delivery
- **MSG91** — SMS OTP delivery for phone-based signup/login

## Encryption & security
- All traffic is HTTPS-only in production (`CLIENT_URL`/API enforced HTTPS; cookies are `secure`+`httpOnly`+`SameSite` in production per `backend/src/middleware/security.middleware.js`)
- Passwords are hashed (bcrypt); JWT access/refresh tokens are separate secrets from admin tokens

## Data deletion
Users can request deletion of their account and associated data at any time from **Settings → Account → Delete Account** (in-app, type-to-confirm flow). This satisfies both Play Console's and the App Store's requirement for an accessible, working in-app account-deletion path (not just a web form or support email).

## Content moderation & user safety controls (relevant to both stores' UGC policies)
- Report: available on any post, comment, or profile via the "⋯" menu
- Block: available from any profile or from Settings → Blocked Accounts; immediately hides content and prevents contact in both directions
- Community Guidelines: `/community-guidelines`, explains acceptable use, reporting, and moderation outcomes
- All content is tied to an authenticated account — no anonymous public posting

## Children's privacy
IMCircle's Terms of Service state a minimum age requirement (see `frontend/src/pages/settings/Terms.jsx`, section 2). The app is not directed at children and does not knowingly collect data from users below that age.

## Open item before submission
- [ ] [MANUAL / product decision] If launching in GDPR (EU) or CCPA (California) applicable regions, add a cookie/data-collection consent banner — currently the Privacy Policy discloses cookie/local-storage use but there is no runtime consent UI.
