# Product Requirements Document: Wedding Moments

## 1. Overview

**Product Name:** Wedding Moments (working title)

**One-liner:** A mobile-first web app where wedding guests upload photos and videos, and discover photos of themselves taken by others — across multiple wedding events.

**Problem Statement:** Weddings generate thousands of photos spread across hundreds of phones. The couple never sees 90% of them. Guests look their best but the greatest candid photos of them live on strangers' phones they'll never access. There is no mechanism for discovery, no socially acceptable way to ask, and current solutions (WhatsApp groups, shared Google Photos albums) are chaotic, privacy-less, and don't scale across multi-day celebrations.

**Core Insight:** Most guests will only participate if they get value back. "Help the couple" drives 20-30% participation. "Discover photos of yourself that others took" drives 80%. The value exchange — you share your photos, you get to see photos others took of you — is the engine that makes the product work.

---

## 2. Users & Personas

### 2.1 The Couple (Admin)

**Who:** The bride and groom (or whoever is organizing the event).

**Goals:**

- Collect every candid photo and video from every guest, in full quality, without chasing anyone
- See the wedding through their guests' eyes — moments they missed while being the center of the event
- Have everything organized by event (Haldi, Sangeet, Wedding, etc.) and by guest
- Eventually export everything to Google Photos for long-term storage

**Pain today:**

- Miss 90% of moments because they're busy being the couple
- Professional photographer captures posed moments, not the candid emotional ones guests see
- Spend weeks after the wedding chasing people on WhatsApp for photos
- When photos do arrive, they come compressed, scattered, in drips over months
- No single complete collection ever materializes

### 2.2 The Wedding Guest

**Who:** Friends, family, acquaintances — ranging from the couple's college roommate to a distant uncle they've met twice.

**Goals (honest, in priority order):**

1. **Get great photos of themselves** — they're dressed up, looking their best, and the greatest photos of them were taken by someone else
2. **Get photos with their friends/group** — they reunited with people they haven't seen in years
3. **Share their photos with the couple** — a genuine but secondary motivation for most
4. **Relive their experience** — see the moments from their perspective, not a 2000-photo dump

**Pain today:**

- The best candid photos of them exist on strangers' phones — they don't know these photos exist and have no way to find them
- "I'll send it later" means it never happens — by next week, motivation is gone
- Group chats are useless — 500 photos dumped, impossible to find the 3 they're actually in
- Can't ask a stranger for their photos — socially awkward, especially across families
- Selfies aren't the same as a candid shot someone else captured
- Different ecosystems (iPhone vs Android) make sharing a chore

**Motivation spectrum:**

```
Selfless                                              Selfish
   |                                                     |
   "Gift my photos         "See photos of         "Get great photos
    to the couple"          me and my               of ME from
                            friends"                tonight"

   ~20% of guests          ~50% of guests         ~80% of guests
   (will upload             (will upload IF        (will upload ONLY IF
    regardless)              they get value)         they get value back)
```

---

## 3. Product Context: The Indian Wedding

This product is being designed for a South Indian wedding — a multi-day celebration with distinct events, varying guest lists, and different levels of intimacy.

### 3.1 Event Structure

| Event                 | Typical Guests         | Size     | Intimacy                 | Photo Characteristics                           |
| --------------------- | ---------------------- | -------- | ------------------------ | ----------------------------------------------- |
| **Pelli Kuturu**      | Close family only      | ~30-50   | Very intimate, emotional | Candid family moments, rituals                  |
| **Mehendi**           | Family + close friends | ~50-100  | Relaxed, fun             | Posed + candid, detailed hand art shots         |
| **Haldi**             | Family + friends       | ~100-150 | Chaotic, colorful        | Action shots, turmeric-covered faces, group fun |
| **Sangeet / Jamming** | Everyone               | ~200+    | Party, performances      | Dance performances, group energy, stage moments |
| **Wedding Ceremony**  | Everyone               | ~200+    | Formal + emotional       | Rituals, couple moments, family blessings       |

### 3.2 Why Multi-Day Matters for the Product

- **Different guest lists per event** — Pelli Kuturu is family-only; Sangeet is everyone. Privacy boundaries differ per event.
- **Volume compounds** — Across 5 events and 200+ guests, a flat photo dump becomes unnavigable. Structure by event is essential.
- **One link, multiple events** — Guests shouldn't need to join 5 separate albums. One QR code, one app, select which event you're at.
- **Family privacy** — Intimate family ritual moments from Pelli Kuturu should not be visible to the groom's college friends who only attended the Sangeet.

---

## 4. Value Proposition

### For the Couple

> Every candid photo and video from every guest, full quality, organized by event — without asking anyone.

### For the Guest

> Upload your photos and discover photos of yourself that you didn't know existed — taken by other guests.

### The Value Exchange

> You share your photos. You discover photos of yourself. The more guests participate, the more everyone benefits.

This flywheel is the core product mechanic. Without it, the product is infrastructure. With it, the product is something guests _want_ to use.

---

## 5. Features & Requirements

### 5.1 Core Features (MVP)

#### F1: QR Code Entry

- Single QR code works across all events
- Links to mobile-optimized web app (no app install)
- No passcode required — scanning the QR code is sufficient for entry

#### F2: Guest Authentication

- Phone OTP via Firebase Auth
- One-time verification; session persists across visits
- Guest can recover their gallery on any device by re-verifying with the same phone number
- Consent step at signup: "Allow us to find photos of you using face recognition"

#### F3: Multi-Event Support

- Guest selects which event they're uploading for (Haldi, Sangeet, Wedding, etc.)
- Events configured by the couple during setup
- Each event can optionally restrict its guest list (e.g., Pelli Kuturu = family only)
- Uploads are tagged and organized by event

#### F4: Photo & Video Upload

- Multi-select from camera roll (photos + videos)
- Client-side image compression for fast upload on venue WiFi
- Resumable/chunked uploads for large videos (handles WiFi drops)
- Background upload queue with retry — guest takes more photos while previous ones upload
- No upload limits (backed by couple's 200GB Google Drive)
- Full quality preservation (compress for speed, not for storage)

#### F5: Guest Gallery (Own Uploads)

- Guest sees their own uploads organized by event
- Responsive photo/video grid
- Tap to view full-size or play video
- Delete own uploads

#### F6: Face Recognition & Discovery

- On signup, guest uploads a selfie or the system captures their face from their first photo
- As other guests upload, the system scans photos for faces and matches against registered guests
- Guest receives notification: "3 new photos of you were uploaded by other guests"
- Dedicated "Photos of Me" tab — surfaces photos taken by others where the guest appears
- Requires explicit consent (opt-in, with clear explanation)
- Guest can opt out at any time and their face data is deleted

#### F7: Admin Dashboard (Couple's View)

- Separate admin login (email/password)
- View ALL uploads across all events
- Filter by event, by guest, by date
- Bulk download
- Moderation: ability to hide/remove inappropriate content
- Stats: uploads per event, participation rate, storage used

#### F8: Storage (Google Drive)

- All files stored in the couple's Google Drive via service account
- Organized: `Wedding Photos / {Event Name} / {Guest Name} / filename`
- Files are already in Google's ecosystem for eventual Google Photos migration
- Post-wedding batch export to Google Photos

### 5.2 Future Features (Post-MVP)

| Feature                    | Description                                                                      |
| -------------------------- | -------------------------------------------------------------------------------- |
| **Table/group tagging**    | Guests tag who's in their photo from a guest list — complements face recognition |
| **Highlights reel**        | Auto-curated best photos per event using engagement signals                      |
| **Guest-to-guest sharing** | "Send this photo to the person in it" — facilitated by face recognition          |
| **Live slideshow**         | Project uploaded photos on a screen at the venue in real time                    |
| **Thank you notes**        | Couple sends personalized thank-you with a photo of the guest from the event     |
| **Multi-wedding support**  | Productize for other couples (SaaS model)                                        |

---

## 6. User Flows

### 6.1 Guest Flow

```
Scan QR code on table card
        |
        v
Landing page → Phone number entry → receive OTP → verify
        |
        v
Consent: "Allow face recognition to find photos of you?" [Yes / No]
        |
        v
Upload selfie (for face matching) — optional if consented
        |
        v
Select event: [Haldi] [Sangeet] [Wedding] ...
        |
        v
Upload page — tap to select photos/videos from camera roll
        |
        v
Files compress + upload in background with progress
        |
        v
Guest gallery — see own uploads by event
        |
        v
"Photos of Me" tab — discover photos taken by others (face match)
        |
        v
Notification: "5 new photos of you were uploaded!"
(pulls guest back into the app throughout the event)
```

### 6.2 Couple (Admin) Flow

```
Admin login (email + password)
        |
        v
Dashboard — overview stats per event
        |
        v
Browse: all photos by event or by guest
        |
        v
Moderate: hide/remove if needed
        |
        v
Post-wedding: bulk download → upload to Google Photos
```

### 6.3 Couple Setup Flow (One-Time)

```
Create account
        |
        v
Name the wedding
        |
        v
Add events: name, date, guest list type (open / family-only)
        |
        v
Connect Google Drive (authorize service account)
        |
        v
Generate QR code → download for printing
```

---

## 7. Privacy & Security Model

| Principle                                       | Implementation                                                               |
| ----------------------------------------------- | ---------------------------------------------------------------------------- |
| **Guests see only their own uploads**           | Supabase Row Level Security — enforced at database level                     |
| **Guests see "Photos of Me" only with consent** | Face recognition is opt-in; opt-out deletes face data                        |
| **Guests cannot browse other guests' uploads**  | No API endpoint exists for cross-guest queries                               |
| **Family-only events are restricted**           | Event-level access control; non-family guests can't see Pelli Kuturu uploads |
| **Couple sees everything**                      | Admin uses service role key that bypasses RLS                                |
| **Face data is sensitive**                      | Stored separately, encrypted, deleted post-wedding or on opt-out             |
| **No public access**                            | QR code required for entry; phone OTP required                               |
| **Files live in couple's Google Drive**         | Couple owns and controls all data                                            |
| **GDPR/data compliance**                        | Consent checkbox at upload; clear data deletion policy; privacy notice       |

---

## 8. Distribution & Adoption Strategy

### The core challenge

Getting 200+ guests to actually use the product is a behavior change problem, not a tech problem. The QR code alone is not enough.

### Before the wedding

- Couple includes the link / QR code in the wedding invite (physical or digital)
- Frame it as **"see photos of yourself from the wedding"** — not "upload for us"
- Set expectations so guests arrive knowing what to do

### At the wedding

- QR codes on **every table card** — not just one at the entrance
- MC or DJ makes an announcement after dinner: _"Scan the QR on your table to upload your photos and see photos others took of you"_
- One bridesmaid or family member does a live demo at one table — social proof spreads
- Timing: announce once after dinner when people are seated and relaxed, once before dancing

### During the event (retention loop)

```
Guest uploads photos
        |
        v
Other guests upload photos with this guest in them
        |
        v
Face recognition matches → notification:
"3 new photos of you were uploaded!"
        |
        v
Guest comes back → views photos of themselves → uploads more
        |
        v
Cycle repeats
```

### After the wedding

- Email/SMS to every guest: _"Your wedding album is ready — X photos of you were captured by other guests"_
- This is the moment most products die. Nail post-wedding delivery = word-of-mouth

### Organic growth

- Every guest is a potential future bride/groom or knows one
- Subtle "Powered by Wedding Moments" branding on guest-facing pages
- Couple sharing their experience on social media = free acquisition

---

## 9. Technical Architecture (High-Level)

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Guest's     │     │   Next.js    │     │   Google Drive   │
│  Phone       │────>│   on Vercel  │────>│   (200GB)        │
│  (Browser)   │     │   (Free)     │     │   Couple's acct  │
└─────────────┘     └──────┬───────┘     └──────────────────┘
                           │
                    ┌──────┴───────┐
                    │   Supabase   │
                    │  (Postgres   │
                    │   + RLS)     │
                    │   (Free)     │
                    └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    │   Firebase   │
                    │  Phone Auth  │
                    │   (Free)     │
                    └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    │    Face      │
                    │  Recognition │
                    │   Service    │
                    └──────────────┘
```

### Stack

| Layer            | Choice                                          | Cost                      |
| ---------------- | ----------------------------------------------- | ------------------------- |
| Frontend         | Next.js 14 (App Router) + Tailwind CSS          | Free (Vercel)             |
| Guest Auth       | Firebase Phone Auth (OTP)                       | Free tier (10K SMS/month) |
| Storage          | Google Drive API via service account            | Free (200GB Google One)   |
| Database         | Supabase (Postgres + Row Level Security)        | Free tier                 |
| Face Recognition | TBD — AWS Rekognition / open-source face-api.js | TBD                       |
| Hosting          | Vercel                                          | Free tier                 |

### Estimated Cost

| Service          | Free Tier Covers              | Estimated Monthly Cost |
| ---------------- | ----------------------------- | ---------------------- |
| Vercel           | 100GB bandwidth               | $0                     |
| Supabase         | 500MB DB, 50K MAU             | $0                     |
| Firebase Auth    | 10K OTP/month                 | $0                     |
| Google Drive     | 200GB (existing subscription) | $0 (already paid)      |
| Face Recognition | Depends on approach           | $0-5                   |
| **Total**        |                               | **$0-5/month**         |

---

## 10. Success Metrics

| Metric                            | Target                                                      | Why it matters                     |
| --------------------------------- | ----------------------------------------------------------- | ---------------------------------- |
| **Guest participation rate**      | >60% of attendees upload at least 1 photo                   | Core adoption metric               |
| **Photos per guest**              | >10 average                                                 | Engagement depth                   |
| **"Photos of Me" discovery rate** | >50% of opted-in guests find at least 1 photo of themselves | Validates the core value prop      |
| **Return visits**                 | >40% of guests come back after initial upload               | Proves the notification loop works |
| **Couple satisfaction**           | Couple feels they have a comprehensive collection           | Ultimate success measure           |

---

## 11. Open Questions

| Question                    | Options                                                                                                                          | Impact                  |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Face recognition approach   | AWS Rekognition (accurate, costs ~$1/1000 photos) vs. open-source face-api.js (free, runs client-side, less accurate) vs. hybrid | Cost, accuracy, privacy |
| Video length limits         | Unlimited vs. cap at 2-3 minutes vs. soft warning at 100MB                                                                       | Storage, upload speed   |
| Post-wedding data retention | Keep forever vs. auto-delete after 6 months vs. couple decides                                                                   | Privacy, storage        |
| Product name                | "Wedding Moments" is a working title                                                                                             | Branding                |
| Guest list management       | Open (anyone with QR link) vs. pre-registered guest list vs. per-event control                                                   | Complexity, privacy     |

---

## 12. Milestones

| Phase                         | Scope                                                            | Timeline |
| ----------------------------- | ---------------------------------------------------------------- | -------- |
| **Phase 1: Foundation**       | Project setup, auth flow, Google Drive integration, basic upload | —        |
| **Phase 2: Guest Experience** | Upload queue, guest gallery, multi-event support, compression    | —        |
| **Phase 3: Admin**            | Admin dashboard, moderation, bulk download                       | —        |
| **Phase 4: Discovery**        | Face recognition integration, "Photos of Me" tab, notifications  | —        |
| **Phase 5: Polish**           | QR code generation, mobile optimization, error handling, testing | —        |
| **Phase 6: Launch**           | Deploy, test with friends, print QR codes                        | —        |
