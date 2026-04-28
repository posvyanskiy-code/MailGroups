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
[Route("api/groups/{groupId:guid}/mail")]
[Authorize]
public class MailController(AppDbContext db, IGraphService graph) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<MailSendDto>>> History(Guid groupId)
    {
        var me = CurrentUser.Id(User);
        var g = await db.Groups.Include(x => x.Owners).Include(x => x.MailSends)
            .FirstOrDefaultAsync(x => x.Id == groupId);
        if (g is null) return NotFound();
        if (!g.Owners.Any(o => o.EntraUserId == me)) return Forbid();
        return g.MailSends.OrderByDescending(s => s.CreatedAt).Select(s => new MailSendDto
        {
            Id = s.Id, GroupId = s.GroupId, SentBy = s.SentBy, Subject = s.Subject,
            RecipientCount = s.RecipientCount, Status = s.Status,
            CreatedAt = s.CreatedAt, SentAt = s.SentAt,
        }).ToList();
    }

    [HttpPost]
    public async Task<ActionResult<MailSendDto>> Send(Guid groupId, [FromBody] SendMailRequest req)
    {
        var me = CurrentUser.Id(User);
        var g = await db.Groups.Include(x => x.Owners).Include(x => x.Members)
            .FirstOrDefaultAsync(x => x.Id == groupId);
        if (g is null) return NotFound();
        if (!g.Owners.Any(o => o.EntraUserId == me)) return Forbid();
        var bcc = g.Members.Select(m => m.Email).Where(e => !string.IsNullOrEmpty(e)).ToList();

        var send = new MailSend
        {
            Id = Guid.NewGuid(), GroupId = groupId, SentBy = me,
            Subject = req.Subject, BodyHtml = req.BodyHtml,
            RecipientCount = bcc.Count, Status = "queued",
            CreatedAt = DateTime.UtcNow,
        };
        db.MailSends.Add(send);
        await db.SaveChangesAsync();

        try
        {
            var msgId = await graph.SendMailFromServiceAsync(req.Subject, req.BodyHtml, bcc);
            send.Status = "sent";
            send.SentAt = DateTime.UtcNow;
            send.GraphMessageId = msgId;
        }
        catch (Exception ex)
        {
            send.Status = "failed";
            send.Error = ex.Message;
        }
        await db.SaveChangesAsync();

        return new MailSendDto
        {
            Id = send.Id, GroupId = send.GroupId, SentBy = send.SentBy,
            Subject = send.Subject, RecipientCount = send.RecipientCount,
            Status = send.Status, CreatedAt = send.CreatedAt, SentAt = send.SentAt,
        };
    }
}
