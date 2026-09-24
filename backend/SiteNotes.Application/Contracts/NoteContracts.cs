using SiteNotes.Domain.Notes;

namespace SiteNotes.Application.Contracts;

public sealed record NoteDto(
    string Id,
    string ReferenceId,
    string Content,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    IReadOnlyList<NoteSegmentDto> Segments);

public sealed record NoteSegmentDto(string Kind, string Text, string? ReferenceId, bool Exists);

public sealed record NoteBacklinkDto(
    string NoteId,
    string Excerpt,
    string SourceReferenceId,
    string SourceTitle,
    DateTime CreatedAt);

public sealed record CreateNoteRequest(string? Content);

public sealed record UpdateNoteRequest(string? Content);
