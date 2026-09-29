namespace SiteNotes.Domain.Notes;

public interface INoteRepository
{
    Task<Note?> GetByIdAsync(long id, CancellationToken cancellationToken);
    Task<IReadOnlyList<Note>> ListByReferenceAsync(long referenceId, CancellationToken cancellationToken);
    Task AddAsync(Note note, CancellationToken cancellationToken);
    void Remove(Note note);
}
