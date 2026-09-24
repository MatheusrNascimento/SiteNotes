using SiteNotes.Domain.References;

namespace SiteNotes.Domain.Notes;

public interface INoteRepository
{
    Task<Note?> GetByIdAsync(NoteId id, CancellationToken cancellationToken);
    Task<IReadOnlyList<Note>> ListByReferenceAsync(ReferenceId referenceId, CancellationToken cancellationToken);
    Task<IReadOnlyList<Note>> ListMentioningAsync(ReferenceId referenceId, CancellationToken cancellationToken);
    Task AddAsync(Note note, CancellationToken cancellationToken);
    void Update(Note note);
    void Remove(Note note);
    Task RemoveByReferenceAsync(ReferenceId referenceId, CancellationToken cancellationToken);
}
