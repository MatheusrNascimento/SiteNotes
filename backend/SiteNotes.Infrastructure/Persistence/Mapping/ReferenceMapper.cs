using MongoDB.Bson;
using SiteNotes.Domain.References;
using SiteNotes.Infrastructure.Persistence.Documents;

namespace SiteNotes.Infrastructure.Persistence.Mapping;

public static class ReferenceMapper
{
    public static Reference ToDomain(ReferenceDocument document) =>
        Reference.Restore(
            ReferenceId.Parse(document.Id.ToString()),
            document.Url,
            document.Title,
            document.Tags ?? [],
            document.CreatedAt,
            document.UpdatedAt);

    public static ReferenceDocument ToDocument(Reference reference) => new()
    {
        Id = ObjectId.Parse(reference.Id.Value),
        Url = reference.Url.Value,
        Title = reference.Title,
        Tags = reference.Tags.Select(tag => tag.Value).ToList(),
        CreatedAt = reference.CreatedAt,
        UpdatedAt = reference.UpdatedAt,
    };

    public static void Copy(Reference source, ReferenceDocument target)
    {
        target.Url = source.Url.Value;
        target.Title = source.Title;
        target.Tags = source.Tags.Select(tag => tag.Value).ToList();
        target.CreatedAt = source.CreatedAt;
        target.UpdatedAt = source.UpdatedAt;
    }
}
