using SiteNotes.Application.Contracts;

namespace SiteNotes.Application.Notes;

public interface INoteService
{
    Task<NoteDto> GetByIdAsync(long id, CancellationToken cancellationToken);
    Task<NoteDto> UpdateAsync(long id, UpdateNoteRequest request, CancellationToken cancellationToken);
    Task DeleteAsync(long id, CancellationToken cancellationToken);
}
