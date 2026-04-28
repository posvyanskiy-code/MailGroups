using MailGroups.Api.Auth;
using MailGroups.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MailGroups.Api.Controllers;

[ApiController]
[Route("api/me")]
[Authorize]
public class MeController : ControllerBase
{
    [HttpGet]
    public ActionResult<UserDto> Get()
    {
        var name = User.FindFirstValue("name")
                ?? User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name")
                ?? "";
        var mail = User.FindFirstValue("preferred_username")
                ?? User.FindFirstValue(ClaimTypes.Upn)
                ?? User.FindFirstValue(ClaimTypes.Email)
                ?? "";
        return new UserDto
        {
            Id = CurrentUser.Id(User),
            DisplayName = name,
            Mail = mail,
        };
    }
}
