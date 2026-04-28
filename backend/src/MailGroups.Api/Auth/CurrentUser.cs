using System.Security.Claims;

namespace MailGroups.Api.Auth;

public static class CurrentUser
{
    private const string OidUri = "http://schemas.microsoft.com/identity/claims/objectidentifier";

    public static Guid Id(ClaimsPrincipal u)
    {
        var oid = u.FindFirstValue("oid")
               ?? u.FindFirstValue(OidUri)
               ?? u.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(oid))
            throw new InvalidOperationException("Token has no oid/nameid claim");
        return Guid.Parse(oid);
    }
}
