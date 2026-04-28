using MailGroups.Api.Models;
using Microsoft.Graph;

namespace MailGroups.Api.Services;

public class GraphService(GraphServiceClient delegated, IConfiguration cfg) : IGraphService
{
    private readonly string _senderUpn = cfg["Graph:SenderUpn"]!;

    public async Task<List<UserDto>> SearchUsersAsync(string query)
    {
        var options = new List<Option>
        {
            new QueryOption("$search", $"\"displayName:{query}\" OR \"mail:{query}\""),
            new HeaderOption("ConsistencyLevel", "eventual"),
        };
        var page = await delegated.Users
            .Request(options)
            .Select("id,displayName,mail,userPrincipalName,jobTitle,department")
            .Top(25)
            .GetAsync();
        return (page?.CurrentPage ?? new List<User>()).Select(Map).ToList();
    }

    public async Task<List<UserDto>> ResolveUsersAsync(IEnumerable<Guid> ids)
    {
        var result = new List<UserDto>();
        foreach (var id in ids)
        {
            var u = await delegated.Users[id.ToString()]
                .Request()
                .Select("id,displayName,mail,userPrincipalName,jobTitle,department")
                .GetAsync();
            if (u != null) result.Add(Map(u));
        }
        return result;
    }

    public async Task<string> SendMailFromServiceAsync(string subject, string bodyHtml, IEnumerable<string> bccAddresses)
    {
        if (cfg.GetValue("Demo:FakeSend", false))
            return $"demo-{Guid.NewGuid()}";

        var appClient = GraphClientFactory.CreateAppOnly(cfg);
        var msg = new Message
        {
            Subject = subject,
            Body = new ItemBody { ContentType = BodyType.Html, Content = bodyHtml },
            BccRecipients = bccAddresses
                .Select(a => new Recipient { EmailAddress = new EmailAddress { Address = a } })
                .ToList(),
        };
        await appClient.Users[_senderUpn]
            .SendMail(msg, SaveToSentItems: false)
            .Request()
            .PostAsync();
        return Guid.NewGuid().ToString();
    }

    private static UserDto Map(User u) => new()
    {
        Id = Guid.Parse(u.Id!),
        DisplayName = u.DisplayName ?? "",
        Mail = u.Mail ?? u.UserPrincipalName ?? "",
        JobTitle = u.JobTitle,
        Department = u.Department,
    };
}

internal static class GraphClientFactory
{
    public static GraphServiceClient CreateAppOnly(IConfiguration cfg)
    {
        var tenantId = cfg["AzureAd:TenantId"]!;
        var clientId = cfg["AzureAd:ClientId"]!;
        var secret = cfg["AzureAd:ClientCredentials:0:ClientSecret"]!;
        var cred = new Azure.Identity.ClientSecretCredential(tenantId, clientId, secret);
        return new GraphServiceClient(cred, new[] { "https://graph.microsoft.com/.default" });
    }
}
