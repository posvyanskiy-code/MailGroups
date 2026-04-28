using MailGroups.Api.Models;
using MailGroups.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MailGroups.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController(IGraphService graph) : ControllerBase
{
    [HttpGet("search")]
    public async Task<ActionResult<List<UserDto>>> Search([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q)) return new List<UserDto>();
        return await graph.SearchUsersAsync(q);
    }
}
