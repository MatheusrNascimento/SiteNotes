using SiteNotes.Domain.Common;

namespace SiteNotes.Domain.References;

public interface IReferenceRepository
{
    Task<Reference?> GetByIdAsync(long id, CancellationToken cancellationToken);

    /// <summary>
    /// Referencias que atendem a <see cref="Reference.Matches"/>, da atualizacao mais recente para a mais antiga
    /// (empate pelo maior id), recortadas por <paramref name="page"/>.
    /// </summary>
    Task<IReadOnlyList<Reference>> SearchAsync(
        string? search,
        string? tag,
        PageRequest page,
        CancellationToken cancellationToken);

    Task AddAsync(Reference reference, CancellationToken cancellationToken);
    void Remove(Reference reference);
}
