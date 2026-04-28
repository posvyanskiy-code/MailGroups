namespace MailGroups.Api.Data.Entities;

public class Group
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = "";
    public string MailNickname { get; set; } = "";
    public string? Description { get; set; }
    public string Visibility { get; set; } = "Public"; // 'Public' | 'Private'
    public string? BusinessLine { get; set; }
    public List<string> Tags { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public List<GroupOwner> Owners { get; set; } = new();
    public List<GroupMember> Members { get; set; } = new();
    public List<JoinRequest> JoinRequests { get; set; } = new();
    public List<MailSend> MailSends { get; set; } = new();
}
