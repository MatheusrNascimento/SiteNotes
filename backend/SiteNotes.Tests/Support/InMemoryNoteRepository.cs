using SiteNotes.Domain.Notes;

namespace SiteNotes.Tests.Support;

internal sealed class InMemoryNoteRepository : INoteRepository
{
    private readonly Dictionary<long, Note> _items = [];
    private readonly IdentitySequence _sequence = new();

    public Task AddAsync(Note note, CancellationToken cancellationToken)
    {
        _sequence.Assign(note);
        _items[note.Id] = note;
        return Task.CompletedTask;
    }

    public Task<Note?> GetByIdAsync(long id, CancellationToken cancellationToken)
    {
        _items.TryGetValue(id, out var note);
        return Task.FromResult(note);
    }

    public Task<IReadOnlyList<Note>> ListByReferenceAsync(long referenceId, CancellationToken cancellationToken)
    {
        IReadOnlyList<Note> notes = _items.Values
            .Where(note => note.ReferenceId == referenceId)
            .ToList();
        return Task.FromResult(notes);
    }

    public void Remove(Note note) => _items.Remove(note.Id);
}
