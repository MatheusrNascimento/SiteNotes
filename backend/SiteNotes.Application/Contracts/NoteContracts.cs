using SiteNotes.Domain.Notes;

namespace SiteNotes.Application.Contracts;

public sealed record NoteDto(
    long Id,
    long ReferenceId,
    string Content,
    DateTime CreatedAt,
    DateTime UpdatedAt)
{
    public static NoteDto From(Note note) => new(
        note.Id,
        note.ReferenceId,
        note.Content,
        note.CreatedAt,
        note.UpdatedAt);
}

public sealed record CreateNoteRequest(string? Content);

public sealed record UpdateNoteRequest(string? Content);
