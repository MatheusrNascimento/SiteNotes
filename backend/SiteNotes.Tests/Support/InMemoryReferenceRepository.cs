using SiteNotes.Domain.Common;
using SiteNotes.Domain.References;

namespace SiteNotes.Tests.Support;

/// <param name="notes">Quando informado, apagar uma referencia apaga as notas dela, como o ON DELETE CASCADE do banco.</param>
internal sealed class InMemoryReferenceRepository(InMemoryNoteRepository? notes = null) : IReferenceRepository
{
    private readonly Dictionary<long, Reference> _items = [];
    private readonly IdentitySequence _sequence = new();

    public Task AddAsync(Reference reference, CancellationToken cancellationToken)
    {
        _sequence.Assign(reference);
        _items[reference.Id] = reference;
        return Task.CompletedTask;
    }

    public Task<Reference?> GetByIdAsync(long id, CancellationToken cancellationToken)
    {
        _items.TryGetValue(id, out var reference);
        return Task.FromResult(reference);
    }

    public Task<IReadOnlyList<Reference>> SearchAsync(
        string? search,
        string? tag,
        PageRequest page,
        CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyList<Reference>>(page.Apply(ReferenceSearch.Apply(_items.Values, search, tag)).ToList());

    public void Remove(Reference reference)
    {
        _items.Remove(reference.Id);
        notes?.RemoveByReference(reference.Id);
    }
}
