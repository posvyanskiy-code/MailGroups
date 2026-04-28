namespace MailGroups.Api.Data.Entities;

public class MailSend
{
    public Guid Id { get; set; }
    public Guid GroupId { get; set; }
    public Group Group { get; set; } = default!;
    public Guid SentBy { get; set; }
    public string Subject { get; set; } = "";
    public string BodyHtml { get; set; } = "";
    public int RecipientCount { get; set; }
    public string Status { get; set; } = "queued"; // queued|sent|failed
    public string? GraphMessageId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? SentAt { get; set; }
    public string? Error { get; set; }
}
