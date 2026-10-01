using SiteNotes.Domain.Common;

namespace SiteNotes.Domain.Notes;

public interface INoteRepository
{
    Task<Note?> GetByIdAsync(long id, CancellationToken cancellationToken);

    /// <summary>
    /// Notas da referencia, da criacao mais recente para a mais antiga (ver <see cref="Note.ByMostRecent"/>),
    /// recortadas por <paramref name="page"/>.
    /// </summary>
    Task<IReadOnlyList<Note>> ListByReferenceAsync(long referenceId, PageRequest page, CancellationToken cancellationToken);

    Task AddAsync(Note note, CancellationToken cancellationToken);
    void Remove(Note note);
}
