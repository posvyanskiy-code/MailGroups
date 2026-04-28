namespace MailGroups.Api.Models;

public record CreateGroupRequest(string DisplayName, string MailNickname, string? Description,
    string Visibility, string? BusinessLine, List<string> Tags);
public record PatchGroupRequest(string? DisplayName, string? Description, string? Visibility,
    string? BusinessLine, List<string>? Tags);
public record AddOwnerRequest(Guid EntraUserId);
public record AddMembersRequest(List<Guid> EntraUserIds);
public record SendMailRequest(string Subject, string BodyHtml);
