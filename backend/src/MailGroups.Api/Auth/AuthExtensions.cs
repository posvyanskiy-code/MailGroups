using Microsoft.Identity.Web;

namespace MailGroups.Api.Auth;

public static class AuthExtensions
{
    public static IServiceCollection AddMsalAuth(this IServiceCollection services, IConfiguration cfg)
    {
        services
            .AddAuthentication("Bearer")
            .AddMicrosoftIdentityWebApi(cfg.GetSection("AzureAd"))
            .EnableTokenAcquisitionToCallDownstreamApi()
            .AddMicrosoftGraph(cfg.GetSection("Graph"))
            .AddInMemoryTokenCaches();
        services.AddAuthorization();
        return services;
    }
}
