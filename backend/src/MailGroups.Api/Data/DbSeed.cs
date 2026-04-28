using MailGroups.Api.Data.Entities;

namespace MailGroups.Api.Data;

public static class DbSeed
{
    public static async Task RunAsync(AppDbContext db)
    {
        if (db.Groups.Any()) return;
        var g = new Group
        {
            Id = Guid.NewGuid(),
            DisplayName = "All Hands",
            MailNickname = "all-hands",
            Description = "Company-wide announcements",
            Visibility = "Public",
            Tags = new List<string> { "company" },
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Groups.Add(g);
        await db.SaveChangesAsync();
    }
}
