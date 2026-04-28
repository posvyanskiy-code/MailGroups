# Mail Groups — End-to-End Backend Design

**Date:** 2026-04-28
**Status:** Approved (brainstorming)
**Supersedes:** narrows/replaces parts of `docs/superpowers/plans/2026-04-27-graph-backend-phase-1.md` (the read-only Graph listing approach is dropped — groups now live in our own DB).

## Goal

Stand up a working corporate demo of a mail-distribution-group manager:

- Owners create distribution groups (stored in our DB).
- Co-owners can manage a group together.
- Public groups are discoverable; users request to join, owners approve.
- Private groups are invisible to non-members; owners add people manually.
- Adding members searches real Entra (Microsoft 365) accounts.
- Owners send broadcast emails to subscribers from a single corporate service mailbox via Microsoft Graph. Replies are not supported (one-way broadcast).

The frontend (existing React + Vite + AntD app) is reused — only the data layer and a few screens change.

## Architecture

```
┌──────────────────┐    MSAL.js (delegated)    ┌─────────────────────┐
│  React frontend  │ ─── access_token ───────► │  ASP.NET Core API   │
│  (existing UI)   │                           │  (BFF, JWT-protected)│
└──────────────────┘                           └─────┬───────────┬───┘
                                                     │           │
                                            EF Core  │           │  Microsoft Graph
                                                     ▼           ▼
                                              ┌──────────┐  ┌──────────────────────┐
                                              │ Postgres │  │ Graph API            │
                                              │ (groups, │  │ - /users (search,    │
                                              │  members │  │   delegated, OBO)    │
                                              │  reqs)   │  │ - /sendMail          │
                                              └──────────┘  │   (app-only, from    │
                                                            │   mailgroups@…)      │
                                                            └──────────────────────┘
```

Two distinct Graph call modes:

- **Delegated (On-Behalf-Of)** — user search when adding members. Runs as the signed-in user; respects what they can see in Entra.
- **App-only** — `sendMail` from the service mailbox `mailgroups@company.com`. Independent of who triggered the broadcast. Restricted by `ApplicationAccessPolicy` so the app can only send from that single mailbox (defense-in-depth: prevents the API from spoofing arbitrary tenant users).

**Source of truth for groups is our Postgres**, not M365 / Exchange. Microsoft 365 / Exchange does not know these groups exist. There is no `group@company.com` address; users do not email groups directly. Sending happens only through the API.

## Data model (Postgres + EF Core)

```
groups
  id              uuid PK
  display_name    text
  mail_nickname   text unique     -- slug; URL: /groups/hr-news
  description     text
  visibility      text            -- 'Public' | 'Private'
  business_line   text null
  tags            text[]
  created_at      timestamptz
  updated_at      timestamptz

group_owners                      -- co-owners (M:N)
  group_id        uuid FK
  entra_user_id   uuid            -- Entra objectId
  PK (group_id, entra_user_id)

group_members                     -- subscribers (M:N)
  group_id        uuid FK
  entra_user_id   uuid
  email           text            -- snapshot from Entra at add time
  display_name    text            -- snapshot
  added_at        timestamptz
  added_by        uuid            -- entra_user_id of actor; null = self-subscribe
  PK (group_id, entra_user_id)

join_requests
  id              uuid PK
  group_id        uuid FK
  entra_user_id   uuid
  status          text            -- 'pending' | 'approved' | 'rejected'
  created_at      timestamptz
  decided_at      timestamptz null
  decided_by      uuid null

mail_sends                        -- broadcast journal (audit + UI history)
  id              uuid PK
  group_id        uuid FK
  sent_by         uuid            -- owner who triggered
  subject         text
  body_html       text
  recipient_count int
  status          text            -- 'queued' | 'sent' | 'failed'
  graph_message_id text null
  created_at      timestamptz
  sent_at         timestamptz null
  error           text null
```

Notes:

- Users are **not** stored in our DB as their own table. Entra is the source of truth. `entra_user_id` is a foreign-key-to-nowhere on our side.
- `email` and `display_name` are denormalized into `group_members` so a broadcast does not have to fan out to Graph for every recipient lookup.
- Stale-user reconciliation (people who left the company) is an out-of-band sync job (out of scope for the demo).

## API endpoints

All endpoints are JWT-protected (audience = our API, issuer = Entra). Prefix `/api`.

```
# Identity
GET    /api/me                              -> { id, displayName, mail, isMailGroupsAdmin }

# Groups (CRUD)
GET    /api/groups?search=&tab=all|mine|subscribed&tag=&businessLine=
                                            -> Public groups + Private groups where I am owner/member
GET    /api/groups/{id}                     -> 404 if Private and I am not owner/member
POST   /api/groups                          -> creator becomes first owner
PATCH  /api/groups/{id}                     -> owner only: name/desc/visibility/tags/...
DELETE /api/groups/{id}                     -> owner only

# Owners (co-owners)
POST   /api/groups/{id}/owners              -> { entraUserId } add co-owner
DELETE /api/groups/{id}/owners/{userId}     -> cannot remove the last owner

# Members
GET    /api/groups/{id}/members             -> owner/member only
POST   /api/groups/{id}/members             -> { entraUserIds: [...] } batch add (owner only)
DELETE /api/groups/{id}/members/{userId}    -> owner, or self

# Join requests (Public groups only)
POST   /api/groups/{id}/join                -> create pending JoinRequest
GET    /api/groups/{id}/requests            -> owner: list pending
POST   /api/groups/{id}/requests/{reqId}/approve
POST   /api/groups/{id}/requests/{reqId}/reject

# Entra user search (powers AddMembersModal)
GET    /api/users/search?q=ivan             -> Graph /users $search (OBO)
                                               returns [{ id, displayName, mail }]

# Send mail
POST   /api/groups/{id}/mail                -> { subject, bodyHtml }
                                               owner only
                                               creates mail_sends row (status=queued),
                                               calls Graph sendMail (app-only) from
                                               mailgroups@company.com with members in Bcc,
                                               updates row to sent/failed
```

## Authorization model

**Frontend:**

- MSAL.js, single-tenant login.
- API calls carry a delegated access token with scope `api://<API_CLIENT_ID>/Groups.ReadWrite`.
- `entraUserId` of the current user comes from the MSAL account's `oid` claim.

**Backend, two Graph modes:**

| Mode             | Used for                              | Entra requirement                                                                     |
| ---------------- | ------------------------------------- | ------------------------------------------------------------------------------------- |
| Delegated (OBO)  | `/api/users/search`                   | Graph delegated `User.ReadBasic.All` (admin-consented)                                |
| App-only         | `POST /api/groups/{id}/mail`          | Graph application `Mail.Send` + `ApplicationAccessPolicy` scoped to `mailgroups@…`    |

**Per-endpoint authorization** is enforced by ASP.NET Core authorization handlers reading `groups` / `group_owners` / `group_members` from Postgres:

- `IsOwnerHandler` — `group.owners.contains(currentUserId)`
- `CanReadGroupHandler` — `Public OR isOwner OR isMember`
- `CanSendMailHandler` — `isOwner` (room reserved for a future global admin role)

A global `MailGroupsAdmin` role is **not** implemented in this demo. `/api/me` returns `isMailGroupsAdmin: false` as a placeholder; later it will map to an Entra App Role.

## Frontend changes

The existing UI stays. Changes are localized:

**Data layer:**

- New `HttpMailGroupService` implementing `IMailGroupService` via REST.
- `MockMailGroupService` is preserved for offline development and existing tests.
- `services/index.ts` selects implementation by `VITE_USE_HTTP_API` env flag.
- New `httpClient.ts` — fetch wrapper that attaches `Authorization: Bearer <msal token>`.
- `CurrentUserContext` no longer hard-codes `user-1`; it reads the MSAL account and `/api/me`.

**UI:**

- **`AppHeader`** — sign-in / sign-out buttons (MSAL). Empty state before login.
- **`GroupCreate`** — `visibility` radio (Public / Private) with a hint that Private groups are not discoverable.
- **`GroupList`** — visibility filtering happens on the backend; component itself is unchanged.
- **`GroupDetail`** —
  - Returns 404 for non-members on Private groups.
  - Owner of a Private group sees no "Join requests" section (none can exist).
  - Public groups keep the existing approve/reject flow.
  - **New "Send mail" section** — "Compose" button opens a modal (subject + rich-text body). Visible only if `currentUser.id ∈ ownerIds`. Below: history list from `mail_sends`.
- **`AddMembersModal`** — primary mode is autocomplete by name/email via `/api/users/search`. The existing bulk-paste tab is kept but its semantics change: every pasted address is resolved against Entra; addresses that do not match a tenant user are flagged in red and excluded from the add request. Creating new "local" users on the fly (the current `findOrCreateUserByEmail` mock behavior) is removed.
- **`MailGroup` type** — `ownerId: string` → `ownerIds: string[]`. All `group.ownerId === currentUser.id` checks migrate to `group.ownerIds.includes(currentUser.id)`.

## Phasing (demo scope)

**Phase A — Auth + read groups from DB**

- ASP.NET Core API + Postgres + EF Core migrations
- MSAL on frontend, JWT validation on backend, `/api/me`
- `HttpMailGroupService` wired up
- `GET /api/groups`, `GET /api/groups/{id}`
- Tables: `groups`, `group_owners`, `group_members`
- Seed 2–3 groups via migration for demo data

**Phase B — CRUD + members + Entra search**

- `POST/PATCH/DELETE /api/groups`
- Co-owners endpoints
- `POST/DELETE /api/groups/{id}/members`
- `GET /api/users/search` (Graph OBO)
- `AddMembersModal` switched to API

**Phase C — Public / Private + join requests**

- Visibility enforcement at the API
- Join request endpoints + UI

**Phase D — Broadcast mail**

- App-only Graph permission + service mailbox + `ApplicationAccessPolicy` (requires tenant admin action)
- `POST /api/groups/{id}/mail`, `mail_sends` journal
- "Compose" UI in `GroupDetail`

After Phase D the end-to-end demo is: log in → create a group → add people from Entra → subscribers receive a real email in Outlook.

**Out of scope for the demo:**

- Global `MailGroupsAdmin` role
- Dynamic groups (filter rules)
- B2B guests, arbitrary external emails
- Inbound mail to `group@company.com`
- Production deployment, k8s, observability stack

## Testing

- **Backend:** xUnit + `WebApplicationFactory`. `IGraphService` is replaced by a fake (same approach as Phase 1 plan). Database under test is real Postgres via Testcontainers; migrations run per suite. Coverage focus: authorization (Private invisible to outsiders), CRUD invariants (cannot remove the last owner), `sendMail` flow (fake Graph captures the `Bcc` list and the `mail_sends` row transitions queued → sent).
- **Frontend:** existing Vitest tests on `MockMailGroupService` stay. `HttpMailGroupService` gets a contract test against a stubbed fetch. Add UI tests for public/private visibility branches in `GroupDetail`.
- **Manual end-to-end checklist** (run before declaring the demo done):
  1. Two users in the dev tenant.
  2. User A logs in, creates a Public group, becomes its owner.
  3. User B logs in, finds the group in search, requests to join.
  4. User A approves the request.
  5. User A composes and sends a broadcast.
  6. User B receives the email in Outlook within ~1 minute, From = `mailgroups@company.com`.
  7. User A creates a Private group and adds User C manually; User B searching cannot find it.

## Open dependencies (require human action before Phase D)

- Tenant admin grants admin consent for delegated `User.ReadBasic.All` and application `Mail.Send`.
- Tenant admin creates the `mailgroups@company.com` mailbox and runs the `New-ApplicationAccessPolicy` PowerShell to scope `Mail.Send` to that mailbox only.
- These steps extend the existing runbook at `docs/setup/tenant-and-app-registrations.md`.
