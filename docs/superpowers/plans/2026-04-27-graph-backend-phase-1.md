# Microsoft Graph Backend — Phase 1 (Read-only end-to-end) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sign in with Microsoft SSO, list and view real Microsoft 365 groups from a dev tenant. End-to-end auth + Graph read flow proven before any mutations or persistence are added.

**Architecture:** ASP.NET Core 8 BFF API, JWT-protected, calls Microsoft Graph via the On-Behalf-Of flow using the user's token. Frontend uses MSAL.js to sign in, acquires an access token for our API, and calls REST endpoints. No Postgres, no mutations in this phase — those come in Phase 2. The frontend `IMailGroupService` gets a second implementation (`HttpMailGroupService`) selected by an env flag, so the existing `MockMailGroupService` continues to work for offline dev.

**Tech Stack:**
- Backend: .NET 8, ASP.NET Core, Microsoft.Identity.Web 3.x, Microsoft.Graph 5.x, xUnit
- Frontend: React 19 + Vite + TS + AntD; add `@azure/msal-browser`, `@azure/msal-react`
- Infra: Docker + docker-compose for local dev
- Tenant: Microsoft 365 Developer Program

**Out of scope for Phase 1 (will be separate plans):**
- Group CRUD (create / update / delete)
- Member add/remove, owner changes
- Postgres, EF Core, migrations
- Tags, business line, dynamic group rules
- Join requests
- B2B invitation flow
- Production deployment / k8s

---

## File Structure

```
backend/                                          ← new
  MailGroups.sln
  src/
    MailGroups.Api/
      MailGroups.Api.csproj
      Program.cs                                  ← entry point, DI, auth
      appsettings.json
      appsettings.Development.json
      Auth/
        AuthExtensions.cs                         ← AddMsalAuth(...) helper
      Controllers/
        GroupsController.cs                       ← GET /api/groups, /api/groups/{id}
        UsersController.cs                        ← GET /api/users, /api/users/{id}
        MeController.cs                           ← GET /api/me (current user)
      Services/
        IGraphService.cs
        GraphService.cs                           ← real Graph SDK calls
      Mappers/
        GroupMapper.cs                            ← Graph.Group → GroupDto
        UserMapper.cs                             ← Graph.User → UserDto
      Models/
        GroupDto.cs
        UserDto.cs
  tests/
    MailGroups.Api.Tests/
      MailGroups.Api.Tests.csproj
      Mappers/
        GroupMapperTests.cs
        UserMapperTests.cs
      Controllers/
        GroupsControllerTests.cs                  ← uses WebApplicationFactory + FakeGraphService
        UsersControllerTests.cs
      Fakes/
        FakeGraphService.cs
        TestAuthHandler.cs                        ← bypasses real Entra in tests
  Dockerfile
  docker-compose.yml
  .env.example

src/                                              ← existing frontend, modified
  auth/                                           ← new
    msalConfig.ts
    AuthProvider.tsx
    useApiToken.ts
  services/
    httpClient.ts                                 ← new, fetch wrapper with bearer
    HttpMailGroupService.ts                       ← new, IMailGroupService impl
    index.ts                                      ← modified, switch on env
  context/
    CurrentUserContext.tsx                        ← modified, reads MSAL account
  components/
    AppHeader.tsx                                 ← modified, sign-in / sign-out
  App.tsx                                         ← modified, wrap in MsalProvider

docs/
  superpowers/plans/2026-04-27-graph-backend-phase-1.md   ← this file
  setup/tenant-and-app-registrations.md           ← new, manual setup steps
```

---

## Task 0: Tenant + App Registrations (manual, documented)

**Files:**
- Create: `docs/setup/tenant-and-app-registrations.md`

This is a one-time human task. We document it precisely so it can be re-done in a company tenant later. No code commits in this task — just the runbook file.

- [ ] **Step 1: Sign up for Microsoft 365 Developer Program**

Go to https://developer.microsoft.com/microsoft-365/dev-program. Choose "Instant sandbox" with sample data. Record:
- Tenant ID (GUID)
- Tenant domain (e.g. `M365xNNNNNN.onmicrosoft.com`)
- Admin account email + password

- [ ] **Step 2: Register the API app**

Entra admin center → App registrations → New registration:
- Name: `MailGroups API (dev)`
- Account types: "Accounts in this organizational directory only — Single tenant"
- Redirect URI: leave blank
- Click Register, record `Application (client) ID` → `API_CLIENT_ID`

Then in the new app:
- "Expose an API" → Set Application ID URI to `api://<API_CLIENT_ID>`
- Add scope:
  - Scope name: `Groups.Read`
  - Who can consent: Admins and users
  - Admin consent display name: `Read mail groups`
  - Admin consent description: `Allows the app to list and read M365 groups on behalf of the signed-in user.`
  - State: Enabled
- "API permissions" → Add a permission → Microsoft Graph → Delegated permissions:
  - `Group.Read.All`
  - `User.Read.All`
  - `User.Read` (default)
- Click "Grant admin consent for <tenant>"
- Record the scope: `api://<API_CLIENT_ID>/Groups.Read` → `API_SCOPE`

- [ ] **Step 3: Register the SPA frontend app**

Entra admin center → App registrations → New registration:
- Name: `MailGroups SPA (dev)`
- Account types: Single tenant
- Redirect URI platform: "Single-page application", URI: `http://localhost:5173`
- Register, record `Application (client) ID` → `SPA_CLIENT_ID`

Then:
- "API permissions" → Add a permission → "My APIs" → select `MailGroups API (dev)` → Delegated → check `Groups.Read`
- Click "Grant admin consent"

- [ ] **Step 4: Create `docs/setup/tenant-and-app-registrations.md` with the runbook**

```markdown
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
```

- [ ] **Step 5: Commit**

```bash
git add docs/setup/tenant-and-app-registrations.md
git commit -m "docs: tenant + app registration runbook for Microsoft SSO"
```

---

## Task 1: Backend solution scaffold

**Files:**
- Create: `backend/MailGroups.sln`
- Create: `backend/src/MailGroups.Api/MailGroups.Api.csproj`
- Create: `backend/src/MailGroups.Api/Program.cs`
- Create: `backend/src/MailGroups.Api/appsettings.json`
- Create: `backend/src/MailGroups.Api/appsettings.Development.json`
- Create: `backend/tests/MailGroups.Api.Tests/MailGroups.Api.Tests.csproj`
- Create: `backend/.gitignore`

- [ ] **Step 1: Scaffold the solution**

Run from repo root:
```bash
mkdir -p backend && cd backend
dotnet new sln -n MailGroups
dotnet new webapi -n MailGroups.Api -o src/MailGroups.Api --use-controllers --no-openapi=false
dotnet new xunit -n MailGroups.Api.Tests -o tests/MailGroups.Api.Tests
dotnet sln add src/MailGroups.Api/MailGroups.Api.csproj
dotnet sln add tests/MailGroups.Api.Tests/MailGroups.Api.Tests.csproj
dotnet add tests/MailGroups.Api.Tests reference src/MailGroups.Api
```

Remove the auto-generated `WeatherForecast` controller and model:
```bash
rm -f src/MailGroups.Api/Controllers/WeatherForecastController.cs src/MailGroups.Api/WeatherForecast.cs
```

- [ ] **Step 2: Pin .NET 8 in csproj**

Open `backend/src/MailGroups.Api/MailGroups.Api.csproj` and ensure target is net8.0. Replace contents with:

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <RootNamespace>MailGroups.Api</RootNamespace>
  </PropertyGroup>
</Project>
```

Same for tests `backend/tests/MailGroups.Api.Tests/MailGroups.Api.Tests.csproj`:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <IsPackable>false</IsPackable>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.11.1" />
    <PackageReference Include="xunit" Version="2.9.2" />
    <PackageReference Include="xunit.runner.visualstudio" Version="2.8.2" />
    <PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" Version="8.0.10" />
  </ItemGroup>
  <ItemGroup>
    <ProjectReference Include="..\..\src\MailGroups.Api\MailGroups.Api.csproj" />
  </ItemGroup>
</Project>
```

- [ ] **Step 3: Set Kestrel port to 5080 for local dev**

Replace `backend/src/MailGroups.Api/appsettings.Development.json`:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "Kestrel": {
    "Endpoints": {
      "Http": { "Url": "http://localhost:5080" }
    }
  }
}
```

- [ ] **Step 4: Replace `Program.cs` with a minimal CORS-enabled skeleton**

Replace `backend/src/MailGroups.Api/Program.cs`:

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

const string DevCors = "DevCors";
builder.Services.AddCors(o => o.AddPolicy(DevCors, p =>
    p.WithOrigins("http://localhost:5173")
     .AllowAnyHeader()
     .AllowAnyMethod()));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors(DevCors);
app.MapControllers();
app.Run();
```

- [ ] **Step 5: Add a sanity GET that returns 200 (no auth yet)**

Create `backend/src/MailGroups.Api/Controllers/HealthController.cs`:

```csharp
using Microsoft.AspNetCore.Mvc;

namespace MailGroups.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new { status = "ok" });
}
```

- [ ] **Step 6: Build and run**

```bash
cd backend && dotnet build
dotnet run --project src/MailGroups.Api
```
Expected: server listening on http://localhost:5080. In another terminal:
```bash
curl http://localhost:5080/api/health
```
Expected: `{"status":"ok"}`. Stop server (Ctrl+C).

- [ ] **Step 7: Add `.gitignore`**

Create `backend/.gitignore`:

```
bin/
obj/
*.user
.vs/
appsettings.*.local.json
.env
```

- [ ] **Step 8: Commit**

```bash
git add backend
git commit -m "feat(backend): scaffold ASP.NET Core API with health endpoint"
```

---

## Task 2: Wire JWT auth + Microsoft.Identity.Web

**Files:**
- Modify: `backend/src/MailGroups.Api/MailGroups.Api.csproj`
- Modify: `backend/src/MailGroups.Api/Program.cs`
- Modify: `backend/src/MailGroups.Api/appsettings.json`
- Create: `backend/src/MailGroups.Api/Auth/AuthExtensions.cs`
- Create: `backend/src/MailGroups.Api/Controllers/MeController.cs`
- Create: `backend/.env.example`

- [ ] **Step 1: Add NuGet packages**

```bash
cd backend
dotnet add src/MailGroups.Api package Microsoft.Identity.Web --version 3.5.0
dotnet add src/MailGroups.Api package Microsoft.Identity.Web.MicrosoftGraph --version 3.5.0
```

- [ ] **Step 2: Add Azure AD config schema in `appsettings.json`**

Replace `backend/src/MailGroups.Api/appsettings.json`:

```json
{
  "Logging": {
    "LogLevel": { "Default": "Information", "Microsoft.AspNetCore": "Warning" }
  },
  "AllowedHosts": "*",
  "AzureAd": {
    "Instance": "https://login.microsoftonline.com/",
    "TenantId": "",
    "ClientId": "",
    "ClientSecret": "",
    "Scopes": "Groups.Read",
    "CallbackPath": "/signin-oidc"
  },
  "DownstreamApi": {
    "MicrosoftGraph": {
      "BaseUrl": "https://graph.microsoft.com/v1.0",
      "Scopes": "https://graph.microsoft.com/Group.Read.All https://graph.microsoft.com/User.Read.All"
    }
  }
}
```

- [ ] **Step 3: Create `AuthExtensions.cs`**

Create `backend/src/MailGroups.Api/Auth/AuthExtensions.cs`:

```csharp
using Microsoft.Graph;
using Microsoft.Identity.Web;

namespace MailGroups.Api.Auth;

public static class AuthExtensions
{
    public static IServiceCollection AddMsalAuth(this IServiceCollection services, IConfiguration cfg)
    {
        services
            .AddAuthentication(JwtBearerDefaults())
            .AddMicrosoftIdentityWebApi(cfg.GetSection("AzureAd"))
            .EnableTokenAcquisitionToCallDownstreamApi()
            .AddMicrosoftGraph(cfg.GetSection("DownstreamApi:MicrosoftGraph"))
            .AddInMemoryTokenCaches();

        services.AddAuthorization();
        return services;
    }

    private static string JwtBearerDefaults() =>
        Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
}
```

- [ ] **Step 4: Wire into `Program.cs`**

Replace `backend/src/MailGroups.Api/Program.cs`:

```csharp
using MailGroups.Api.Auth;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddMsalAuth(builder.Configuration);

const string DevCors = "DevCors";
builder.Services.AddCors(o => o.AddPolicy(DevCors, p =>
    p.WithOrigins("http://localhost:5173")
     .AllowAnyHeader()
     .AllowAnyMethod()));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors(DevCors);
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();

// Make Program visible to WebApplicationFactory in tests
public partial class Program { }
```

- [ ] **Step 5: Add an authenticated endpoint to verify the flow**

Create `backend/src/MailGroups.Api/Controllers/MeController.cs`:

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Graph;
using Microsoft.Identity.Web.Resource;

namespace MailGroups.Api.Controllers;

[ApiController]
[Authorize]
[RequiredScope("Groups.Read")]
[Route("api/[controller]")]
public class MeController : ControllerBase
{
    private readonly GraphServiceClient _graph;
    public MeController(GraphServiceClient graph) => _graph = graph;

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var me = await _graph.Me.GetAsync();
        return Ok(new { id = me?.Id, displayName = me?.DisplayName, mail = me?.Mail });
    }
}
```

- [ ] **Step 6: Create `.env.example`**

Create `backend/.env.example`:

```
# Copy to .env and fill in from docs/setup/tenant-and-app-registrations.md
AzureAd__TenantId=
AzureAd__ClientId=
AzureAd__ClientSecret=
```

- [ ] **Step 7: Build and start**

```bash
cd backend
dotnet build
dotnet run --project src/MailGroups.Api
```
Expected: starts. `curl http://localhost:5080/api/me` → 401 Unauthorized. (Real token testing happens in Task 3 once frontend MSAL is wired, or via Swagger manually — defer.)

- [ ] **Step 8: Commit**

```bash
git add backend
git commit -m "feat(backend): JWT auth via Microsoft.Identity.Web + GraphServiceClient + /api/me"
```

---

## Task 3: GraphService abstraction

**Files:**
- Create: `backend/src/MailGroups.Api/Services/IGraphService.cs`
- Create: `backend/src/MailGroups.Api/Services/GraphService.cs`
- Create: `backend/src/MailGroups.Api/Models/GroupDto.cs`
- Create: `backend/src/MailGroups.Api/Models/UserDto.cs`
- Modify: `backend/src/MailGroups.Api/Program.cs`

We don't call `GraphServiceClient` directly from controllers — we wrap it so we can fake it in tests.

- [ ] **Step 1: Define DTOs that mirror the frontend types**

Create `backend/src/MailGroups.Api/Models/GroupDto.cs`:

```csharp
namespace MailGroups.Api.Models;

public record GroupDto(
    string Id,
    string DisplayName,
    string MailNickname,
    string Mail,
    string? Description,
    string? OwnerId,
    IReadOnlyList<string> MemberIds,
    string Type,           // "regular" | "dynamic"
    string Visibility,     // "Public" | "Private"
    bool HideFromAddressLists,
    DateTime? CreatedAt
);
```

Create `backend/src/MailGroups.Api/Models/UserDto.cs`:

```csharp
namespace MailGroups.Api.Models;

public record UserDto(
    string Id,
    string DisplayName,
    string Mail
);
```

- [ ] **Step 2: Define the interface**

Create `backend/src/MailGroups.Api/Services/IGraphService.cs`:

```csharp
using MailGroups.Api.Models;

namespace MailGroups.Api.Services;

public interface IGraphService
{
    Task<IReadOnlyList<GroupDto>> ListGroupsAsync(CancellationToken ct);
    Task<GroupDto?> GetGroupAsync(string id, CancellationToken ct);
    Task<UserDto?> GetUserAsync(string id, CancellationToken ct);
    Task<IReadOnlyList<UserDto>> ListUsersAsync(string? search, CancellationToken ct);
    Task<UserDto?> GetMeAsync(CancellationToken ct);
}
```

- [ ] **Step 3: Implement against Microsoft.Graph 5.x**

Create `backend/src/MailGroups.Api/Services/GraphService.cs`:

```csharp
using MailGroups.Api.Mappers;
using MailGroups.Api.Models;
using Microsoft.Graph;

namespace MailGroups.Api.Services;

public sealed class GraphService : IGraphService
{
    private readonly GraphServiceClient _graph;
    public GraphService(GraphServiceClient graph) => _graph = graph;

    public async Task<IReadOnlyList<GroupDto>> ListGroupsAsync(CancellationToken ct)
    {
        var resp = await _graph.Groups.GetAsync(req =>
        {
            req.QueryParameters.Select = new[]
            {
                "id","displayName","mailNickname","mail","description",
                "visibility","groupTypes","hideFromAddressLists","createdDateTime"
            };
            req.QueryParameters.Top = 200;
        }, ct);

        var groups = resp?.Value ?? new List<Microsoft.Graph.Models.Group>();
        var result = new List<GroupDto>(groups.Count);
        foreach (var g in groups)
        {
            var ownerId = await GetFirstOwnerIdAsync(g.Id!, ct);
            var memberIds = await GetMemberIdsAsync(g.Id!, ct);
            result.Add(GroupMapper.ToDto(g, ownerId, memberIds));
        }
        return result;
    }

    public async Task<GroupDto?> GetGroupAsync(string id, CancellationToken ct)
    {
        var g = await _graph.Groups[id].GetAsync(req =>
        {
            req.QueryParameters.Select = new[]
            {
                "id","displayName","mailNickname","mail","description",
                "visibility","groupTypes","hideFromAddressLists","createdDateTime"
            };
        }, ct);
        if (g is null) return null;
        var ownerId = await GetFirstOwnerIdAsync(id, ct);
        var memberIds = await GetMemberIdsAsync(id, ct);
        return GroupMapper.ToDto(g, ownerId, memberIds);
    }

    public async Task<UserDto?> GetUserAsync(string id, CancellationToken ct)
    {
        var u = await _graph.Users[id].GetAsync(req =>
            req.QueryParameters.Select = new[] { "id", "displayName", "mail" }, ct);
        return u is null ? null : UserMapper.ToDto(u);
    }

    public async Task<IReadOnlyList<UserDto>> ListUsersAsync(string? search, CancellationToken ct)
    {
        var resp = await _graph.Users.GetAsync(req =>
        {
            req.QueryParameters.Select = new[] { "id", "displayName", "mail" };
            req.QueryParameters.Top = 200;
            if (!string.IsNullOrWhiteSpace(search))
            {
                req.QueryParameters.Search = $"\"displayName:{search}\" OR \"mail:{search}\"";
                req.Headers.Add("ConsistencyLevel", "eventual");
            }
        }, ct);
        return (resp?.Value ?? new List<Microsoft.Graph.Models.User>())
            .Select(UserMapper.ToDto).ToList();
    }

    public async Task<UserDto?> GetMeAsync(CancellationToken ct)
    {
        var u = await _graph.Me.GetAsync(req =>
            req.QueryParameters.Select = new[] { "id", "displayName", "mail" }, ct);
        return u is null ? null : UserMapper.ToDto(u);
    }

    private async Task<string?> GetFirstOwnerIdAsync(string groupId, CancellationToken ct)
    {
        var resp = await _graph.Groups[groupId].Owners.GetAsync(req =>
            req.QueryParameters.Top = 1, ct);
        return resp?.Value?.FirstOrDefault()?.Id;
    }

    private async Task<IReadOnlyList<string>> GetMemberIdsAsync(string groupId, CancellationToken ct)
    {
        var resp = await _graph.Groups[groupId].Members.GetAsync(req =>
        {
            req.QueryParameters.Select = new[] { "id" };
            req.QueryParameters.Top = 999;
        }, ct);
        return (resp?.Value ?? new())
            .Where(m => m.Id is not null).Select(m => m.Id!).ToList();
    }
}
```

> **Note on N+1**: ListGroupsAsync currently calls owners + members per group. Acceptable for Phase 1 with small dev tenants (≤10 groups). Phase 2 will switch to `$expand=members($select=id),owners($select=id)` once we confirm Graph behavior; documenting now so it isn't forgotten.

- [ ] **Step 4: Register in DI**

Modify `backend/src/MailGroups.Api/Program.cs` — after `AddMsalAuth(...)` line, add:

```csharp
builder.Services.AddScoped<MailGroups.Api.Services.IGraphService, MailGroups.Api.Services.GraphService>();
```

- [ ] **Step 5: Verify it builds**

```bash
cd backend && dotnet build
```
Expected: PASS. (Mappers in next task — `GroupMapper` / `UserMapper` will be missing here. Reorder: do Task 4 before this build check. Skip the build for now.)

- [ ] **Step 6: Commit (after Task 4 mappers exist and build passes)**

Defer commit until Task 4 completes.

---

## Task 4: Mappers + their unit tests

**Files:**
- Create: `backend/src/MailGroups.Api/Mappers/GroupMapper.cs`
- Create: `backend/src/MailGroups.Api/Mappers/UserMapper.cs`
- Create: `backend/tests/MailGroups.Api.Tests/Mappers/GroupMapperTests.cs`
- Create: `backend/tests/MailGroups.Api.Tests/Mappers/UserMapperTests.cs`

- [ ] **Step 1: Write the failing GroupMapper test**

Create `backend/tests/MailGroups.Api.Tests/Mappers/GroupMapperTests.cs`:

```csharp
using MailGroups.Api.Mappers;
using Microsoft.Graph.Models;
using Xunit;

namespace MailGroups.Api.Tests.Mappers;

public class GroupMapperTests
{
    [Fact]
    public void Maps_basic_fields()
    {
        var g = new Group
        {
            Id = "g1",
            DisplayName = "Finance",
            MailNickname = "finance",
            Mail = "finance@contoso.com",
            Description = "desc",
            Visibility = "Public",
            GroupTypes = new List<string> { "Unified" },
            HideFromAddressLists = false,
            CreatedDateTime = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero),
        };

        var dto = GroupMapper.ToDto(g, ownerId: "owner-1", memberIds: new[] { "u1", "u2" });

        Assert.Equal("g1", dto.Id);
        Assert.Equal("Finance", dto.DisplayName);
        Assert.Equal("finance", dto.MailNickname);
        Assert.Equal("finance@contoso.com", dto.Mail);
        Assert.Equal("Public", dto.Visibility);
        Assert.Equal("regular", dto.Type);
        Assert.False(dto.HideFromAddressLists);
        Assert.Equal("owner-1", dto.OwnerId);
        Assert.Equal(new[] { "u1", "u2" }, dto.MemberIds);
    }

    [Fact]
    public void Type_is_dynamic_when_DynamicMembership_in_groupTypes()
    {
        var g = new Group
        {
            Id = "g2",
            DisplayName = "Auto",
            MailNickname = "auto",
            GroupTypes = new List<string> { "Unified", "DynamicMembership" }
        };
        var dto = GroupMapper.ToDto(g, null, Array.Empty<string>());
        Assert.Equal("dynamic", dto.Type);
    }

    [Fact]
    public void Defaults_visibility_to_Public_when_null()
    {
        var g = new Group { Id = "g3", DisplayName = "x", MailNickname = "x" };
        var dto = GroupMapper.ToDto(g, null, Array.Empty<string>());
        Assert.Equal("Public", dto.Visibility);
    }
}
```

- [ ] **Step 2: Run — should fail (mapper not defined)**

```bash
cd backend && dotnet test tests/MailGroups.Api.Tests --filter FullyQualifiedName~GroupMapperTests
```
Expected: build error / class not found.

- [ ] **Step 3: Implement GroupMapper**

Create `backend/src/MailGroups.Api/Mappers/GroupMapper.cs`:

```csharp
using MailGroups.Api.Models;
using GraphGroup = Microsoft.Graph.Models.Group;

namespace MailGroups.Api.Mappers;

public static class GroupMapper
{
    public static GroupDto ToDto(GraphGroup g, string? ownerId, IReadOnlyList<string> memberIds)
    {
        var isDynamic = g.GroupTypes?.Contains("DynamicMembership") == true;
        return new GroupDto(
            Id: g.Id ?? string.Empty,
            DisplayName: g.DisplayName ?? string.Empty,
            MailNickname: g.MailNickname ?? string.Empty,
            Mail: g.Mail ?? string.Empty,
            Description: g.Description,
            OwnerId: ownerId,
            MemberIds: memberIds,
            Type: isDynamic ? "dynamic" : "regular",
            Visibility: g.Visibility ?? "Public",
            HideFromAddressLists: g.HideFromAddressLists ?? false,
            CreatedAt: g.CreatedDateTime?.UtcDateTime
        );
    }
}
```

- [ ] **Step 4: Run — should pass**

```bash
dotnet test tests/MailGroups.Api.Tests --filter FullyQualifiedName~GroupMapperTests
```
Expected: 3 tests PASS.

- [ ] **Step 5: Write UserMapper test**

Create `backend/tests/MailGroups.Api.Tests/Mappers/UserMapperTests.cs`:

```csharp
using MailGroups.Api.Mappers;
using Microsoft.Graph.Models;
using Xunit;

namespace MailGroups.Api.Tests.Mappers;

public class UserMapperTests
{
    [Fact]
    public void Maps_basic_fields()
    {
        var u = new User { Id = "u1", DisplayName = "Alice", Mail = "alice@contoso.com" };
        var dto = UserMapper.ToDto(u);
        Assert.Equal("u1", dto.Id);
        Assert.Equal("Alice", dto.DisplayName);
        Assert.Equal("alice@contoso.com", dto.Mail);
    }

    [Fact]
    public void Falls_back_to_userPrincipalName_when_mail_is_null()
    {
        var u = new User { Id = "u2", DisplayName = "Bob", Mail = null, UserPrincipalName = "bob@contoso.com" };
        var dto = UserMapper.ToDto(u);
        Assert.Equal("bob@contoso.com", dto.Mail);
    }
}
```

- [ ] **Step 6: Implement UserMapper**

Create `backend/src/MailGroups.Api/Mappers/UserMapper.cs`:

```csharp
using MailGroups.Api.Models;
using GraphUser = Microsoft.Graph.Models.User;

namespace MailGroups.Api.Mappers;

public static class UserMapper
{
    public static UserDto ToDto(GraphUser u) => new(
        Id: u.Id ?? string.Empty,
        DisplayName: u.DisplayName ?? string.Empty,
        Mail: u.Mail ?? u.UserPrincipalName ?? string.Empty
    );
}
```

- [ ] **Step 7: Run all tests**

```bash
dotnet test
```
Expected: all PASS, full build succeeds.

- [ ] **Step 8: Commit**

```bash
git add backend
git commit -m "feat(backend): GraphService + DTO mappers with unit tests"
```

---

## Task 5: Controllers + integration tests with FakeGraphService

**Files:**
- Create: `backend/src/MailGroups.Api/Controllers/GroupsController.cs`
- Create: `backend/src/MailGroups.Api/Controllers/UsersController.cs`
- Modify: `backend/src/MailGroups.Api/Controllers/MeController.cs`
- Create: `backend/tests/MailGroups.Api.Tests/Fakes/FakeGraphService.cs`
- Create: `backend/tests/MailGroups.Api.Tests/Fakes/TestAuthHandler.cs`
- Create: `backend/tests/MailGroups.Api.Tests/Fakes/TestWebApplicationFactory.cs`
- Create: `backend/tests/MailGroups.Api.Tests/Controllers/GroupsControllerTests.cs`
- Create: `backend/tests/MailGroups.Api.Tests/Controllers/UsersControllerTests.cs`

- [ ] **Step 1: Add `Microsoft.AspNetCore.Mvc.Testing` (already done in Task 1) — verify**

Already in tests `csproj`. Skip.

- [ ] **Step 2: Build the GroupsController test first**

Create `backend/tests/MailGroups.Api.Tests/Fakes/FakeGraphService.cs`:

```csharp
using MailGroups.Api.Models;
using MailGroups.Api.Services;

namespace MailGroups.Api.Tests.Fakes;

public sealed class FakeGraphService : IGraphService
{
    public List<GroupDto> Groups { get; } = new();
    public List<UserDto> Users { get; } = new();
    public UserDto? Me { get; set; }

    public Task<IReadOnlyList<GroupDto>> ListGroupsAsync(CancellationToken ct)
        => Task.FromResult<IReadOnlyList<GroupDto>>(Groups);
    public Task<GroupDto?> GetGroupAsync(string id, CancellationToken ct)
        => Task.FromResult(Groups.FirstOrDefault(g => g.Id == id));
    public Task<UserDto?> GetUserAsync(string id, CancellationToken ct)
        => Task.FromResult(Users.FirstOrDefault(u => u.Id == id));
    public Task<IReadOnlyList<UserDto>> ListUsersAsync(string? search, CancellationToken ct)
        => Task.FromResult<IReadOnlyList<UserDto>>(Users);
    public Task<UserDto?> GetMeAsync(CancellationToken ct) => Task.FromResult(Me);
}
```

- [ ] **Step 3: Test auth handler that bypasses Entra**

Create `backend/tests/MailGroups.Api.Tests/Fakes/TestAuthHandler.cs`:

```csharp
using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace MailGroups.Api.Tests.Fakes;

public class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "Test";

    public TestAuthHandler(IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger, UrlEncoder encoder)
        : base(options, logger, encoder) { }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "test-user"),
            new Claim("http://schemas.microsoft.com/identity/claims/scope", "Groups.Read"),
        };
        var ticket = new AuthenticationTicket(
            new ClaimsPrincipal(new ClaimsIdentity(claims, SchemeName)),
            SchemeName);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
```

- [ ] **Step 4: Test factory that swaps Graph + auth**

Create `backend/tests/MailGroups.Api.Tests/Fakes/TestWebApplicationFactory.cs`:

```csharp
using MailGroups.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace MailGroups.Api.Tests.Fakes;

public class TestWebApplicationFactory : WebApplicationFactory<Program>
{
    public FakeGraphService Graph { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureAppConfiguration((_, cfg) =>
        {
            cfg.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AzureAd:Instance"] = "https://login.microsoftonline.com/",
                ["AzureAd:TenantId"] = "00000000-0000-0000-0000-000000000000",
                ["AzureAd:ClientId"] = "00000000-0000-0000-0000-000000000000",
                ["AzureAd:ClientSecret"] = "test",
            });
        });
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IGraphService>();
            services.AddSingleton<IGraphService>(Graph);

            services.AddAuthentication(TestAuthHandler.SchemeName)
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, _ => { });
            services.PostConfigure<AuthenticationOptions>(o =>
            {
                o.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                o.DefaultChallengeScheme = TestAuthHandler.SchemeName;
            });
        });
    }
}
```

(`RemoveAll` lives in `Microsoft.Extensions.DependencyInjection.Extensions`. Add `using Microsoft.Extensions.DependencyInjection.Extensions;` if needed.)

- [ ] **Step 5: Write GroupsController integration test (failing)**

Create `backend/tests/MailGroups.Api.Tests/Controllers/GroupsControllerTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Json;
using MailGroups.Api.Models;
using MailGroups.Api.Tests.Fakes;
using Xunit;

namespace MailGroups.Api.Tests.Controllers;

public class GroupsControllerTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    public GroupsControllerTests(TestWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task GET_groups_returns_list_from_GraphService()
    {
        _factory.Graph.Groups.Clear();
        _factory.Graph.Groups.Add(new GroupDto(
            "g1", "Finance", "finance", "finance@contoso.com",
            "desc", "owner-1", new[] { "u1" }, "regular", "Public", false,
            DateTime.UtcNow));

        var client = _factory.CreateClient();
        var resp = await client.GetAsync("/api/groups");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var groups = await resp.Content.ReadFromJsonAsync<List<GroupDto>>();
        Assert.NotNull(groups);
        Assert.Single(groups!);
        Assert.Equal("Finance", groups![0].DisplayName);
    }

    [Fact]
    public async Task GET_groups_id_returns_404_when_missing()
    {
        _factory.Graph.Groups.Clear();
        var client = _factory.CreateClient();
        var resp = await client.GetAsync("/api/groups/missing-id");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }
}
```

- [ ] **Step 6: Run — should fail (controller not defined)**

```bash
cd backend && dotnet test --filter FullyQualifiedName~GroupsControllerTests
```
Expected: 404 on every call (controllers don't exist) → tests FAIL.

- [ ] **Step 7: Implement GroupsController**

Create `backend/src/MailGroups.Api/Controllers/GroupsController.cs`:

```csharp
using MailGroups.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Identity.Web.Resource;

namespace MailGroups.Api.Controllers;

[ApiController]
[Authorize]
[RequiredScope("Groups.Read")]
[Route("api/[controller]")]
public class GroupsController : ControllerBase
{
    private readonly IGraphService _graph;
    public GroupsController(IGraphService graph) => _graph = graph;

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
        => Ok(await _graph.ListGroupsAsync(ct));

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(string id, CancellationToken ct)
    {
        var g = await _graph.GetGroupAsync(id, ct);
        return g is null ? NotFound() : Ok(g);
    }
}
```

- [ ] **Step 8: Run tests — should pass**

```bash
dotnet test --filter FullyQualifiedName~GroupsControllerTests
```
Expected: 2 tests PASS.

> **Snag heads-up**: `[RequiredScope]` may reject the test handler because the scope claim shape differs. If tests fail with 403, remove `[RequiredScope]` from the test path — switch to a custom `[Authorize(Policy = "RequireGroupsRead")]` and define the policy to accept either claim type. Document by writing the policy:
> ```csharp
> // in AuthExtensions.cs AddMsalAuth:
> services.AddAuthorization(o => o.AddPolicy("RequireGroupsRead",
>     p => p.RequireAssertion(ctx =>
>         ctx.User.HasClaim(c =>
>             (c.Type.EndsWith("/scope") || c.Type == "scp") &&
>             c.Value.Split(' ').Contains("Groups.Read")))));
> ```
> Replace `[RequiredScope("Groups.Read")]` with `[Authorize(Policy = "RequireGroupsRead")]` on every controller. Apply this fix only if integration tests fail; otherwise leave `[RequiredScope]`.

- [ ] **Step 9: Add UsersController + tests**

Create `backend/tests/MailGroups.Api.Tests/Controllers/UsersControllerTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Json;
using MailGroups.Api.Models;
using MailGroups.Api.Tests.Fakes;
using Xunit;

namespace MailGroups.Api.Tests.Controllers;

public class UsersControllerTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    public UsersControllerTests(TestWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task GET_users_returns_list()
    {
        _factory.Graph.Users.Clear();
        _factory.Graph.Users.Add(new UserDto("u1", "Alice", "alice@contoso.com"));
        var client = _factory.CreateClient();
        var resp = await client.GetAsync("/api/users");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var users = await resp.Content.ReadFromJsonAsync<List<UserDto>>();
        Assert.Single(users!);
    }

    [Fact]
    public async Task GET_user_returns_404_when_missing()
    {
        _factory.Graph.Users.Clear();
        var client = _factory.CreateClient();
        var resp = await client.GetAsync("/api/users/nope");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }
}
```

Run: should fail (controller missing).

Create `backend/src/MailGroups.Api/Controllers/UsersController.cs`:

```csharp
using MailGroups.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Identity.Web.Resource;

namespace MailGroups.Api.Controllers;

[ApiController]
[Authorize]
[RequiredScope("Groups.Read")]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IGraphService _graph;
    public UsersController(IGraphService graph) => _graph = graph;

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? search, CancellationToken ct)
        => Ok(await _graph.ListUsersAsync(search, ct));

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(string id, CancellationToken ct)
    {
        var u = await _graph.GetUserAsync(id, ct);
        return u is null ? NotFound() : Ok(u);
    }
}
```

Run tests — should pass.

- [ ] **Step 10: Replace `MeController` to use `IGraphService`**

Replace `backend/src/MailGroups.Api/Controllers/MeController.cs`:

```csharp
using MailGroups.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Identity.Web.Resource;

namespace MailGroups.Api.Controllers;

[ApiController]
[Authorize]
[RequiredScope("Groups.Read")]
[Route("api/[controller]")]
public class MeController : ControllerBase
{
    private readonly IGraphService _graph;
    public MeController(IGraphService graph) => _graph = graph;

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var me = await _graph.GetMeAsync(ct);
        return me is null ? NotFound() : Ok(me);
    }
}
```

- [ ] **Step 11: Run all tests**

```bash
dotnet test
```
Expected: all PASS.

- [ ] **Step 12: Commit**

```bash
git add backend
git commit -m "feat(backend): GroupsController + UsersController + MeController with integration tests"
```

---

## Task 6: Dockerize backend

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/docker-compose.yml`
- Create: `backend/.dockerignore`

- [ ] **Step 1: Multi-stage Dockerfile**

Create `backend/Dockerfile`:

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY MailGroups.sln ./
COPY src/MailGroups.Api/MailGroups.Api.csproj src/MailGroups.Api/
COPY tests/MailGroups.Api.Tests/MailGroups.Api.Tests.csproj tests/MailGroups.Api.Tests/
RUN dotnet restore src/MailGroups.Api/MailGroups.Api.csproj
COPY . .
RUN dotnet publish src/MailGroups.Api/MailGroups.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish ./
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "MailGroups.Api.dll"]
```

- [ ] **Step 2: `.dockerignore`**

Create `backend/.dockerignore`:

```
**/bin
**/obj
**/.vs
**/.git
**/node_modules
**/.env
```

- [ ] **Step 3: docker-compose for local dev**

Create `backend/docker-compose.yml`:

```yaml
services:
  api:
    build: .
    container_name: mailgroups-api
    ports:
      - "5080:8080"
    environment:
      - ASPNETCORE_ENVIRONMENT=Development
      - AzureAd__Instance=https://login.microsoftonline.com/
      - AzureAd__TenantId=${AzureAd__TenantId}
      - AzureAd__ClientId=${AzureAd__ClientId}
      - AzureAd__ClientSecret=${AzureAd__ClientSecret}
    env_file: .env
```

- [ ] **Step 4: Build the image**

```bash
cd backend && docker build -t mailgroups-api:dev .
```
Expected: succeeds.

- [ ] **Step 5: Up the stack (requires `.env` filled per Task 0)**

```bash
docker compose up -d
curl http://localhost:5080/api/health
```
Expected: `{"status":"ok"}`. Then:
```bash
docker compose down
```

- [ ] **Step 6: Commit**

```bash
git add backend/Dockerfile backend/docker-compose.yml backend/.dockerignore
git commit -m "feat(backend): Dockerfile + docker-compose for local dev"
```

---

## Task 7: Frontend — MSAL setup

**Files:**
- Modify: `package.json` (add deps)
- Create: `src/auth/msalConfig.ts`
- Create: `src/auth/AuthProvider.tsx`
- Create: `src/auth/useApiToken.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/AppHeader.tsx`
- Modify: `src/context/CurrentUserContext.tsx`
- Create: `.env.local.example`

- [ ] **Step 1: Install MSAL packages**

```bash
npm install @azure/msal-browser@^3.27 @azure/msal-react@^2.2
```

- [ ] **Step 2: Create `src/auth/msalConfig.ts`**

```ts
import { Configuration, PublicClientApplication, LogLevel } from '@azure/msal-browser'

const tenantId = import.meta.env.VITE_AZURE_TENANT_ID
const clientId = import.meta.env.VITE_AZURE_SPA_CLIENT_ID
export const apiScope = import.meta.env.VITE_API_SCOPE

if (!tenantId || !clientId || !apiScope) {
  // Helpful failure when env is misconfigured rather than silent broken auth
  // eslint-disable-next-line no-console
  console.error('Missing VITE_AZURE_TENANT_ID / VITE_AZURE_SPA_CLIENT_ID / VITE_API_SCOPE')
}

export const msalConfig: Configuration = {
  auth: {
    clientId: clientId ?? '',
    authority: `https://login.microsoftonline.com/${tenantId ?? 'common'}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Warning,
      loggerCallback: (_l, m) => console.log(m),
      piiLoggingEnabled: false,
    },
  },
}

export const loginRequest = { scopes: [apiScope ?? ''] }

export const msalInstance = new PublicClientApplication(msalConfig)
await msalInstance.initialize()
```

- [ ] **Step 3: Create `src/auth/AuthProvider.tsx`**

```tsx
import { ReactNode } from 'react'
import { MsalProvider, AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from '@azure/msal-react'
import { Button } from 'antd'
import { msalInstance, loginRequest } from './msalConfig'

function SignInGate() {
  const { instance } = useMsal()
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ marginBottom: 16 }}>Mail Groups</h2>
        <Button type="primary" size="large" onClick={() => instance.loginRedirect(loginRequest)}>
          Sign in with Microsoft
        </Button>
      </div>
    </div>
  )
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <MsalProvider instance={msalInstance}>
      <AuthenticatedTemplate>{children}</AuthenticatedTemplate>
      <UnauthenticatedTemplate><SignInGate /></UnauthenticatedTemplate>
    </MsalProvider>
  )
}
```

- [ ] **Step 4: Create `src/auth/useApiToken.ts`**

```ts
import { useMsal } from '@azure/msal-react'
import { loginRequest } from './msalConfig'
import { InteractionRequiredAuthError } from '@azure/msal-browser'

export function useApiToken() {
  const { instance, accounts } = useMsal()
  return async (): Promise<string> => {
    const account = accounts[0]
    if (!account) throw new Error('Not signed in')
    try {
      const r = await instance.acquireTokenSilent({ ...loginRequest, account })
      return r.accessToken
    } catch (e) {
      if (e instanceof InteractionRequiredAuthError) {
        await instance.acquireTokenRedirect({ ...loginRequest, account })
      }
      throw e
    }
  }
}
```

- [ ] **Step 5: Wrap `App` with `AuthProvider` only when env enables backend**

Modify `src/App.tsx`. After the imports add:

```tsx
import AuthProvider from './auth/AuthProvider'
```

Then wrap `BrowserRouter` content. Replace the body of the component:

```tsx
const useBackend = !!import.meta.env.VITE_API_BASE_URL

const tree = (
  <BrowserRouter>
    <CurrentUserProvider>
      <div style={{ minHeight: '100vh', background: colors.surface }}>
        <AppHeader />
        <main style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px 64px' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/groups" replace />} />
            <Route path="/groups" element={<GroupList />} />
            <Route path="/groups/new" element={<GroupCreate />} />
            <Route path="/groups/:id" element={<GroupDetail />} />
          </Routes>
        </main>
      </div>
    </CurrentUserProvider>
  </BrowserRouter>
)

return (
  <ConfigProvider locale={enUS} theme={{ /* unchanged */ }}>
    {useBackend ? <AuthProvider>{tree}</AuthProvider> : tree}
  </ConfigProvider>
)
```

- [ ] **Step 6: Update `CurrentUserContext` to use the signed-in account when backend is on**

Modify `src/context/CurrentUserContext.tsx` — read existing first to preserve mock fallback. Then:

```tsx
import { createContext, useContext, ReactNode, useEffect, useState } from 'react'
import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import type { User } from '../types'

const FALLBACK: User = { id: 'user-1', displayName: 'Current User', mail: 'current.user@company.com' }

const Ctx = createContext<User>(FALLBACK)
export const useCurrentUser = () => useContext(Ctx)

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const useBackend = !!import.meta.env.VITE_API_BASE_URL
  if (!useBackend) return <Ctx.Provider value={FALLBACK}>{children}</Ctx.Provider>
  return <BackendCurrentUser>{children}</BackendCurrentUser>
}

function BackendCurrentUser({ children }: { children: ReactNode }) {
  const { accounts } = useMsal()
  const isAuth = useIsAuthenticated()
  const [user, setUser] = useState<User>(FALLBACK)

  useEffect(() => {
    if (!isAuth || accounts.length === 0) return
    const a = accounts[0]
    setUser({
      id: (a.idTokenClaims as { oid?: string })?.oid ?? a.localAccountId,
      displayName: a.name ?? a.username,
      mail: a.username,
    })
  }, [isAuth, accounts])

  return <Ctx.Provider value={user}>{children}</Ctx.Provider>
}
```

- [ ] **Step 7: Add a sign-out button to `AppHeader`**

Modify `src/components/AppHeader.tsx`. Replace the right-hand block to include the button when backend is on:

```tsx
import { Avatar, Typography, Button } from 'antd'
import { MailOutlined, LogoutOutlined } from '@ant-design/icons'
import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { useCurrentUser } from '../context/CurrentUserContext'
import { colors } from '../theme'

export default function AppHeader() {
  const user = useCurrentUser()
  const useBackend = !!import.meta.env.VITE_API_BASE_URL
  const { instance } = useMsal()
  const isAuth = useIsAuthenticated()

  return (
    <header style={{
      background: colors.surfaceRaised,
      borderBottom: `1px solid ${colors.border}`,
      padding: '0 32px',
      height: 60,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <MailOutlined style={{ fontSize: 20, color: colors.primary }} />
        <Typography.Text strong style={{ fontSize: 16, color: colors.text, letterSpacing: '-0.01em' }}>
          Mail Groups
        </Typography.Text>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Typography.Text type="secondary" style={{ fontSize: 13, color: colors.textMuted }}>
          {user.displayName}
        </Typography.Text>
        <Avatar size={32} style={{ fontSize: 13, cursor: 'default' }}>
          {user.displayName.slice(0, 1)}
        </Avatar>
        {useBackend && isAuth && (
          <Button type="text" icon={<LogoutOutlined />} onClick={() => instance.logoutRedirect()} />
        )}
      </div>
    </header>
  )
}
```

- [ ] **Step 8: Create `.env.local.example`**

Create at repo root `/.env.local.example`:

```
# Copy to .env.local. If unset, the app uses the in-browser mock service.
VITE_API_BASE_URL=http://localhost:5080
VITE_AZURE_TENANT_ID=
VITE_AZURE_SPA_CLIENT_ID=
VITE_API_SCOPE=
```

- [ ] **Step 9: Typecheck + start**

```bash
npx tsc --noEmit
npm run dev
```
Expected: typecheck passes; dev server starts. With `VITE_API_BASE_URL` unset → app behaves as before (mock). With it set + tenant config → sign-in screen appears.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json src/auth src/App.tsx src/components/AppHeader.tsx src/context/CurrentUserContext.tsx .env.local.example
git commit -m "feat(frontend): MSAL.js sign-in flow with env-gated AuthProvider"
```

---

## Task 8: Frontend — HttpMailGroupService

**Files:**
- Create: `src/services/httpClient.ts`
- Create: `src/services/HttpMailGroupService.ts`
- Modify: `src/services/index.ts`
- Read first: `src/services/IMailGroupService.ts` (to mirror its signature)
- Read first: `src/services/MockMailGroupService.ts` (to know what mutation methods exist)

- [ ] **Step 1: Read the interface so the impl matches it exactly**

```bash
cat src/services/IMailGroupService.ts
```

Note every method signature. The HTTP impl will fulfill read methods (`getGroups`, `getGroup`, `getUser`, `getUsers`, `getGroupMembers`) and throw `NotImplementedError` from the rest. Phase 2 fills in the rest.

- [ ] **Step 2: Build `httpClient.ts`**

```ts
import { msalInstance, loginRequest } from '../auth/msalConfig'
import { InteractionRequiredAuthError } from '@azure/msal-browser'

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

async function getToken(): Promise<string> {
  const account = msalInstance.getAllAccounts()[0]
  if (!account) throw new Error('Not signed in')
  try {
    const r = await msalInstance.acquireTokenSilent({ ...loginRequest, account })
    return r.accessToken
  } catch (e) {
    if (e instanceof InteractionRequiredAuthError) {
      await msalInstance.acquireTokenRedirect({ ...loginRequest, account })
    }
    throw e
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const token = await getToken()
  const r = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (r.status === 404) return null as unknown as T
  if (!r.ok) throw new Error(`API ${r.status} ${r.statusText} on ${path}`)
  return (await r.json()) as T
}
```

- [ ] **Step 3: Build `HttpMailGroupService.ts`**

```ts
import type { IMailGroupService } from './IMailGroupService'
import type { MailGroup, User } from '../types'
import { apiGet } from './httpClient'

const NOT_IMPL = (m: string) => () => {
  throw new Error(`${m}() is not implemented in Phase 1 backend`)
}

export class HttpMailGroupService implements IMailGroupService {
  async getGroups(): Promise<MailGroup[]> {
    const list = await apiGet<MailGroupApi[]>('/api/groups')
    return (list ?? []).map(toFront)
  }

  async getGroup(id: string): Promise<MailGroup | null> {
    const g = await apiGet<MailGroupApi | null>(`/api/groups/${encodeURIComponent(id)}`)
    return g ? toFront(g) : null
  }

  async getUsers(): Promise<User[]> {
    const list = await apiGet<UserApi[]>('/api/users')
    return list ?? []
  }

  async getUser(id: string): Promise<User | null> {
    return await apiGet<UserApi | null>(`/api/users/${encodeURIComponent(id)}`)
  }

  async getGroupMembers(id: string): Promise<User[]> {
    const g = await this.getGroup(id)
    if (!g) return []
    const all = await this.getUsers()
    const set = new Set(g.memberIds)
    return all.filter((u) => set.has(u.id))
  }

  // Mutations + join requests + dynamic rules: Phase 2+
  createGroup = NOT_IMPL('createGroup')
  updateGroup = NOT_IMPL('updateGroup')
  deleteGroup = NOT_IMPL('deleteGroup')
  addMembers = NOT_IMPL('addMembers')
  removeMember = NOT_IMPL('removeMember')
  findOrCreateUserByEmail = NOT_IMPL('findOrCreateUserByEmail')
  getJoinRequests = NOT_IMPL('getJoinRequests')
  submitJoinRequest = NOT_IMPL('submitJoinRequest')
  approveJoinRequest = NOT_IMPL('approveJoinRequest')
  rejectJoinRequest = NOT_IMPL('rejectJoinRequest')
}

// API DTOs (match the .NET shape; PascalCase via System.Text.Json default)
type MailGroupApi = {
  id: string
  displayName: string
  mailNickname: string
  mail: string
  description?: string | null
  ownerId?: string | null
  memberIds: string[]
  type: 'regular' | 'dynamic'
  visibility: 'Public' | 'Private'
  hideFromAddressLists: boolean
  createdAt?: string | null
}
type UserApi = User

function toFront(g: MailGroupApi): MailGroup {
  return {
    id: g.id,
    displayName: g.displayName,
    mailNickname: g.mailNickname,
    mail: g.mail,
    description: g.description ?? undefined,
    ownerId: g.ownerId ?? '',
    memberIds: g.memberIds,
    type: g.type,
    visibility: g.visibility,
    hideFromAddressLists: g.hideFromAddressLists,
    tags: [],            // Phase 2 — coming from Postgres metadata
    businessLine: undefined,
    createdAt: g.createdAt ?? new Date().toISOString(),
  }
}
```

> **Field-level note**: System.Text.Json defaults to camelCase output in ASP.NET Core. The DTOs above match that. If the real API returns PascalCase, lowercase the keys in `toFront` or set `JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase` in `Program.cs`.

- [ ] **Step 4: Switch in `src/services/index.ts`**

Read existing first; modify to env-gate. After the existing import of `MockMailGroupService`:

```ts
import { MockMailGroupService } from './MockMailGroupService'
import { HttpMailGroupService } from './HttpMailGroupService'
import type { IMailGroupService } from './IMailGroupService'

const useBackend = !!import.meta.env.VITE_API_BASE_URL

export const mailGroupService: IMailGroupService =
  useBackend ? new HttpMailGroupService() : new MockMailGroupService()
```

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/services/httpClient.ts src/services/HttpMailGroupService.ts src/services/index.ts
git commit -m "feat(frontend): HttpMailGroupService with env-gated switch"
```

---

## Task 9: End-to-end smoke (manual verification)

**Files:**
- None (manual verification + a one-paragraph addition to README)

- [ ] **Step 1: Fill `.env` files from Task 0 outputs**

`backend/.env` and `.env.local` — fill all required values.

- [ ] **Step 2: Start the backend**

```bash
cd backend && docker compose up -d
curl http://localhost:5080/api/health
```
Expected: `{"status":"ok"}`.

- [ ] **Step 3: Start the frontend**

```bash
npm run dev
```

- [ ] **Step 4: Verify the auth flow**

Open http://localhost:5173 in a fresh incognito window. Expected:
1. Sign-in screen appears.
2. Click "Sign in with Microsoft" → Microsoft login → consent (first time) → returns to app.
3. `/groups` page loads — shows the sample groups from the dev tenant.
4. Click a group → `/groups/:id` shows owner + members.
5. Header shows your account name + sign-out icon. Click sign-out → returns to sign-in screen.

If anything 401s, check:
- Browser network tab → request to `/api/groups` — does the `Authorization` header have a token?
- Backend log — what's the error? Common: scope mismatch, audience mismatch.

- [ ] **Step 5: Verify mock mode still works**

```bash
unset VITE_API_BASE_URL    # or remove it from .env.local
npm run dev
```
Expected: app works with the in-browser mock as before. No sign-in screen.

- [ ] **Step 6: Add a "Run locally" snippet to root `README.md` (or create one)**

If `README.md` doesn't exist, create it with:

```markdown
# MailGroups

## Run with the real backend (M365 dev tenant)

1. One-time: follow `docs/setup/tenant-and-app-registrations.md` to set up your tenant and app registrations.
2. Fill `backend/.env` and `.env.local` from those values.
3. Start the API: `cd backend && docker compose up -d`
4. Start the frontend: `npm run dev`
5. Open http://localhost:5173 — sign in with your tenant account.

## Run with the in-browser mock (no backend, no Microsoft)

1. Make sure `VITE_API_BASE_URL` is **not** set in `.env.local`.
2. `npm run dev` → app uses `MockMailGroupService` and a hardcoded `user-1`.
```

- [ ] **Step 7: Commit**

```bash
git add README.md
git commit -m "docs: how to run with real backend vs mock"
```

---

## Self-Review

**Spec coverage:**
- ASP.NET Core backend ✓ (Tasks 1–6)
- Microsoft SSO via Entra ✓ (Tasks 0, 2, 7)
- Microsoft Graph for groups/users ✓ (Tasks 3–5)
- Read-only end-to-end ✓ (Task 9)
- Frontend service abstraction preserved ✓ (Task 8)
- Docker container ✓ (Task 6)
- Postgres / mutations / tags / join requests — explicitly deferred to Phase 2+. Documented in plan header.

**Placeholders:** none — every code step shows complete code.

**Type consistency:** `IGraphService` methods called from controllers match definitions; `GroupDto` shape used in tests matches mapper output; `MailGroupApi` in frontend matches `GroupDto` (camelCase).

**Open risks documented:**
- N+1 owners/members in `ListGroupsAsync` — flagged as Phase 2 cleanup.
- `[RequiredScope]` may not validate against test handler — escape hatch documented in Task 5 Step 8.
- API JSON casing — fix path documented in Task 8 Step 3.
