using SiteNotes.Application.Common;
using SiteNotes.Application.Contracts;
using SiteNotes.Application.References;
using SiteNotes.Domain.Common;
using SiteNotes.Domain.References;
using SiteNotes.Domain.Services;
using SiteNotes.Tests.Support;

namespace SiteNotes.Tests.Application;

public class ReferenceServiceTests
{
    private readonly FakeClock _clock = new();
    private readonly FakeUnitOfWork _unitOfWork = new();
    private readonly InMemoryReferenceRepository _references = new();
    private readonly InMemoryNoteRepository _notes = new();
    private readonly ReferenceService _service;

    public ReferenceServiceTests()
    {
        _service = new ReferenceService(
            _references,
            _notes,
            _unitOfWork,
            _clock,
            new ReferenceNoteService());
    }

    [Fact]
    public async Task CreateAsync_PersistsReferenceWithNormalizedData()
    {
        var created = await _service.CreateAsync(
            new CreateReferenceRequest(" https://example.com ", "  ", [" A ", "a"]),
            CancellationToken.None);

        Assert.Equal("https://example.com", created.Url);
        Assert.Equal("https://example.com", created.Title);
        Assert.Equal(["A"], created.Tags);
        Assert.Equal(1, _unitOfWork.SaveCount);
        Assert.Equal(created.Id, (await _service.GetByIdAsync(created.Id, CancellationToken.None)).Id);
    }

    [Fact]
    public async Task ListAsync_AppliesSearchAndTag()
    {
        await _service.CreateAsync(new CreateReferenceRequest("https://example.com/a", "Alpha", ["diario"]), CancellationToken.None);
        _clock.UtcNow = _clock.UtcNow.AddHours(1);
        await _service.CreateAsync(new CreateReferenceRequest("https://example.com/b", "Beta", ["video"]), CancellationToken.None);

        var result = await _service.ListAsync("example", "diario", CancellationToken.None);

        Assert.Single(result);
        Assert.Equal("Alpha", result[0].Title);
    }

    [Fact]
    public async Task UpdateAsync_ChangesOnlyProvidedFields()
    {
        var created = await _service.CreateAsync(
            new CreateReferenceRequest("https://example.com", "Original", ["antiga"]),
            CancellationToken.None);
        _clock.UtcNow = _clock.UtcNow.AddDays(1);

        var updated = await _service.UpdateAsync(
            created.Id,
            new UpdateReferenceRequest(" ", "Novo titulo", ["nova"]),
            CancellationToken.None);

        Assert.Equal("https://example.com", updated.Url);
        Assert.Equal("Novo titulo", updated.Title);
        Assert.Equal(["nova"], updated.Tags);
        Assert.Equal(created.CreatedAt, updated.CreatedAt);
        Assert.True(updated.UpdatedAt > created.UpdatedAt);
    }

    [Fact]
    public async Task DeleteAsync_RemovesReferenceAndItsNotes()
    {
        var created = await _service.CreateAsync(
            new CreateReferenceRequest("https://example.com", "Artigo", null),
            CancellationToken.None);
        await _service.AddNoteAsync(created.Id, new CreateNoteRequest("rascunho"), CancellationToken.None);

        await _service.DeleteAsync(created.Id, CancellationToken.None);

        await Assert.ThrowsAsync<NotFoundException>(() => _service.GetByIdAsync(created.Id, CancellationToken.None));
        var remainingNotes = await _notes.ListByReferenceAsync(ReferenceId.Parse(created.Id), CancellationToken.None);
        Assert.Empty(remainingNotes);
    }

    [Fact]
    public async Task AddNoteAsync_StoresNoteAndRefreshesReferenceActivity()
    {
        var created = await _service.CreateAsync(
            new CreateReferenceRequest("https://example.com", "Artigo", null),
            CancellationToken.None);
        var notedAt = _clock.UtcNow.AddMinutes(20);
        _clock.UtcNow = notedAt;

        var note = await _service.AddNoteAsync(created.Id, new CreateNoteRequest("  ideia  "), CancellationToken.None);
        var reference = await _service.GetByIdAsync(created.Id, CancellationToken.None);
        var notes = await _service.ListNotesAsync(created.Id, CancellationToken.None);

        Assert.Equal("ideia", note.Content);
        Assert.Equal(created.Id, note.ReferenceId);
        Assert.Equal(notedAt, reference.UpdatedAt);
        Assert.Equal([note.Id], notes.Select(item => item.Id).ToArray());
    }

    [Fact]
    public async Task GetByIdAsync_RejectsInvalidIdAndMissingReference()
    {
        await Assert.ThrowsAsync<DomainException>(() => _service.GetByIdAsync("abc", CancellationToken.None));
        await Assert.ThrowsAsync<NotFoundException>(() =>
            _service.GetByIdAsync(new string('a', 24), CancellationToken.None));
    }
}
