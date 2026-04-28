# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — `tsc` typecheck (no emit) + `vite build` to `dist/`
- `npm run preview` — serve the production build
- `npm test` — run vitest once (jsdom env, globals enabled)
- `npm run test:watch` — vitest in watch mode
- Single test: `npx vitest run src/services/MockMailGroupService.test.ts` (or `-t "<name pattern>"`)

`tsconfig.json` excludes `*.test.ts(x)` from the build but `vitest/globals` is in `types`, so test files compile under vitest's own pipeline. Strict mode is on with `noUnusedLocals` / `noUnusedParameters` — unused symbols fail the build, not just lint.

## Architecture

Single-page React 19 + Vite + TypeScript + Ant Design (v6) app. No backend — all data lives in `localStorage`. The app is a UI mockup of a corporate "mail distribution group" admin tool (think a stripped-down Microsoft 365 group manager). UI copy is in English; some legacy comments in `types/index.ts` are in Russian.

### Data layer — service abstraction

The single most important architectural rule: **all data access goes through `mailGroupService` (`src/services/index.ts`), typed as `IMailGroupService`**. Pages and components must not touch `localStorage` or import `MockMailGroupService` directly.

- `IMailGroupService` (`src/services/IMailGroupService.ts`) — the contract. Groups, members, join requests, users.
- `MockMailGroupService` — current implementation. Stores under keys `mg_groups_v2`, `mg_requests_v2`, `mg_users_v2`. Seeds 5 users (including `user-1`) on first read; group seed list is empty. Group emails are synthesized as `${mailNickname}@company.com` (the `DOMAIN` constant).
- The whole abstraction exists so the mock can be swapped for a real backend (Microsoft Graph / company API) without touching UI. When adding a feature, extend the interface first, implement in the mock, then consume from React.

Domain types live in `src/types/index.ts`: `User`, `MailGroup`, `JoinRequest`, `CreateGroupInput`. `GroupType = 'regular' | 'dynamic'`, `GroupVisibility = 'Public' | 'Private'`.

### Auth / current user

There is no real auth. `CurrentUserContext` (`src/context/CurrentUserContext.tsx`) hard-codes the current user as `user-1` ("Current User"). `useCurrentUser()` is the only way to read it. Any "is this me?" check compares against `currentUser.id` (e.g. `group.ownerId === currentUser.id` for owner-only UI; `group.memberIds.includes(currentUser.id)` for membership).

### Routing

`App.tsx` mounts `BrowserRouter` inside an antd `ConfigProvider` (locale `enUS`, `colorPrimary: #0078D4`). Routes:

- `/` → redirect to `/groups`
- `/groups` → `GroupList` (search / tabs `all|subscriptions|mine|dynamic` / filters by business line, owner, tag / sort by date)
- `/groups/new` → `GroupCreate`
- `/groups/:id` → `GroupDetail` (group info, owner-only edit/delete/add-members, pending join requests, member list)

### Join request flow

Non-members see "Request to join" on `GroupDetail`. `submitJoinRequest` is idempotent — returns the existing pending request if one exists rather than creating a duplicate. Owners see a "Join requests" card with approve/reject. Approving moves the user into `memberIds` (and avoids adding duplicates). Rejecting just flips status.

### Adding members

`AddMembersModal` supports two flows in tabs: pick existing users by id, or paste/upload a list of emails (`.csv` / `.txt`, comma/semicolon/whitespace-separated). Unknown emails go through `findOrCreateUserByEmail`, which normalizes to lowercase and either returns the matching user or creates a new one. Owner cannot be removed via `removeMember` — the mock throws.

### Conventions

- Inline styles (no CSS modules / Tailwind). Brand color `#0078D4` is repeated throughout.
- Components keep their own loading/submitting state; after a mutating call, pages typically re-run their `load()` to refetch.
- Tags are managed via the small `MetaTagsInput` component and passed as a separate state alongside the antd `Form` (not as a form field).
- `mailNickname` is auto-derived from `displayName` in `GroupCreate` (`handleNameChange`): lowercased, spaces → `-`, non-`[a-z0-9-]` stripped, capped at 64 chars. The form field validates `^[a-z0-9-]+$`.
