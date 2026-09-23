using SiteNotes.Application.Abstractions;
using SiteNotes.Application.Common;
using SiteNotes.Application.Contracts;
using SiteNotes.Domain.Notes;
using SiteNotes.Domain.Persistence;

namespace SiteNotes.Application.Notes;

public sealed class NoteService : INoteService
{
    private readonly INoteRepository _notes;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IClock _clock;

    public NoteService(INoteRepository notes, IUnitOfWork unitOfWork, IClock clock)
    {
        _notes = notes;
        _unitOfWork = unitOfWork;
        _clock = clock;
    }

    public async Task<NoteDto> GetByIdAsync(string id, CancellationToken cancellationToken)
    {
        var note = await FindAsync(id, cancellationToken);
        return NoteDto.From(note);
    }

    public async Task<NoteDto> UpdateAsync(string id, UpdateNoteRequest request, CancellationToken cancellationToken)
    {
        var note = await FindAsync(id, cancellationToken);
        note.Revise(request.Content, _clock.UtcNow);
        _notes.Update(note);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return NoteDto.From(note);
    }

    public async Task DeleteAsync(string id, CancellationToken cancellationToken)
    {
        var note = await FindAsync(id, cancellationToken);
        _notes.Remove(note);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task<Note> FindAsync(string id, CancellationToken cancellationToken)
    {
        var noteId = NoteId.Parse(id);
        return await _notes.GetByIdAsync(noteId, cancellationToken)
            ?? throw new NotFoundException();
    }
}
