namespace SiteNotes.Domain.References;

public interface IReferenceRepository
{
    Task<Reference?> GetByIdAsync(long id, CancellationToken cancellationToken);
    Task<IReadOnlyList<Reference>> ListAsync(CancellationToken cancellationToken);
    Task AddAsync(Reference reference, CancellationToken cancellationToken);
    void Remove(Reference reference);
}
