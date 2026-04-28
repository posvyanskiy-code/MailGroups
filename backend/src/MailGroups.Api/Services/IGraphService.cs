using MailGroups.Api.Models;

namespace MailGroups.Api.Services;

public interface IGraphService
{
    Task<List<UserDto>> SearchUsersAsync(string query);
    Task<List<UserDto>> ResolveUsersAsync(IEnumerable<Guid> ids);
    Task<string> SendMailFromServiceAsync(string subject, string bodyHtml, IEnumerable<string> bccAddresses);
}
