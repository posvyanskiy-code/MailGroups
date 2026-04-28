using System.Security.Claims;

namespace MailGroups.Api.Auth;

public static class CurrentUser
{
    public static Guid Id(ClaimsPrincipal u) =>
        Guid.Parse(u.FindFirstValue("oid") ?? u.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
