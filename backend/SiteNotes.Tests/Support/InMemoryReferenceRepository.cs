using SiteNotes.Domain.References;

namespace SiteNotes.Tests.Support;

internal sealed class InMemoryReferenceRepository : IReferenceRepository
{
    private readonly Dictionary<string, Reference> _items = new(StringComparer.OrdinalIgnoreCase);

    public Task AddAsync(Reference reference, CancellationToken cancellationToken)
    {
        _items[reference.Id.Value] = reference;
        return Task.CompletedTask;
    }

    public Task<Reference?> GetByIdAsync(ReferenceId id, CancellationToken cancellationToken)
    {
        _items.TryGetValue(id.Value, out var reference);
        return Task.FromResult(reference);
    }

    public Task<IReadOnlyList<Reference>> ListAsync(CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyList<Reference>>(_items.Values.ToList());

    public void Remove(Reference reference) => _items.Remove(reference.Id.Value);

    public void Update(Reference reference) => _items[reference.Id.Value] = reference;
}
