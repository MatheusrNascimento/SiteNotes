namespace SiteNotes.Api.Models.Dtos;

public record NoteDto(
    string Id,
    string ReferenceId,
    string Content,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    IReadOnlyList<NoteSegmentDto> Segments);

public record NoteSegmentDto(string Kind, string Text, string? ReferenceId, bool Exists);

public record NoteBacklinkDto(
    string NoteId,
    string Excerpt,
    string SourceReferenceId,
    string SourceTitle,
    DateTime CreatedAt);

public record CreateNoteRequest(string Content);

public record UpdateNoteRequest(string Content);
