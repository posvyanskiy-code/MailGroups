namespace MailGroups.Api.Data.Entities;

public class JoinRequest
{
    public Guid Id { get; set; }
    public Guid GroupId { get; set; }
    public Group Group { get; set; } = default!;
    public Guid EntraUserId { get; set; }
    public string Status { get; set; } = "pending"; // pending|approved|rejected
    public DateTime CreatedAt { get; set; }
    public DateTime? DecidedAt { get; set; }
    public Guid? DecidedBy { get; set; }
}
