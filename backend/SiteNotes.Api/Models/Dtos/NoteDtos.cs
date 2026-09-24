namespace SiteNotes.Api.Models.Dtos;

public record NoteDto(
    string Id,
    string ReferenceId,
    string Content,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record CreateNoteRequest(string Content);

public record UpdateNoteRequest(string Content);
