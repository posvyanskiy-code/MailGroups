namespace MailGroups.Api.Models;

public class MailSendDto
{
    public Guid Id { get; set; }
    public Guid GroupId { get; set; }
    public Guid SentBy { get; set; }
    public string Subject { get; set; } = "";
    public int RecipientCount { get; set; }
    public string Status { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public DateTime? SentAt { get; set; }
}
