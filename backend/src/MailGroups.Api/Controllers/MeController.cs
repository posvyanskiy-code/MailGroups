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
        var oid = User.FindFirstValue("oid") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        var name = User.FindFirstValue("name") ?? "";
        var mail = User.FindFirstValue("preferred_username") ?? "";
        return new UserDto
        {
            Id = Guid.Parse(oid!),
            DisplayName = name,
            Mail = mail,
        };
    }
}
