using SiteNotes.Application.Contracts;
using SiteNotes.Domain.Common;

namespace SiteNotes.Application.References;

public interface IReferenceService
{
    Task<IReadOnlyList<ReferenceDto>> ListAsync(
        string? search,
        string? tag,
        PageRequest page,
        CancellationToken cancellationToken);

    Task<ReferenceDto> GetByIdAsync(long id, CancellationToken cancellationToken);
    Task<ReferenceDto> CreateAsync(CreateReferenceRequest request, CancellationToken cancellationToken);
    Task<ReferenceDto> UpdateAsync(long id, UpdateReferenceRequest request, CancellationToken cancellationToken);
    Task DeleteAsync(long id, CancellationToken cancellationToken);
    Task<IReadOnlyList<NoteDto>> ListNotesAsync(long referenceId, PageRequest page, CancellationToken cancellationToken);
    Task<NoteDto> AddNoteAsync(long referenceId, CreateNoteRequest request, CancellationToken cancellationToken);
}
