namespace SiteNotes.Domain.References;

public interface IReferenceRepository
{
    Task<Reference?> GetByIdAsync(long id, CancellationToken cancellationToken);

    /// <summary>
    /// Referencias que atendem a <see cref="Reference.Matches"/>, da atualizacao mais recente para a mais antiga.
    /// </summary>
    Task<IReadOnlyList<Reference>> SearchAsync(string? search, string? tag, CancellationToken cancellationToken);

    Task AddAsync(Reference reference, CancellationToken cancellationToken);
    void Remove(Reference reference);
}
