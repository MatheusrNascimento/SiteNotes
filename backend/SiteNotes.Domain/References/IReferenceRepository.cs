namespace SiteNotes.Domain.References;

public interface IReferenceRepository
{
    Task<Reference?> GetByIdAsync(ReferenceId id, CancellationToken cancellationToken);
    Task<IReadOnlyList<Reference>> ListAsync(CancellationToken cancellationToken);
    Task AddAsync(Reference reference, CancellationToken cancellationToken);
    void Update(Reference reference);
    void Remove(Reference reference);
}
