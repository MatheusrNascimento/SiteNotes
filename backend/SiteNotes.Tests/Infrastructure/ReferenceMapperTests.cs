using SiteNotes.Domain.References;
using SiteNotes.Infrastructure.Persistence.Mapping;

namespace SiteNotes.Tests.Infrastructure;

public class ReferenceMapperTests
{
    [Fact]
    public void RoundTrip_PreservesReferenceState()
    {
        var createdAt = new DateTime(2026, 3, 1, 12, 0, 0, DateTimeKind.Utc);
        var reference = Reference.Create("https://example.com", "Artigo", ["C#", "Mongo"], createdAt);
        reference.ChangeDetails(null, "Artigo revisado", ["C#"], createdAt.AddHours(1));

        var restored = ReferenceMapper.ToDomain(ReferenceMapper.ToDocument(reference));

        Assert.Equal(reference.Id, restored.Id);
        Assert.Equal(reference.Url.Value, restored.Url.Value);
        Assert.Equal(reference.Title, restored.Title);
        Assert.Equal(reference.Tags.Select(tag => tag.Value), restored.Tags.Select(tag => tag.Value));
        Assert.Equal(reference.CreatedAt, restored.CreatedAt);
        Assert.Equal(reference.UpdatedAt, restored.UpdatedAt);
    }
}
