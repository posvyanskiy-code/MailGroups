namespace MailGroups.Api.Models;

public class JoinRequestDto
{
    public Guid Id { get; set; }
    public Guid GroupId { get; set; }
    public Guid EntraUserId { get; set; }
    public string Status { get; set; } = "";
    public DateTime CreatedAt { get; set; }
}
