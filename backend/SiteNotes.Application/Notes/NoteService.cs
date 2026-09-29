using Microsoft.EntityFrameworkCore;
using SiteNotes.Application.Abstractions;
using SiteNotes.Application.Common;
using SiteNotes.Application.Contracts;
using SiteNotes.Domain.Notes;

namespace SiteNotes.Application.Notes;

public sealed class NoteService : INoteService
{
    private readonly INoteRepository _notes;
    private readonly DbContext _db;
    private readonly IClock _clock;

    public NoteService(INoteRepository notes, DbContext db, IClock clock)
    {
        _notes = notes;
        _db = db;
        _clock = clock;
    }

    public async Task<NoteDto> GetByIdAsync(long id, CancellationToken cancellationToken)
    {
        var note = await FindAsync(id, cancellationToken);
        return NoteDto.From(note);
    }

    public async Task<NoteDto> UpdateAsync(long id, UpdateNoteRequest request, CancellationToken cancellationToken)
    {
        var note = await FindAsync(id, cancellationToken);
        note.Revise(request.Content, _clock.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);
        return NoteDto.From(note);
    }

    public async Task DeleteAsync(long id, CancellationToken cancellationToken)
    {
        var note = await FindAsync(id, cancellationToken);
        _notes.Remove(note);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task<Note> FindAsync(long id, CancellationToken cancellationToken) =>
        await _notes.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException();
}
