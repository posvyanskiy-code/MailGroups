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
[Route("api/groups/{groupId:guid}")]
[Authorize]
public class JoinRequestsController(AppDbContext db, IGraphService graph) : ControllerBase
{
    [HttpPost("join")]
    public async Task<ActionResult<JoinRequestDto>> Join(Guid groupId)
    {
        var me = CurrentUser.Id(User);
        var g = await db.Groups.Include(x => x.Owners).Include(x => x.Members).Include(x => x.JoinRequests)
            .FirstOrDefaultAsync(x => x.Id == groupId);
        if (g is null) return NotFound();
        if (g.Visibility != "Public") return NotFound();
        if (g.Members.Any(m => m.EntraUserId == me)) return BadRequest("Already a member");
        var existing = g.JoinRequests.FirstOrDefault(r => r.EntraUserId == me && r.Status == "pending");
        if (existing != null) return Map(existing);
        var r = new JoinRequest
        {
            Id = Guid.NewGuid(), GroupId = groupId, EntraUserId = me,
            Status = "pending", CreatedAt = DateTime.UtcNow,
        };
        db.JoinRequests.Add(r);
        await db.SaveChangesAsync();
        return Map(r);
    }

    [HttpGet("requests")]
    public async Task<ActionResult<List<JoinRequestDto>>> List(Guid groupId)
    {
        var me = CurrentUser.Id(User);
        var g = await db.Groups.Include(x => x.Owners).Include(x => x.JoinRequests)
            .FirstOrDefaultAsync(x => x.Id == groupId);
        if (g is null) return NotFound();
        if (!g.Owners.Any(o => o.EntraUserId == me)) return Forbid();
        return g.JoinRequests.Where(r => r.Status == "pending").Select(Map).ToList();
    }

    [HttpPost("requests/{reqId:guid}/approve")]
    public async Task<IActionResult> Approve(Guid groupId, Guid reqId)
    {
        var me = CurrentUser.Id(User);
        var g = await db.Groups.Include(x => x.Owners).Include(x => x.Members).Include(x => x.JoinRequests)
            .FirstOrDefaultAsync(x => x.Id == groupId);
        if (g is null) return NotFound();
        if (!g.Owners.Any(o => o.EntraUserId == me)) return Forbid();
        var r = g.JoinRequests.FirstOrDefault(x => x.Id == reqId);
        if (r is null) return NotFound();
        var resolved = (await graph.ResolveUsersAsync(new[] { r.EntraUserId })).FirstOrDefault();
        if (resolved is null) return BadRequest("User not found in tenant");
        if (!g.Members.Any(m => m.EntraUserId == r.EntraUserId))
        {
            g.Members.Add(new GroupMember
            {
                GroupId = groupId, EntraUserId = r.EntraUserId,
                Email = resolved.Mail, DisplayName = resolved.DisplayName,
                AddedAt = DateTime.UtcNow, AddedBy = me,
            });
        }
        r.Status = "approved";
        r.DecidedAt = DateTime.UtcNow;
        r.DecidedBy = me;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("requests/{reqId:guid}/reject")]
    public async Task<IActionResult> Reject(Guid groupId, Guid reqId)
    {
        var me = CurrentUser.Id(User);
        var g = await db.Groups.Include(x => x.Owners).Include(x => x.JoinRequests)
            .FirstOrDefaultAsync(x => x.Id == groupId);
        if (g is null) return NotFound();
        if (!g.Owners.Any(o => o.EntraUserId == me)) return Forbid();
        var r = g.JoinRequests.FirstOrDefault(x => x.Id == reqId);
        if (r is null) return NotFound();
        r.Status = "rejected";
        r.DecidedAt = DateTime.UtcNow;
        r.DecidedBy = me;
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static JoinRequestDto Map(JoinRequest r) => new()
    {
        Id = r.Id, GroupId = r.GroupId, EntraUserId = r.EntraUserId,
        Status = r.Status, CreatedAt = r.CreatedAt,
    };
}
