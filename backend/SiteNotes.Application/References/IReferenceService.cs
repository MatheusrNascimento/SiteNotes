using SiteNotes.Application.Contracts;

namespace SiteNotes.Application.References;

public interface IReferenceService
{
    Task<IReadOnlyList<ReferenceDto>> ListAsync(string? search, string? tag, CancellationToken cancellationToken);
    Task<ReferenceDto> GetByIdAsync(string id, CancellationToken cancellationToken);
    Task<ReferenceDto> CreateAsync(CreateReferenceRequest request, CancellationToken cancellationToken);
    Task<ReferenceDto> UpdateAsync(string id, UpdateReferenceRequest request, CancellationToken cancellationToken);
    Task DeleteAsync(string id, CancellationToken cancellationToken);
    Task<IReadOnlyList<NoteDto>> ListNotesAsync(string referenceId, CancellationToken cancellationToken);
    Task<NoteDto> AddNoteAsync(string referenceId, CreateNoteRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<NoteBacklinkDto>> ListBacklinksAsync(string referenceId, CancellationToken cancellationToken);
}
