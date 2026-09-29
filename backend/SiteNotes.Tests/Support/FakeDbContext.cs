using Microsoft.EntityFrameworkCore;

namespace SiteNotes.Tests.Support;

internal sealed class FakeDbContext : DbContext
{
    public FakeDbContext()
        : base(new DbContextOptionsBuilder<FakeDbContext>()
            .UseNpgsql("Host=localhost;Database=fake_only")
            .Options)
    {
    }

    public int SaveCount { get; private set; }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        SaveCount++;
        return Task.FromResult(0);
    }
}
