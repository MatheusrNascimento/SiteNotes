using SiteNotes.Domain.Persistence;

namespace SiteNotes.Infrastructure.Persistence;

public sealed class UnitOfWork : IUnitOfWork
{
    private readonly SiteNotesDbContext _db;

    public UnitOfWork(SiteNotesDbContext db)
    {
        _db = db;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken) =>
        _db.SaveChangesAsync(cancellationToken);
}
