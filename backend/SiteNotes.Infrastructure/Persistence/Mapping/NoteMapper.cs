using MongoDB.Bson;
using SiteNotes.Domain.Notes;
using SiteNotes.Domain.References;
using SiteNotes.Infrastructure.Persistence.Documents;

namespace SiteNotes.Infrastructure.Persistence.Mapping;

public static class NoteMapper
{
    public static Note ToDomain(NoteDocument document) =>
        Note.Restore(
            NoteId.Parse(document.Id.ToString()),
            ReferenceId.Parse(document.ReferenceId.ToString()),
            document.Content,
            document.CreatedAt,
            document.UpdatedAt);

    public static NoteDocument ToDocument(Note note) => new()
    {
        Id = ObjectId.Parse(note.Id.Value),
        ReferenceId = ObjectId.Parse(note.ReferenceId.Value),
        Content = note.Content,
        CreatedAt = note.CreatedAt,
        UpdatedAt = note.UpdatedAt,
    };

    public static void Copy(Note source, NoteDocument target)
    {
        target.Content = source.Content;
        target.UpdatedAt = source.UpdatedAt;
    }
}
