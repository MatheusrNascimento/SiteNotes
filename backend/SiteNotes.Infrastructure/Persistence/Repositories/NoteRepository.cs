using Microsoft.EntityFrameworkCore;
using MongoDB.Bson;
using SiteNotes.Domain.Notes;
using SiteNotes.Domain.References;
using SiteNotes.Infrastructure.Persistence.Documents;
using SiteNotes.Infrastructure.Persistence.Mapping;

namespace SiteNotes.Infrastructure.Persistence.Repositories;

public sealed class NoteRepository : INoteRepository
{
    private readonly SiteNotesDbContext _db;
    private readonly Dictionary<string, NoteDocument> _loaded = new(StringComparer.OrdinalIgnoreCase);

    public NoteRepository(SiteNotesDbContext db)
    {
        _db = db;
    }

    public async Task<Note?> GetByIdAsync(NoteId id, CancellationToken cancellationToken)
    {
        if (!ObjectId.TryParse(id.Value, out var objectId))
        {
            return null;
        }

        var document = await _db.Notes.FindAsync([objectId], cancellationToken);
        if (document is null)
        {
            return null;
        }

        _loaded[id.Value] = document;
        return NoteMapper.ToDomain(document);
    }

    public async Task<IReadOnlyList<Note>> ListByReferenceAsync(ReferenceId referenceId, CancellationToken cancellationToken)
    {
        var documents = await _db.Notes.ToListAsync(cancellationToken);
        return documents
            .Where(document => document.ReferenceId.ToString().Equals(referenceId.Value, StringComparison.OrdinalIgnoreCase))
            .Select(NoteMapper.ToDomain)
            .ToList();
    }

    public Task AddAsync(Note note, CancellationToken cancellationToken)
    {
        var document = NoteMapper.ToDocument(note);
        _loaded[note.Id.Value] = document;
        _db.Notes.Add(document);
        return Task.CompletedTask;
    }

    public void Update(Note note)
    {
        if (!_loaded.TryGetValue(note.Id.Value, out var document))
        {
            throw new InvalidOperationException("A anotacao precisa ser carregada ou adicionada antes de ser atualizada.");
        }

        NoteMapper.Copy(note, document);
    }

    public void Remove(Note note)
    {
        if (!_loaded.TryGetValue(note.Id.Value, out var document))
        {
            throw new InvalidOperationException("A anotacao precisa ser carregada antes de ser removida.");
        }

        _db.Notes.Remove(document);
        _loaded.Remove(note.Id.Value);
    }

    public async Task RemoveByReferenceAsync(ReferenceId referenceId, CancellationToken cancellationToken)
    {
        var documents = await _db.Notes.ToListAsync(cancellationToken);
        var matches = documents
            .Where(document => document.ReferenceId.ToString().Equals(referenceId.Value, StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (matches.Count == 0)
        {
            return;
        }

        _db.Notes.RemoveRange(matches);
        foreach (var match in matches)
        {
            _loaded.Remove(match.Id.ToString());
        }
    }
}
