namespace SiteNotes.Domain.References;

public static class ReferenceSearch
{
    public static IEnumerable<Reference> Apply(IEnumerable<Reference> references, string? search, string? tag) =>
        references
            .Where(reference => reference.Matches(search, tag))
            .OrderByDescending(reference => reference.UpdatedAt);
}
