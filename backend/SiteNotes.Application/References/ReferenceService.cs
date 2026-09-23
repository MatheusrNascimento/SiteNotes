using SiteNotes.Application.Abstractions;
using SiteNotes.Application.Common;
using SiteNotes.Application.Contracts;
using SiteNotes.Domain.Notes;
using SiteNotes.Domain.Persistence;
using SiteNotes.Domain.References;
using SiteNotes.Domain.Services;

namespace SiteNotes.Application.References;

public sealed class ReferenceService : IReferenceService
{
    private readonly IReferenceRepository _references;
    private readonly INoteRepository _notes;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IClock _clock;
    private readonly ReferenceNoteService _referenceNotes;

    public ReferenceService(
        IReferenceRepository references,
        INoteRepository notes,
        IUnitOfWork unitOfWork,
        IClock clock,
        ReferenceNoteService referenceNotes)
    {
        _references = references;
        _notes = notes;
        _unitOfWork = unitOfWork;
        _clock = clock;
        _referenceNotes = referenceNotes;
    }

    public async Task<IReadOnlyList<ReferenceDto>> ListAsync(
        string? search,
        string? tag,
        CancellationToken cancellationToken)
    {
        var references = await _references.ListAsync(cancellationToken);
        return ReferenceSearch.Apply(references, search, tag)
            .Select(ReferenceDto.From)
            .ToList();
    }

    public async Task<ReferenceDto> GetByIdAsync(string id, CancellationToken cancellationToken)
    {
        var reference = await FindAsync(id, cancellationToken);
        return ReferenceDto.From(reference);
    }

    public async Task<ReferenceDto> CreateAsync(CreateReferenceRequest request, CancellationToken cancellationToken)
    {
        var reference = Reference.Create(request.Url, request.Title, request.Tags, _clock.UtcNow);
        await _references.AddAsync(reference, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return ReferenceDto.From(reference);
    }

    public async Task<ReferenceDto> UpdateAsync(
        string id,
        UpdateReferenceRequest request,
        CancellationToken cancellationToken)
    {
        var reference = await FindAsync(id, cancellationToken);
        reference.ChangeDetails(request.Url, request.Title, request.Tags, _clock.UtcNow);
        _references.Update(reference);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return ReferenceDto.From(reference);
    }

    public async Task DeleteAsync(string id, CancellationToken cancellationToken)
    {
        var referenceId = ReferenceId.Parse(id);
        var reference = await _references.GetByIdAsync(referenceId, cancellationToken)
            ?? throw new NotFoundException();

        _references.Remove(reference);
        await _notes.RemoveByReferenceAsync(referenceId, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<NoteDto>> ListNotesAsync(string referenceId, CancellationToken cancellationToken)
    {
        var reference = await FindAsync(referenceId, cancellationToken);
        var notes = await _notes.ListByReferenceAsync(reference.Id, cancellationToken);
        return Note.ByMostRecent(notes).Select(NoteDto.From).ToList();
    }

    public async Task<NoteDto> AddNoteAsync(
        string referenceId,
        CreateNoteRequest request,
        CancellationToken cancellationToken)
    {
        var reference = await FindAsync(referenceId, cancellationToken);
        var note = _referenceNotes.Add(reference, request.Content, _clock.UtcNow);
        await _notes.AddAsync(note, cancellationToken);
        _references.Update(reference);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return NoteDto.From(note);
    }

    private async Task<Reference> FindAsync(string id, CancellationToken cancellationToken)
    {
        var referenceId = ReferenceId.Parse(id);
        return await _references.GetByIdAsync(referenceId, cancellationToken)
            ?? throw new NotFoundException();
    }
}
