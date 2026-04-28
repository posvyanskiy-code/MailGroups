namespace MailGroups.Api.Models;

public class UserDto
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = "";
    public string Mail { get; set; } = "";
    public string? JobTitle { get; set; }
    public string? Department { get; set; }
}
