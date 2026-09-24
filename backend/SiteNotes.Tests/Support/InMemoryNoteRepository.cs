using SiteNotes.Domain.Notes;
using SiteNotes.Domain.References;

namespace SiteNotes.Tests.Support;

internal sealed class InMemoryNoteRepository : INoteRepository
{
    private readonly Dictionary<string, Note> _items = new(StringComparer.OrdinalIgnoreCase);

    public Task AddAsync(Note note, CancellationToken cancellationToken)
    {
        _items[note.Id.Value] = note;
        return Task.CompletedTask;
    }

    public Task<Note?> GetByIdAsync(NoteId id, CancellationToken cancellationToken)
    {
        _items.TryGetValue(id.Value, out var note);
        return Task.FromResult(note);
    }

    public Task<IReadOnlyList<Note>> ListByReferenceAsync(ReferenceId referenceId, CancellationToken cancellationToken)
    {
        IReadOnlyList<Note> notes = _items.Values
            .Where(note => note.ReferenceId.Equals(referenceId))
            .ToList();
        return Task.FromResult(notes);
    }

    public Task<IReadOnlyList<Note>> ListMentioningAsync(ReferenceId referenceId, CancellationToken cancellationToken)
    {
        IReadOnlyList<Note> notes = _items.Values
            .Where(note => note.MentionedReferenceIds.Any(id => id.Equals(referenceId)))
            .ToList();
        return Task.FromResult(notes);
    }

    public void Remove(Note note) => _items.Remove(note.Id.Value);

    public Task RemoveByReferenceAsync(ReferenceId referenceId, CancellationToken cancellationToken)
    {
        var matches = _items.Values.Where(note => note.ReferenceId.Equals(referenceId)).Select(note => note.Id.Value).ToList();
        foreach (var id in matches)
        {
            _items.Remove(id);
        }

        return Task.CompletedTask;
    }

    public void Update(Note note) => _items[note.Id.Value] = note;
}
