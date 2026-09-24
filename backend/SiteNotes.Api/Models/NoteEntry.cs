using MongoDB.Bson;

namespace SiteNotes.Api.Models;

public class NoteEntry
{
    public ObjectId Id { get; set; }
    public ObjectId ReferenceId { get; set; }
    public string Content { get; set; } = string.Empty;
    public List<ObjectId>? MentionedReferenceIds { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
