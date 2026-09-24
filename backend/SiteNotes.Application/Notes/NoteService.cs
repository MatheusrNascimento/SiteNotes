using SiteNotes.Application.Abstractions;
using SiteNotes.Application.Common;
using SiteNotes.Application.Contracts;
using SiteNotes.Domain.Notes;
using SiteNotes.Domain.Persistence;
using SiteNotes.Domain.References;

namespace SiteNotes.Application.Notes;

public sealed class NoteService : INoteService
{
    private readonly INoteRepository _notes;
    private readonly IReferenceRepository _references;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IClock _clock;

    public NoteService(
        INoteRepository notes,
        IReferenceRepository references,
        IUnitOfWork unitOfWork,
        IClock clock)
    {
        _notes = notes;
        _references = references;
        _unitOfWork = unitOfWork;
        _clock = clock;
    }

    public async Task<NoteDto> GetByIdAsync(string id, CancellationToken cancellationToken)
    {
        var note = await FindAsync(id, cancellationToken);
        var titles = await LoadMentionTitlesAsync([note.Content], cancellationToken);
        return NoteMentions.ToDto(note, titles);
    }

    public async Task<NoteDto> UpdateAsync(string id, UpdateNoteRequest request, CancellationToken cancellationToken)
    {
        var note = await FindAsync(id, cancellationToken);
        var content = request.Content;
        var mentioned = await ResolveMentionsAsync(content ?? string.Empty, cancellationToken);
        note.Revise(content, _clock.UtcNow, mentioned);
        _notes.Update(note);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var titles = await LoadMentionTitlesAsync([note.Content], cancellationToken);
        return NoteMentions.ToDto(note, titles);
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

    private async Task<IReadOnlyList<ReferenceId>> ResolveMentionsAsync(
        string content,
        CancellationToken cancellationToken)
    {
        var references = await _references.ListAsync(cancellationToken);
        var existing = references
            .Select(reference => reference.Id.Value)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        return NoteMentions.ResolveMentionedIds(content, existing);
    }

    private async Task<IReadOnlyDictionary<string, string>> LoadMentionTitlesAsync(
        IEnumerable<string> contents,
        CancellationToken cancellationToken)
    {
        var ids = NoteMentions.CollectIds(contents);
        if (ids.Count == 0)
        {
            return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        }

        var references = await _references.ListAsync(cancellationToken);
        return references
            .Where(reference => ids.Contains(reference.Id.Value))
            .ToDictionary(
                reference => reference.Id.Value,
                reference => reference.Title,
                StringComparer.OrdinalIgnoreCase);
    }
}
