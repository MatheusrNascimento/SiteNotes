using Microsoft.EntityFrameworkCore;
using MongoDB.Bson;
using SiteNotes.Domain.References;
using SiteNotes.Infrastructure.Persistence.Documents;
using SiteNotes.Infrastructure.Persistence.Mapping;

namespace SiteNotes.Infrastructure.Persistence.Repositories;

public sealed class ReferenceRepository : IReferenceRepository
{
    private readonly SiteNotesDbContext _db;
    private readonly Dictionary<string, ReferenceDocument> _loaded = new(StringComparer.OrdinalIgnoreCase);

    public ReferenceRepository(SiteNotesDbContext db)
    {
        _db = db;
    }

    public async Task<Reference?> GetByIdAsync(ReferenceId id, CancellationToken cancellationToken)
    {
        if (!ObjectId.TryParse(id.Value, out var objectId))
        {
            return null;
        }

        var document = await _db.References.FindAsync([objectId], cancellationToken);
        if (document is null)
        {
            return null;
        }

        _loaded[id.Value] = document;
        return ReferenceMapper.ToDomain(document);
    }

    public async Task<IReadOnlyList<Reference>> ListAsync(CancellationToken cancellationToken)
    {
        var documents = await _db.References.ToListAsync(cancellationToken);
        return documents.Select(ReferenceMapper.ToDomain).ToList();
    }

    public Task AddAsync(Reference reference, CancellationToken cancellationToken)
    {
        var document = ReferenceMapper.ToDocument(reference);
        _loaded[reference.Id.Value] = document;
        _db.References.Add(document);
        return Task.CompletedTask;
    }

    public void Update(Reference reference)
    {
        if (!_loaded.TryGetValue(reference.Id.Value, out var document))
        {
            throw new InvalidOperationException("A referencia precisa ser carregada ou adicionada antes de ser atualizada.");
        }

        ReferenceMapper.Copy(reference, document);
    }

    public void Remove(Reference reference)
    {
        if (!_loaded.TryGetValue(reference.Id.Value, out var document))
        {
            throw new InvalidOperationException("A referencia precisa ser carregada antes de ser removida.");
        }

        _db.References.Remove(document);
        _loaded.Remove(reference.Id.Value);
    }
}
