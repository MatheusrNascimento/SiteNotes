using Microsoft.EntityFrameworkCore;
using SiteNotes.Infrastructure.Persistence;
using SiteNotes.Infrastructure.Persistence.Repositories;

namespace SiteNotes.Tests.Infrastructure;

public class ReferenceSearchQueryTests : IDisposable
{
    private readonly SiteNotesDbContext _db;
    private readonly ReferenceRepository _repository;

    public ReferenceSearchQueryTests()
    {
        var options = new DbContextOptionsBuilder<SiteNotesDbContext>()
            .UseNpgsql("Host=localhost;Database=model_only")
            .UseSnakeCaseNamingConvention()
            .Options;
        _db = new SiteNotesDbContext(options);
        _repository = new ReferenceRepository(_db);
    }

    [Fact]
    public void WithoutFilters_OrdersByMostRecentUpdateInSql()
    {
        var sql = _repository.BuildSearchQuery(null, null).ToQueryString();

        Assert.Contains("ORDER BY r.updated_at DESC", sql);
        Assert.DoesNotContain("WHERE", sql);
    }

    [Fact]
    public void WithSearch_FiltersTitleAndUrlWithEscapedIlike()
    {
        var sql = _repository.BuildSearchQuery(" 50%_off ", null).ToQueryString();

        Assert.Contains(@"r.title ILIKE @pattern ESCAPE '\'", sql);
        Assert.Contains(@"r.url::text ILIKE @pattern ESCAPE '\'", sql);
        Assert.Contains(@"%50\%\_off%", sql);
    }

    [Fact]
    public void WithTag_FiltersTagsCaseInsensitivelyInSql()
    {
        var sql = _repository.BuildSearchQuery(null, " Video ").ToQueryString();

        Assert.Contains("unnest(tags)", sql);
        Assert.Contains("lower(t.value) = lower(", sql);
        Assert.Contains("Video", sql);
        Assert.Contains("ORDER BY", sql);
    }

    public void Dispose() => _db.Dispose();
}
