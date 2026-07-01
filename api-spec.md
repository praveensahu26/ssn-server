# Social News App — API Specification

> Backend API spec for the Social News App. Two clients consume these APIs:
> **Mobile App** (Users + Authorised Reporters) and **Web Admin Panel** (Admins).
> Stack assumption: Node.js + Express + MongoDB (Mongoose), JWT auth, S3 for media,
> Socket.io for realtime (chat + live), a payment gateway (Razorpay/Stripe), and a
> streaming provider (Agora / LiveKit / Mux) for live video.

---

## 1. Conventions

- **Base URL:** `/api/v1`
- **Auth:** `Authorization: Bearer <accessToken>` (JWT). Admin routes are under `/api/v1/admin/*` and require an `admin` role.
- **Roles:** `user`, `reporter` (approved), `reporter_pending`, `admin`.
- **Response envelope:**
  ```json
  { "success": true, "data": {}, "message": "", "meta": { "page": 1, "limit": 20, "total": 0 } }
  ```
- **Pagination:** `?page=1&limit=20` on all list endpoints.
- **Media uploads:** prefer presigned S3 URLs (client uploads directly to S3, sends back the key) to keep the API stateless. Direct multipart is the fallback.

---

## 2. Data Models (high level)

| Model | Key fields |
|---|---|
| **User** | name, email, mobile, passwordHash, role, status (active/inactive/blocked), avatar, followedCategories[], reporterProfile (docs, approvalStatus), createdAt |
| **News** | author (ref User), type (video/audio/image), mediaUrl, caption, description, location {lat,lng,city,state,country}, category (ref), campaign (ref, optional), status (public/flagged/deleted), flagReason, likesCount, dislikesCount, commentsCount, isLive, createdAt |
| **Comment** | news (ref), author (ref), text, createdAt |
| **Reaction** | news (ref), user (ref), type (like/dislike) — unique per (news,user) |
| **Report** | news (ref), reportedBy (ref), reason, status, createdAt |
| **Category** | name, icon/image, createdAt |
| **Campaign** | createdBy (ref), title, description, type (petition/donation), goal, status (running/closed), petitionConfig, donationConfig {min,max}, signaturesCount, raisedAmount, createdAt |
| **Signature** | campaign (ref), user (ref), createdAt |
| **Donation** | campaign (ref), user (ref), amount, paymentId, status, createdAt |
| **Pledge** | campaign (ref), reporter (ref), createdAt |
| **Connection** | requester (ref), recipient (ref), status (pending/accepted/rejected), createdAt |
| **Conversation** | participants[], lastMessage, updatedAt |
| **Message** | conversation (ref), sender (ref), text, attachments[], readBy[], createdAt |
| **LiveStream** | host (ref), collaborators[], title, category, status (live/ended), streamToken, viewersCount, startedAt, endedAt |
| **Setting** | key, value (categories config, payment keys, email/SMS/video provider config) |
| **Notification** | user (ref), type, payload, read, createdAt |

> Design note: keep `News.author` and `Campaign.createdBy` as generic User refs (don't
> hardcode "user-only") so a reporter could create campaigns later without a migration.

---

## 3. MOBILE APP APIs

### 3.1 Auth & Onboarding
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/register` | Register as `user` or `reporter` (reporter → pending approval) |
| POST | `/auth/login` | Email/mobile + password login |
| POST | `/auth/forgot-password` | Trigger OTP/reset email (SendGrid/Twilio) |
| POST | `/auth/verify-otp` | Verify OTP |
| POST | `/auth/reset-password` | Set new password |
| POST | `/auth/refresh-token` | Rotate access token |
| POST | `/auth/logout` | Invalidate refresh token |
| POST | `/reporters/apply` | Submit reporter onboarding docs (if not done at register) |
| GET | `/profile/me` | Get own profile |
| PUT | `/profile/me` | Update profile/avatar |

### 3.2 News
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/media/presign` | Get presigned S3 URL for media upload |
| POST | `/news` | Create news (mediaUrl, caption, description, location, category, optional campaign) |
| GET | `/news/feed` | Feed filtered by followed categories (paginated) |
| GET | `/news/:id` | News detail |
| DELETE | `/news/:id` | Delete own news |
| POST | `/news/:id/like` | Like |
| POST | `/news/:id/dislike` | Dislike |
| DELETE | `/news/:id/reaction` | Remove own like/dislike |
| GET | `/news/:id/comments` | List comments |
| POST | `/news/:id/comments` | Add comment |
| DELETE | `/news/comments/:commentId` | Delete own comment |
| POST | `/news/:id/report` | Report inappropriate content |

### 3.3 Categories
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/categories` | List all categories |
| POST | `/categories/:id/follow` | Follow category |
| DELETE | `/categories/:id/follow` | Unfollow category |

### 3.4 Campaigns
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/campaigns` | Start a campaign (petition or donation) — user |
| GET | `/campaigns` | List running campaigns |
| GET | `/campaigns/:id` | Campaign detail |
| POST | `/campaigns/:id/sign` | Sign petition |
| POST | `/campaigns/:id/donate` | Donate (creates payment intent) |
| POST | `/campaigns/:id/pledge` | Reporter pledges to a campaign |
| GET | `/campaigns/:id/signatures` | List signatures |
| GET | `/campaigns/:id/donations` | List donations |

### 3.5 Networks (Connections)
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/connections/request` | Send connection request to a reporter/agency |
| GET | `/connections/requests` | Incoming pending requests |
| POST | `/connections/:id/accept` | Accept request |
| POST | `/connections/:id/reject` | Reject request |
| GET | `/connections` | My accepted connections |
| DELETE | `/connections/:id` | Remove connection |

### 3.6 Chat (realtime via Socket.io)
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/chats` | Conversation list |
| POST | `/chats` | Start/get conversation with a connection |
| GET | `/chats/:id/messages` | Message history (paginated) |
| POST | `/chats/:id/messages` | Send message (REST fallback) |
| — | `socket: message:new / message:read / typing` | Realtime events |

### 3.7 Live Streaming (collab, Instagram-style)
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/live/start` | Start a live stream → returns stream token |
| POST | `/live/:id/invite` | Invite a connection to co-host |
| POST | `/live/:id/join` | Accept/join as co-host |
| GET | `/live/active` | List active live streams |
| GET | `/live/:id/token` | Get viewer/host token (Agora/LiveKit) |
| POST | `/live/:id/end` | End stream |

### 3.8 Notifications
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/devices/register` | Register push token (FCM/APNs) |
| GET | `/notifications` | List notifications |
| PATCH | `/notifications/:id/read` | Mark read |

### 3.9 Payments
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/payments/create-order` | Create donation order (gateway) |
| POST | `/payments/verify` | Verify/confirm payment |
| POST | `/payments/webhook` | Gateway webhook (unauthenticated, signature-verified) |

---

## 4. WEB ADMIN APIs

### 4.1 Auth
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/admin/auth/login` | Admin login |
| POST | `/admin/auth/forgot-password` | Reset flow |
| POST | `/admin/auth/reset-password` | Set new password |

### 4.2 Dashboard
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/admin/dashboard/stats` | Totals: users, reporters, news, campaigns, watch hours (`?from=&to=`) |
| GET | `/admin/dashboard/charts` | Time-series data for charts |

### 4.3 Users Module
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/admin/users` | Grid (filters: status, search; paginated) |
| GET | `/admin/users/:id` | Detail view |
| GET | `/admin/users/:id/news` | User's news posts |
| GET | `/admin/users/:id/campaigns` | User's campaigns |
| PATCH | `/admin/users/:id/block` | Block |
| PATCH | `/admin/users/:id/unblock` | Unblock |

### 4.4 Reporters Module
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/admin/reporters` | Grid (filter by status, incl. pending) |
| GET | `/admin/reporters/:id` | Detail view (incl. submitted docs) |
| PATCH | `/admin/reporters/:id/approve` | Accept reporter application |
| PATCH | `/admin/reporters/:id/reject` | Reject application |
| PATCH | `/admin/reporters/:id/block` | Block |

### 4.5 News Feed Module
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/admin/news` | All news, real-time. Filters: user, reporter, city/state/country, category, date range, isActiveCampaign |
| GET | `/admin/news/:id` | Detail |
| GET | `/admin/news/reported` | Reported-content queue |
| PATCH | `/admin/news/:id/flag` | Flag with reason (removes from public) |
| DELETE | `/admin/news/:id` | Delete |

### 4.6 Settings — Categories
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/admin/categories` | List |
| POST | `/admin/categories` | Create (name + icon/image) |
| GET | `/admin/categories/:id` | Detail |
| PUT | `/admin/categories/:id` | Edit |
| DELETE | `/admin/categories/:id` | Delete |

### 4.7 Settings — Campaign Config
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/admin/settings/campaigns` | Get campaign types config |
| PUT | `/admin/settings/campaigns` | Set petition page config + donation min/max |

### 4.8 Settings — Integrations
| Method | Endpoint | Purpose |
|---|---|---|
| GET/PUT | `/admin/settings/payment-gateway` | Test + live keys |
| GET/PUT | `/admin/settings/email` | SendGrid config |
| GET/PUT | `/admin/settings/sms` | Twilio config |
| GET/PUT | `/admin/settings/video` | Streaming provider config |

---

## 5. Suggested Build Order (for Claude Code)

1. **Foundation** — project scaffold, env config, DB connection, error/response middleware, JWT auth, role guards, User model.
2. **Auth** (mobile + admin) — register/login/forgot/reset/refresh, reporter onboarding.
3. **Categories** (admin CRUD + mobile list/follow) — small, unblocks news.
4. **Media pipeline** — S3 presign + upload.
5. **News** — create, feed, detail, reactions, comments, reports.
6. **Admin: Users + Reporters + News moderation + Dashboard aggregations.**
7. **Campaigns** + **Payments** (gateway integration + webhook).
8. **Connections + Chat** (REST + Socket.io realtime).
9. **Live streaming** (provider integration + tokens + collab).
10. **Notifications** (push + in-app).
11. **Settings/integrations**, hardening, validation, tests.

The first 6 are mostly straightforward CRUD + aggregation — fast with Claude Code.
Items 7–9 are the integration-heavy ones (third-party SDKs, realtime, webhooks) and
dominate the timeline regardless of AI assistance.

---

## 6. Open Decisions to Confirm (before/while building)

- Is "campaign news" a distinct type, or just a normal post optionally linked to a campaign? (affects News schema)
- Does chat require a mutually-accepted connection first, or can a user DM any reporter?
- Can reporters create campaigns later? (keep `createdBy` generic regardless)
- Streaming provider choice (Agora vs LiveKit vs Mux) — affects token endpoints + cost.
- Payment gateway (Razorpay for India vs Stripe) + payout flow to campaign owners.
- "Total watch hours" — how is live-view time tracked/aggregated?
