using MailGroups.Api.Auth;
using MailGroups.Api.Data;
using MailGroups.Api.Data.Entities;
using MailGroups.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MailGroups.Api.Controllers;

[ApiController]
[Route("api/groups/{groupId:guid}/owners")]
[Authorize]
public class OwnersController(AppDbContext db) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Add(Guid groupId, [FromBody] AddOwnerRequest req)
    {
        var me = CurrentUser.Id(User);
        var g = await db.Groups.Include(x => x.Owners).FirstOrDefaultAsync(x => x.Id == groupId);
        if (g is null) return NotFound();
        if (!g.Owners.Any(o => o.EntraUserId == me)) return Forbid();
        if (g.Owners.Any(o => o.EntraUserId == req.EntraUserId)) return NoContent();
        g.Owners.Add(new GroupOwner { GroupId = groupId, EntraUserId = req.EntraUserId });
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{userId:guid}")]
    public async Task<IActionResult> Remove(Guid groupId, Guid userId)
    {
        var me = CurrentUser.Id(User);
        var g = await db.Groups.Include(x => x.Owners).FirstOrDefaultAsync(x => x.Id == groupId);
        if (g is null) return NotFound();
        if (!g.Owners.Any(o => o.EntraUserId == me)) return Forbid();
        if (g.Owners.Count <= 1) return BadRequest("Cannot remove the last owner");
        var o = g.Owners.FirstOrDefault(x => x.EntraUserId == userId);
        if (o is null) return NotFound();
        g.Owners.Remove(o);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
