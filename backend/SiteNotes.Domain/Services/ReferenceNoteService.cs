using SiteNotes.Domain.Notes;
using SiteNotes.Domain.References;

namespace SiteNotes.Domain.Services;

public sealed class ReferenceNoteService
{
    public Note Add(Reference reference, string? content, DateTime utcNow)
    {
        ArgumentNullException.ThrowIfNull(reference);

        var note = Note.Create(reference.Id, content, utcNow);
        reference.RegisterActivity(utcNow);
        return note;
    }
}
