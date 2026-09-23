using MongoDB.Bson;

namespace SiteNotes.Infrastructure.Persistence.Documents;

public sealed class ReferenceDocument
{
    public ObjectId Id { get; set; }
    public string Url { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public List<string> Tags { get; set; } = [];
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
