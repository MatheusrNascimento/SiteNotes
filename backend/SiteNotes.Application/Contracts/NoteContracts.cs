using SiteNotes.Domain.Notes;

namespace SiteNotes.Application.Contracts;

public sealed record NoteDto(
    string Id,
    string ReferenceId,
    string Content,
    DateTime CreatedAt,
    DateTime UpdatedAt)
{
    public static NoteDto From(Note note) => new(
        note.Id.Value,
        note.ReferenceId.Value,
        note.Content,
        note.CreatedAt,
        note.UpdatedAt);
}

public sealed record CreateNoteRequest(string? Content);

public sealed record UpdateNoteRequest(string? Content);
