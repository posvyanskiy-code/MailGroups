using MailGroups.Api.Auth;
using MailGroups.Api.Data;
using MailGroups.Api.Data.Entities;
using MailGroups.Api.Mappers;
using MailGroups.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MailGroups.Api.Controllers;

[ApiController]
[Route("api/groups")]
[Authorize]
public class GroupsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<GroupDto>>> List([FromQuery] string? search)
    {
        var me = CurrentUser.Id(User);
        var q = db.Groups
            .Include(g => g.Owners).Include(g => g.Members)
            .Where(g => g.Visibility == "Public"
                || g.Owners.Any(o => o.EntraUserId == me)
                || g.Members.Any(m => m.EntraUserId == me));
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(g => g.DisplayName.Contains(search) || g.MailNickname.Contains(search));
        var list = await q.OrderByDescending(g => g.CreatedAt).ToListAsync();
        return list.Select(GroupMapper.ToDto).ToList();
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<GroupDto>> Get(Guid id)
    {
        var me = CurrentUser.Id(User);
        var g = await db.Groups.Include(x => x.Owners).Include(x => x.Members)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (g is null) return NotFound();
        var canSee = g.Visibility == "Public"
            || g.Owners.Any(o => o.EntraUserId == me)
            || g.Members.Any(m => m.EntraUserId == me);
        if (!canSee) return NotFound();
        return GroupMapper.ToDto(g);
    }

    [HttpPost]
    public async Task<ActionResult<GroupDto>> Create([FromBody] CreateGroupRequest req)
    {
        var me = CurrentUser.Id(User);
        var now = DateTime.UtcNow;
        var g = new Group
        {
            Id = Guid.NewGuid(),
            DisplayName = req.DisplayName,
            MailNickname = req.MailNickname,
            Description = req.Description,
            Visibility = req.Visibility,
            BusinessLine = req.BusinessLine,
            Tags = req.Tags ?? new(),
            CreatedAt = now,
            UpdatedAt = now,
            Owners = new List<GroupOwner> { new() { EntraUserId = me } },
        };
        db.Groups.Add(g);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = g.Id }, GroupMapper.ToDto(g));
    }

    [HttpPatch("{id:guid}")]
    public async Task<ActionResult<GroupDto>> Patch(Guid id, [FromBody] PatchGroupRequest req)
    {
        var me = CurrentUser.Id(User);
        var g = await db.Groups.Include(x => x.Owners).Include(x => x.Members)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (g is null) return NotFound();
        if (!g.Owners.Any(o => o.EntraUserId == me)) return Forbid();
        if (req.DisplayName is not null) g.DisplayName = req.DisplayName;
        if (req.Description is not null) g.Description = req.Description;
        if (req.Visibility is not null) g.Visibility = req.Visibility;
        if (req.BusinessLine is not null) g.BusinessLine = req.BusinessLine;
        if (req.Tags is not null) g.Tags = req.Tags;
        g.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return GroupMapper.ToDto(g);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var me = CurrentUser.Id(User);
        var g = await db.Groups.Include(x => x.Owners).FirstOrDefaultAsync(x => x.Id == id);
        if (g is null) return NotFound();
        if (!g.Owners.Any(o => o.EntraUserId == me)) return Forbid();
        db.Groups.Remove(g);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
