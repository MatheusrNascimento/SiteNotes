using Microsoft.EntityFrameworkCore;
using SiteNotes.Domain.Notes;

namespace SiteNotes.Infrastructure.Persistence.Repositories;

public sealed class NoteRepository : INoteRepository
{
    private readonly SiteNotesDbContext _db;

    public NoteRepository(SiteNotesDbContext db)
    {
        _db = db;
    }

    public async Task<Note?> GetByIdAsync(long id, CancellationToken cancellationToken) =>
        await _db.Notes.FindAsync([id], cancellationToken);

    public async Task<IReadOnlyList<Note>> ListByReferenceAsync(long referenceId, CancellationToken cancellationToken) =>
        await _db.Notes
            .AsNoTracking()
            .Where(note => note.ReferenceId == referenceId)
            .OrderByDescending(note => note.CreatedAt)
            .ThenByDescending(note => note.Id)
            .ToListAsync(cancellationToken);

    public async Task AddAsync(Note note, CancellationToken cancellationToken) =>
        await _db.Notes.AddAsync(note, cancellationToken);

    public void Remove(Note note) => _db.Notes.Remove(note);
}
