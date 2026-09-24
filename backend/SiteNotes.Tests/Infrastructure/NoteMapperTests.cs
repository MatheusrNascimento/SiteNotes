using SiteNotes.Domain.Notes;
using SiteNotes.Domain.References;
using SiteNotes.Infrastructure.Persistence.Mapping;

namespace SiteNotes.Tests.Infrastructure;

public class NoteMapperTests
{
    [Fact]
    public void RoundTrip_PreservesNoteState()
    {
        var createdAt = new DateTime(2026, 3, 1, 12, 0, 0, DateTimeKind.Utc);
        var note = Note.Create(ReferenceId.New(), "rascunho", createdAt);
        note.Revise("rascunho revisado", createdAt.AddMinutes(3));

        var restored = NoteMapper.ToDomain(NoteMapper.ToDocument(note));

        Assert.Equal(note.Id, restored.Id);
        Assert.Equal(note.ReferenceId, restored.ReferenceId);
        Assert.Equal(note.Content, restored.Content);
        Assert.Equal(note.CreatedAt, restored.CreatedAt);
        Assert.Equal(note.UpdatedAt, restored.UpdatedAt);
        Assert.Equal(note.MentionedReferenceIds, restored.MentionedReferenceIds);
    }
}
