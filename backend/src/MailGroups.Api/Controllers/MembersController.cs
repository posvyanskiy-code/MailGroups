using MailGroups.Api.Auth;
using MailGroups.Api.Data;
using MailGroups.Api.Data.Entities;
using MailGroups.Api.Models;
using MailGroups.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MailGroups.Api.Controllers;

[ApiController]
[Route("api/groups/{groupId:guid}/members")]
[Authorize]
public class MembersController(AppDbContext db, IGraphService graph) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<UserDto>>> List(Guid groupId)
    {
        var me = CurrentUser.Id(User);
        var g = await db.Groups.Include(x => x.Owners).Include(x => x.Members)
            .FirstOrDefaultAsync(x => x.Id == groupId);
        if (g is null) return NotFound();
        var canSee = g.Visibility == "Public"
            || g.Owners.Any(o => o.EntraUserId == me)
            || g.Members.Any(m => m.EntraUserId == me);
        if (!canSee) return Forbid();
        return g.Members.Select(m => new UserDto
        {
            Id = m.EntraUserId, DisplayName = m.DisplayName, Mail = m.Email
        }).ToList();
    }

    [HttpPost]
    public async Task<IActionResult> Add(Guid groupId, [FromBody] AddMembersRequest req)
    {
        var me = CurrentUser.Id(User);
        var g = await db.Groups.Include(x => x.Owners).Include(x => x.Members)
            .FirstOrDefaultAsync(x => x.Id == groupId);
        if (g is null) return NotFound();
        if (!g.Owners.Any(o => o.EntraUserId == me)) return Forbid();
        var resolved = await graph.ResolveUsersAsync(req.EntraUserIds);
        var existing = g.Members.Select(m => m.EntraUserId).ToHashSet();
        foreach (var u in resolved)
        {
            if (existing.Contains(u.Id)) continue;
            g.Members.Add(new GroupMember
            {
                GroupId = groupId, EntraUserId = u.Id,
                Email = u.Mail, DisplayName = u.DisplayName, AddedAt = DateTime.UtcNow, AddedBy = me
            });
        }
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{userId:guid}")]
    public async Task<IActionResult> Remove(Guid groupId, Guid userId)
    {
        var me = CurrentUser.Id(User);
        var g = await db.Groups.Include(x => x.Owners).Include(x => x.Members)
            .FirstOrDefaultAsync(x => x.Id == groupId);
        if (g is null) return NotFound();
        var isOwner = g.Owners.Any(o => o.EntraUserId == me);
        if (!isOwner && me != userId) return Forbid();
        var m = g.Members.FirstOrDefault(x => x.EntraUserId == userId);
        if (m is null) return NotFound();
        g.Members.Remove(m);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
