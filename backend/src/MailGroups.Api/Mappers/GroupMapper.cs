using MailGroups.Api.Data.Entities;
using MailGroups.Api.Models;

namespace MailGroups.Api.Mappers;

public static class GroupMapper
{
    public const string Domain = "company.com";

    public static GroupDto ToDto(Group g) => new()
    {
        Id = g.Id,
        DisplayName = g.DisplayName,
        MailNickname = g.MailNickname,
        Mail = $"{g.MailNickname}@{Domain}",
        Description = g.Description,
        Visibility = g.Visibility,
        BusinessLine = g.BusinessLine,
        Tags = g.Tags ?? new(),
        OwnerIds = g.Owners.Select(o => o.EntraUserId).ToList(),
        MemberIds = g.Members.Select(m => m.EntraUserId).ToList(),
        CreatedAt = g.CreatedAt,
        UpdatedAt = g.UpdatedAt,
    };
}
