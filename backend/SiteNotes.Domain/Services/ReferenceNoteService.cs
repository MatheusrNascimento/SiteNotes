using SiteNotes.Domain.Notes;
using SiteNotes.Domain.References;

namespace SiteNotes.Domain.Services;

public sealed class ReferenceNoteService
{
    public Note Add(
        Reference reference,
        string? content,
        DateTime utcNow,
        IEnumerable<ReferenceId>? mentionedReferenceIds = null)
    {
        ArgumentNullException.ThrowIfNull(reference);

        var note = Note.Create(reference.Id, content, utcNow, mentionedReferenceIds);
        reference.RegisterActivity(utcNow);
        return note;
    }
}
