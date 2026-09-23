using MongoDB.Bson;

namespace SiteNotes.Infrastructure.Persistence.Documents;

public sealed class NoteDocument
{
    public ObjectId Id { get; set; }
    public ObjectId ReferenceId { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
