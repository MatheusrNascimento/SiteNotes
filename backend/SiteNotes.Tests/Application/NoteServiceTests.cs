using SiteNotes.Application.Common;
using SiteNotes.Application.Contracts;
using SiteNotes.Application.Notes;
using SiteNotes.Application.References;
using SiteNotes.Domain.Common;
using SiteNotes.Domain.Services;
using SiteNotes.Tests.Support;

namespace SiteNotes.Tests.Application;

public class NoteServiceTests
{
    private readonly FakeClock _clock = new();
    private readonly FakeUnitOfWork _unitOfWork = new();
    private readonly InMemoryNoteRepository _notes = new();
    private readonly NoteService _service;
    private readonly ReferenceService _references;

    public NoteServiceTests()
    {
        _service = new NoteService(_notes, _unitOfWork, _clock);
        _references = new ReferenceService(
            new InMemoryReferenceRepository(),
            _notes,
            _unitOfWork,
            _clock,
            new ReferenceNoteService());
    }

    [Fact]
    public async Task UpdateAsync_RevisesContent()
    {
        var reference = await _references.CreateAsync(
            new CreateReferenceRequest("https://example.com", "Artigo", null),
            CancellationToken.None);
        var note = await _references.AddNoteAsync(reference.Id, new CreateNoteRequest("original"), CancellationToken.None);
        _clock.UtcNow = _clock.UtcNow.AddMinutes(5);

        var updated = await _service.UpdateAsync(note.Id, new UpdateNoteRequest("  revisada "), CancellationToken.None);

        Assert.Equal("revisada", updated.Content);
        Assert.Equal(note.CreatedAt, updated.CreatedAt);
        Assert.True(updated.UpdatedAt > note.UpdatedAt);
    }

    [Fact]
    public async Task UpdateAsync_RejectsBlankContent()
    {
        var reference = await _references.CreateAsync(
            new CreateReferenceRequest("https://example.com", "Artigo", null),
            CancellationToken.None);
        var note = await _references.AddNoteAsync(reference.Id, new CreateNoteRequest("original"), CancellationToken.None);

        var exception = await Assert.ThrowsAsync<DomainException>(() =>
            _service.UpdateAsync(note.Id, new UpdateNoteRequest(" "), CancellationToken.None));

        Assert.Equal("Conteudo da anotacao nao pode ser vazio.", exception.Message);
    }

    [Fact]
    public async Task DeleteAsync_RemovesTheNote()
    {
        var reference = await _references.CreateAsync(
            new CreateReferenceRequest("https://example.com", "Artigo", null),
            CancellationToken.None);
        var note = await _references.AddNoteAsync(reference.Id, new CreateNoteRequest("original"), CancellationToken.None);

        await _service.DeleteAsync(note.Id, CancellationToken.None);

        await Assert.ThrowsAsync<NotFoundException>(() => _service.GetByIdAsync(note.Id, CancellationToken.None));
    }
}
