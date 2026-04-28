namespace MailGroups.Api.Data.Entities;

public class GroupMember
{
    public Guid GroupId { get; set; }
    public Group Group { get; set; } = default!;
    public Guid EntraUserId { get; set; }
    public string Email { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public DateTime AddedAt { get; set; }
    public Guid? AddedBy { get; set; }
}
