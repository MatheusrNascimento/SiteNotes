using SiteNotes.Application.Contracts;

namespace SiteNotes.Application.Notes;

public interface INoteService
{
    Task<NoteDto> GetByIdAsync(string id, CancellationToken cancellationToken);
    Task<NoteDto> UpdateAsync(string id, UpdateNoteRequest request, CancellationToken cancellationToken);
    Task DeleteAsync(string id, CancellationToken cancellationToken);
}
