namespace MailGroups.Api.Models;

public class GroupDto
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = "";
    public string MailNickname { get; set; } = "";
    public string Mail { get; set; } = "";
    public string? Description { get; set; }
    public string Visibility { get; set; } = "Public";
    public string? BusinessLine { get; set; }
    public List<string> Tags { get; set; } = new();
    public List<Guid> OwnerIds { get; set; } = new();
    public List<Guid> MemberIds { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
