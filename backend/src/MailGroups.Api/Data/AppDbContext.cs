using MailGroups.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace MailGroups.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Group> Groups => Set<Group>();
    public DbSet<GroupOwner> GroupOwners => Set<GroupOwner>();
    public DbSet<GroupMember> GroupMembers => Set<GroupMember>();
    public DbSet<JoinRequest> JoinRequests => Set<JoinRequest>();
    public DbSet<MailSend> MailSends => Set<MailSend>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Group>(e =>
        {
            e.HasIndex(g => g.MailNickname).IsUnique();
            e.Property(g => g.Tags).HasColumnType("text[]");
        });

        b.Entity<GroupOwner>().HasKey(o => new { o.GroupId, o.EntraUserId });
        b.Entity<GroupOwner>().HasOne(o => o.Group).WithMany(g => g.Owners).HasForeignKey(o => o.GroupId);

        b.Entity<GroupMember>().HasKey(m => new { m.GroupId, m.EntraUserId });
        b.Entity<GroupMember>().HasOne(m => m.Group).WithMany(g => g.Members).HasForeignKey(m => m.GroupId);

        b.Entity<JoinRequest>().HasOne(r => r.Group).WithMany(g => g.JoinRequests).HasForeignKey(r => r.GroupId);
        b.Entity<MailSend>().HasOne(s => s.Group).WithMany(g => g.MailSends).HasForeignKey(s => s.GroupId);
    }
}
