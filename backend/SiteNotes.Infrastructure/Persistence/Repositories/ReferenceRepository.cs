using Microsoft.EntityFrameworkCore;
using SiteNotes.Domain.References;

namespace SiteNotes.Infrastructure.Persistence.Repositories;

public sealed class ReferenceRepository : IReferenceRepository
{
    private readonly SiteNotesDbContext _db;

    public ReferenceRepository(SiteNotesDbContext db)
    {
        _db = db;
    }

    public async Task<Reference?> GetByIdAsync(long id, CancellationToken cancellationToken) =>
        await _db.References.FindAsync([id], cancellationToken);

    public async Task<IReadOnlyList<Reference>> ListAsync(CancellationToken cancellationToken) =>
        await _db.References.AsNoTracking().ToListAsync(cancellationToken);

    public async Task AddAsync(Reference reference, CancellationToken cancellationToken) =>
        await _db.References.AddAsync(reference, cancellationToken);

    public void Remove(Reference reference) => _db.References.Remove(reference);
}
