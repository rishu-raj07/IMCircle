# IMCircle — MSG91 OTP Setup (Backend-Only)

## Where the logic lives

All MSG91 SMS OTP logic runs on the backend only, in
`backend/src/services/msg91.service.js`, called from
`backend/src/controllers/auth.controller.js` (`sendMobileOtp` /
`verifyMobileOtp`). The frontend never talks to MSG91 directly and never
sees your `MSG91_AUTH_KEY`.

Two files exist as empty stubs and are currently unused —
`backend/src/services/otp.service.js` and `backend/src/utils/otp.js`. They
were checked via grep and nothing imports them; the real OTP logic lives
in `msg91.service.js` as described above. They're left as-is rather than
populated, so as not to create a second, parallel OTP code path — if you
want to consolidate later, that's a deliberate refactor, not something to
do silently.

## Hardening applied this session

- **`sendMobileOtp` no longer echoes MSG91's raw response to the client**, even in development. It's logged server-side only (`console.log` gated on `NODE_ENV === "development"`); the client response is just `{ success: true, message: "OTP sent successfully" }`.
- **`verifyMobileOtp` no longer forwards MSG91's internal error message** to the client on a failed/invalid OTP. It logs the full MSG91 response server-side (`console.warn`) and returns a generic `"Invalid or expired OTP"` instead.
- **OTP expiry is configurable** via `MSG91_OTP_EXPIRY_MINUTES` (falls back to the older `MSG91_OTP_EXPIRY` name if that's what you already have set, defaults to 5 minutes if neither is set).
- **Optional sender ID** via `MSG91_SENDER_ID` — only included in the MSG91 request if you set it; many OTP routes don't need one.
- **Rate limiting / resend cooldown**: already adequate as-is via `backend/src/middleware/rateLimit.middleware.js`'s `otpLimiter` / `otpVerifyLimiter` — reviewed, no changes needed.
- **Mobile number validation**: already safe — `/^[6-9]\d{9}$/` (Indian 10-digit mobile format) is applied before any MSG91 call.
- **No OTP value is ever logged in production** — the SMS OTP flow's actual code is generated and held by MSG91, never by our server. (Note: the *separate* email-based `devOtp` returned during `register`/`resendOtp` is already gated to development only — not part of the SMS flow, not touched here.)

## Graceful failure if env is missing

If `MSG91_AUTH_KEY` or `MSG91_TEMPLATE_ID` is missing, `msg91.service.js`'s
`getMsg91Config()` throws a clear internal error — but both
`sendMobileOtp` and `verifyMobileOtp` in `auth.controller.js` wrap their
MSG91 calls in `try/catch`, so this never crashes the process. The user
gets a clean `"Failed to send OTP"` / `"OTP verification failed"`
response and the real reason is logged server-side only. Note that
`MSG91_AUTH_KEY`/`MSG91_TEMPLATE_ID` are in the backend's required-to-boot
env list (see `pre-deployment-checklist.md`), so in practice the server
won't even start without them — this graceful-catch behavior is a second
layer of safety, not the primary one.

## Where to get your keys

[MSG91 dashboard](https://control.msg91.com/) → OTP service:

- `MSG91_AUTH_KEY` — under Settings → API Keys
- `MSG91_TEMPLATE_ID` — under OTP → Templates (create/approve an OTP SMS template first)
- `MSG91_SENDER_ID` — under Settings → Sender IDs, only if your template requires an approved sender

## Where to paste them

Backend only — `backend/.env` (dev) or `backend/.env.production` (prod):

```
MSG91_AUTH_KEY=your_real_key
MSG91_TEMPLATE_ID=your_real_template_id
MSG91_SENDER_ID=            # optional
MSG91_OTP_EXPIRY_MINUTES=5  # optional, defaults to 5
```

Never put any of these behind a `VITE_` prefix — that would ship your
MSG91 auth key to every browser.

## Testing

Your real `backend/.env` already has a working `MSG91_AUTH_KEY` and
`MSG91_TEMPLATE_ID` from before this session — mobile OTP send/verify
should work exactly as it did previously; only the response payload
shape changed (less leaked to the client), not the underlying behavior.
Test by requesting an OTP on a real mobile number from the running dev
server and confirming it arrives and verifies correctly.
