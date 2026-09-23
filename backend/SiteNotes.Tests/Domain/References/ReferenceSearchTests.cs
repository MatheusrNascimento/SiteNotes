using SiteNotes.Domain.References;

namespace SiteNotes.Tests.Domain.References;

public class ReferenceSearchTests
{
    [Fact]
    public void Apply_FiltersAndOrdersByMostRecentlyUpdated()
    {
        var older = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var newer = older.AddDays(3);
        var first = Reference.Create("https://example.com/a", "Alpha", ["diario"], older);
        var second = Reference.Create("https://example.com/b", "Beta", ["diario"], newer);
        second.RegisterActivity(newer.AddDays(1));

        var result = ReferenceSearch.Apply([first, second], search: "example", tag: "DIARIO").ToList();

        Assert.Equal([second.Id.Value, first.Id.Value], result.Select(reference => reference.Id.Value).ToArray());
    }
}
