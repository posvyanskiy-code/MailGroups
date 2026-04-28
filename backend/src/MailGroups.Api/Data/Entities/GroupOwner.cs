namespace MailGroups.Api.Data.Entities;

public class GroupOwner
{
    public Guid GroupId { get; set; }
    public Group Group { get; set; } = default!;
    public Guid EntraUserId { get; set; }
}
