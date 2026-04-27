# Microsoft Tenant Setup for MailGroups (dev)

This runbook is needed once per environment (dev sandbox, prod, etc.).

## 1. Tenant
Sign up at https://developer.microsoft.com/microsoft-365/dev-program → "Instant sandbox" with sample data.
Record:
- `TENANT_ID` — directory ID
- Tenant domain — e.g. `M365xNNNNNN.onmicrosoft.com`

## 2. API app registration
Entra admin center → App registrations → New registration:
- Name: `MailGroups API (<env>)`
- Single tenant
- No redirect URI

After register:
- Expose an API → App ID URI: `api://<API_CLIENT_ID>`
- Add scope `Groups.Read` (admins and users, enabled)
- API permissions → Microsoft Graph → Delegated:
  - `Group.Read.All`
  - `User.Read.All`
  - `User.Read`
- Grant admin consent

Record:
- `API_CLIENT_ID`
- `API_SCOPE` = `api://<API_CLIENT_ID>/Groups.Read`

Generate a client secret (Certificates & secrets → New client secret) → record value as
`API_CLIENT_SECRET` (only shown once).

## 3. SPA app registration
Entra admin center → App registrations → New registration:
- Name: `MailGroups SPA (<env>)`
- Single tenant
- Redirect URI: SPA platform → `http://localhost:5173` (add prod URLs later)

After register:
- API permissions → My APIs → MailGroups API → Delegated → `Groups.Read`
- Grant admin consent

Record:
- `SPA_CLIENT_ID`

## 4. Where these values go

`backend/.env` (gitignored):
- `AzureAd__TenantId=<TENANT_ID>`
- `AzureAd__ClientId=<API_CLIENT_ID>`
- `AzureAd__ClientSecret=<API_CLIENT_SECRET>`

`.env.local` (frontend, gitignored):
- `VITE_AZURE_TENANT_ID=<TENANT_ID>`
- `VITE_AZURE_SPA_CLIENT_ID=<SPA_CLIENT_ID>`
- `VITE_API_SCOPE=api://<API_CLIENT_ID>/Groups.Read`
- `VITE_API_BASE_URL=http://localhost:5080`
