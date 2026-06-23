# Social News App — Claude Code Build Playbook

Paste-ready prompts for building the backend APIs with Claude Code (CLI), mapped 1:1
to your Figma modules. Work **top to bottom, one prompt at a time** — review and commit
after each before moving on. Don't paste them all at once.

**Stack:** Node.js + Express + MongoDB (Mongoose) · JWT auth · S3 media · Socket.io
(chat + live) · Razorpay/Stripe payments · Agora/LiveKit streaming.

---

## How to use this doc

1. Keep `api-spec.md` (the endpoint spec) inside the repo at `docs/api-spec.md`.
2. Run **Prompt 0** first — it creates `CLAUDE.md` so Claude Code keeps context across sessions.
3. Then run each module prompt in order. After each: review the diff, run tests, commit.
4. If a prompt produces too much at once, tell Claude Code: *"Stop. Do only the model + the first 3 endpoints, then wait."*

---

## PROMPT 0 — Project setup + context file

```
Set up a new Node.js + Express + MongoDB backend for a project called "Social News App".

Create the project scaffold:
- Express app with a layered structure: src/{config,models,controllers,services,routes,middlewares,utils,sockets,validators}
- Mongoose connection with env config (dotenv), graceful shutdown
- Central error handler + a standard response envelope: { success, data, message, meta }
- Request validation using zod (or joi)
- JWT auth (access + refresh tokens) and role-based guards for roles: user, reporter, reporter_pending, admin
- Logging (pino or morgan), security middleware (helmet, cors, rate-limit), compression
- ESLint + Prettier + a basic Jest + supertest test setup
- A health check route GET /api/v1/health

Read docs/api-spec.md for the full API surface and data models — do NOT build the
endpoints yet. Instead, create a CLAUDE.md at the repo root that captures:
- the stack, folder structure, conventions (base URL /api/v1, response envelope, auth header, pagination ?page&limit)
- the role model and which roles can do what
- the list of modules to build and the build order
- a rule: "build one module at a time, write tests, never hardcode secrets, keep News.author and Campaign.createdBy as generic User refs"

Then scaffold only the foundation above. Show me the folder tree and the CLAUDE.md when done. Don't build feature endpoints yet.
```

---

# MOBILE APP MODULES

## PROMPT 1 — Auth Module (User/Reporter Sign Up + Reporter onboarding)

```
Build the Auth module per docs/api-spec.md section 3.1.

Model: User (name, email, mobile, passwordHash, role, status [active/inactive/blocked],
avatar, followedCategories[], reporterProfile {documents[], approvalStatus
[pending/approved/rejected], appliedAt}, createdAt).

Endpoints:
- POST /api/v1/auth/register  → role "user" is active immediately; role "reporter" creates the account as role "reporter_pending" with reporterProfile.approvalStatus="pending"
- POST /api/v1/auth/login     → email or mobile + password, returns access + refresh tokens
- POST /api/v1/auth/forgot-password → generate OTP/reset token (stub the email/SMS send behind a NotificationService interface)
- POST /api/v1/auth/verify-otp
- POST /api/v1/auth/reset-password
- POST /api/v1/auth/refresh-token
- POST /api/v1/auth/logout (invalidate refresh token)
- POST /api/v1/reporters/apply → submit/resubmit reporter onboarding documents (auth required)
- GET  /api/v1/profile/me
- PUT  /api/v1/profile/me

Hash passwords with bcrypt. Validate all inputs. Add Jest tests for register/login/refresh
and the reporter-pending path. Update CLAUDE.md status checklist. Stop after this module.
```

## PROMPT 2 — Categories (needed before news)

```
Build the Category model and category endpoints per docs/api-spec.md sections 3.3 and 4.6.

Model: Category (name, icon/image url, createdAt).

Mobile endpoints (auth: user/reporter):
- GET    /api/v1/categories
- POST   /api/v1/categories/:id/follow
- DELETE /api/v1/categories/:id/follow   (updates User.followedCategories)

Admin endpoints (auth: admin):
- GET    /api/v1/admin/categories
- POST   /api/v1/admin/categories
- GET    /api/v1/admin/categories/:id
- PUT    /api/v1/admin/categories/:id
- DELETE /api/v1/admin/categories/:id

Add tests. Stop after this module.
```

## PROMPT 3 — Media upload pipeline

```
Build the media upload pipeline per docs/api-spec.md.
- POST /api/v1/media/presign → returns a presigned S3 PUT URL + the final object key/url, for image/audio/video. Validate mime type and size.
- Wrap AWS SDK v3 in an S3Service so the provider can be swapped.
- Read bucket/region/keys from env. Add a unit test mocking the S3 client. Stop after this.
```

## PROMPT 4 — Create Post Module + Home Module (news create + feed)

```
Build the News module (Figma "Create Post Module" + "Home Module") per docs/api-spec.md section 3.2.

Models:
- News (author ref User, type [video/audio/image], mediaUrl, caption, description,
  location {lat,lng,city,state,country}, category ref, campaign ref optional,
  status [public/flagged/deleted], flagReason, likesCount, dislikesCount, commentsCount,
  isLive, createdAt)
- Comment (news ref, author ref, text, createdAt)
- Reaction (news ref, user ref, type [like/dislike]) — unique compound index on (news,user)
- Report (news ref, reportedBy ref, reason, status, createdAt)

Endpoints (auth: user/reporter):
- POST   /api/v1/news                      (create; accepts mediaUrl from the presign step)
- GET    /api/v1/news/feed                 (paginated; filtered by the user's followedCategories)
- GET    /api/v1/news/:id
- DELETE /api/v1/news/:id                  (author only)
- POST   /api/v1/news/:id/like
- POST   /api/v1/news/:id/dislike
- DELETE /api/v1/news/:id/reaction
- GET    /api/v1/news/:id/comments
- POST   /api/v1/news/:id/comments
- DELETE /api/v1/news/comments/:commentId  (author only)
- POST   /api/v1/news/:id/report

Keep counters (likesCount etc.) consistent with $inc on reaction/comment changes.
Add tests for create, feed filtering, like/dislike toggle, and report. Stop after this module.
```

## PROMPT 5 — Campaign Module (mobile)

```
Build the Campaign module per docs/api-spec.md section 3.4.

Models:
- Campaign (createdBy ref User, title, description, type [petition/donation], goal,
  status [running/closed], petitionConfig, donationConfig {min,max}, signaturesCount,
  raisedAmount, createdAt)
- Signature (campaign ref, user ref, createdAt) — unique on (campaign,user)
- Pledge (campaign ref, reporter ref, createdAt) — unique on (campaign,reporter)
- Donation (campaign ref, user ref, amount, paymentId, status, createdAt)

Endpoints:
- POST /api/v1/campaigns                 (role user — start a campaign)
- GET  /api/v1/campaigns                 (list running)
- GET  /api/v1/campaigns/:id
- POST /api/v1/campaigns/:id/sign        (petition signing)
- POST /api/v1/campaigns/:id/pledge      (role reporter only)
- GET  /api/v1/campaigns/:id/signatures
- GET  /api/v1/campaigns/:id/donations
(Leave POST /campaigns/:id/donate for the Payments module — stub it for now.)

Add tests. Stop after this module.
```

## PROMPT 6 — Payments (donations)

```
Build the Payments module per docs/api-spec.md section 3.9, wired to the Campaign donation flow.
Use Razorpay (primary) behind a PaymentService interface so Stripe can be swapped.

- POST /api/v1/payments/create-order  → create a gateway order for a campaign donation
- POST /api/v1/campaigns/:id/donate   → creates a Donation (status pending) + returns order
- POST /api/v1/payments/verify        → verify signature, mark Donation paid, $inc Campaign.raisedAmount
- POST /api/v1/payments/webhook       → unauthenticated, signature-verified, idempotent

Read all keys from Settings/env, never hardcode. Add tests with the gateway mocked,
including a replayed-webhook idempotency test. Stop after this module.
```

## PROMPT 7 — Networks Module + User/Connections Module

```
Build the Connections module (Figma "Networks Module" + "User/Connections Module") per docs/api-spec.md section 3.5.

Model: Connection (requester ref, recipient ref, status [pending/accepted/rejected], createdAt) — unique on the pair.

Endpoints (auth: user/reporter):
- POST   /api/v1/connections/request   (send request to a reporter/agency)
- GET    /api/v1/connections/requests  (incoming pending)
- POST   /api/v1/connections/:id/accept
- POST   /api/v1/connections/:id/reject
- GET    /api/v1/connections           (my accepted connections)
- DELETE /api/v1/connections/:id

Prevent duplicate/self requests. Add tests. Stop after this module.
```

## PROMPT 8 — Message Module (realtime chat)

```
Build the Chat module (Figma "Message Module") per docs/api-spec.md section 3.6 using Socket.io.

Models:
- Conversation (participants[], lastMessage, updatedAt)
- Message (conversation ref, sender ref, text, attachments[], readBy[], createdAt)

REST:
- GET  /api/v1/chats                 (my conversations)
- POST /api/v1/chats                 (start/get a 1:1 conversation with an accepted connection)
- GET  /api/v1/chats/:id/messages    (paginated history)
- POST /api/v1/chats/:id/messages    (REST fallback send)

Socket.io: authenticate the socket via JWT; events message:new, message:read, typing;
room per conversation. Rule: a conversation can only be created between users with an
accepted Connection. Add tests for REST + a socket integration test. Stop after this module.
```

## PROMPT 9 — Live Module (collab streaming)

```
Build the Live Streaming module (Figma "Live Module") per docs/api-spec.md section 3.7.
Use Agora (or LiveKit) behind a StreamingService interface. Roles: host + invited co-hosts (Instagram-collab style).

Model: LiveStream (host ref, collaborators[], title, category ref, status [live/ended],
channelName, viewersCount, watchSeconds, startedAt, endedAt).

Endpoints:
- POST /api/v1/live/start          → create stream + return host token
- POST /api/v1/live/:id/invite     → invite an accepted connection to co-host
- POST /api/v1/live/:id/join       → accept/join (host or viewer), returns token
- GET  /api/v1/live/active         → list active streams
- GET  /api/v1/live/:id/token      → viewer/host token
- POST /api/v1/live/:id/end        → end stream, finalize watchSeconds

Track viewer join/leave to accumulate watchSeconds (feeds the admin "total watch hours" stat).
Mock the streaming SDK in tests. Stop after this module.
```

## PROMPT 10 — Notifications + Device tokens

```
Build the Notifications module (Figma "Notification Module") per docs/api-spec.md section 3.8.

Model: Notification (user ref, type, payload, read, createdAt).

- POST  /api/v1/devices/register     (FCM/APNs push token)
- GET   /api/v1/notifications        (paginated)
- PATCH /api/v1/notifications/:id/read

Implement a NotificationService that writes the in-app record AND sends push (provider mocked).
Emit notifications on: new comment, new connection request/accept, campaign pledge, live invite.
Add tests. Stop after this module.
```

## PROMPT 11 — My Profile + Settings Module (mobile)

```
Complete the mobile "My Profile Module" and "Settings Module".
- Extend GET/PUT /api/v1/profile/me with avatar upload (presign), bio, and notification preferences.
- GET /api/v1/profile/:id → public profile (name, avatar, role badge, news count, campaign count)
- GET /api/v1/profile/me/news, GET /api/v1/profile/me/campaigns
- App settings endpoints for the Settings screen (notification toggles, privacy, change password, delete account).
Add tests. Stop after this module.
```

---

# WEB ADMIN MODULES

## PROMPT 12 — Admin Auth Module

```
Build the Admin Auth module per docs/api-spec.md section 4.1. Admin accounts only (role admin).
- POST /api/v1/admin/auth/login
- POST /api/v1/admin/auth/forgot-password
- POST /api/v1/admin/auth/reset-password
Add an admin-only guard middleware reused by all /admin routes, and a seed script to create
the first admin from env. Add tests. Stop after this module.
```

## PROMPT 13 — Admin Dashboard

```
Build the Admin Dashboard per docs/api-spec.md section 4.2 using MongoDB aggregation pipelines.
- GET /api/v1/admin/dashboard/stats?from=&to=  → totals: users, authorised reporters,
  news reported, campaigns, total watch hours (sum of LiveStream.watchSeconds)
- GET /api/v1/admin/dashboard/charts?from=&to=&groupBy=day|week|month → time-series for charts
Make date filters optional (default last 30 days). Add tests for the aggregations. Stop after this.
```

## PROMPT 14 — Admin User Module

```
Build the Admin User module per docs/api-spec.md section 4.3.
- GET   /api/v1/admin/users               (grid; filters: status, search; paginated; include newsCount + activeCampaignCount)
- GET   /api/v1/admin/users/:id           (detail)
- GET   /api/v1/admin/users/:id/news
- GET   /api/v1/admin/users/:id/campaigns
- PATCH /api/v1/admin/users/:id/block
- PATCH /api/v1/admin/users/:id/unblock
Blocking a user must block their login + hide their public content. Add tests. Stop after this module.
```

## PROMPT 15 — Admin Reporters Module

```
Build the Admin Reporters module per docs/api-spec.md section 4.4.
- GET   /api/v1/admin/reporters               (grid; filter by approvalStatus incl. pending)
- GET   /api/v1/admin/reporters/:id           (detail incl. submitted documents)
- PATCH /api/v1/admin/reporters/:id/approve   (pending → reporter; notify the user)
- PATCH /api/v1/admin/reporters/:id/reject    (with reason; notify)
- PATCH /api/v1/admin/reporters/:id/block
Approving flips role reporter_pending → reporter. Add tests. Stop after this module.
```

## PROMPT 16 — Admin News Feed Module

```
Build the Admin News Feed module per docs/api-spec.md section 4.5.
- GET   /api/v1/admin/news        filters: user, reporter, city, state, country, category, dateFrom, dateTo, isActiveCampaign (yes/no); paginated; sorted newest first
- GET   /api/v1/admin/news/:id
- GET   /api/v1/admin/news/reported   (queue of reported posts with report counts)
- PATCH /api/v1/admin/news/:id/flag   (requires reason; sets status=flagged → removed from public feeds)
- DELETE /api/v1/admin/news/:id
Add tests covering the combined filters and the flag-removes-from-public behavior. Stop after this module.
```

## PROMPT 17 — Admin Settings (Campaign config + Integrations)

```
Build Admin Settings per docs/api-spec.md sections 4.7 and 4.8. Store config in a Setting key/value model.
- GET/PUT /api/v1/admin/settings/campaigns         (petition page config + donation min/max — these bound the mobile donate flow)
- GET/PUT /api/v1/admin/settings/payment-gateway   (test + live keys; encrypt secrets at rest)
- GET/PUT /api/v1/admin/settings/email             (SendGrid)
- GET/PUT /api/v1/admin/settings/sms               (Twilio)
- GET/PUT /api/v1/admin/settings/video             (streaming provider)
Wire PaymentService/NotificationService/StreamingService to read from these settings with env fallback.
Mask secrets on GET. Add tests. Stop after this module.
```

---

## PROMPT 18 — Final hardening pass

```
Do a hardening pass across the whole API:
- Verify every route has auth + role guards and input validation
- Add rate limiting on auth + payment + report endpoints
- Add consistent pagination + a global 404 + error handler check
- Add an OpenAPI/Swagger spec generated from the routes at GET /api/v1/docs
- Add seed scripts (admin, categories, demo data) and a README with setup + env table
- Run the full test suite and fix failures
Give me a summary of coverage and anything still stubbed (streaming, push, payments) that needs real provider keys before production.
```

---

## Tips for the CLI sessions

- Start each session with: *"Read CLAUDE.md and docs/api-spec.md, then continue with Prompt N."*
- Commit after every module so you can roll back cleanly.
- If output balloons, interrupt and scope it down ("only the model + validators first").
- The stubbed providers (S3, Razorpay, Agora, FCM, SendGrid, Twilio) need real keys to test
  end-to-end — keep them mocked until you wire credentials, so the test suite stays green offline.