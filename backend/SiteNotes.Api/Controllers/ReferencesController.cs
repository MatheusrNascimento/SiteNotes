using Microsoft.AspNetCore.Mvc;
using SiteNotes.Application.Contracts;
using SiteNotes.Application.References;

namespace SiteNotes.Api.Controllers;

[ApiController]
[Route("api/references")]
public class ReferencesController : ControllerBase
{
    private readonly IReferenceService _references;

    public ReferencesController(IReferenceService references)
    {
        _references = references;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ReferenceDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? tag,
        CancellationToken cancellationToken)
    {
        var references = await _references.ListAsync(search, tag, cancellationToken);
        return Ok(references);
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ReferenceDto>> GetById(long id, CancellationToken cancellationToken)
    {
        var reference = await _references.GetByIdAsync(id, cancellationToken);
        return Ok(reference);
    }

    [HttpPost]
    public async Task<ActionResult<ReferenceDto>> Create(
        [FromBody] CreateReferenceRequest request,
        CancellationToken cancellationToken)
    {
        var reference = await _references.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = reference.Id }, reference);
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<ReferenceDto>> Update(
        long id,
        [FromBody] UpdateReferenceRequest request,
        CancellationToken cancellationToken)
    {
        var reference = await _references.UpdateAsync(id, request, cancellationToken);
        return Ok(reference);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        await _references.DeleteAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpGet("{id:long}/notes")]
    public async Task<ActionResult<IEnumerable<NoteDto>>> GetNotes(long id, CancellationToken cancellationToken)
    {
        var notes = await _references.ListNotesAsync(id, cancellationToken);
        return Ok(notes);
    }

    [HttpPost("{id:long}/notes")]
    public async Task<ActionResult<NoteDto>> AddNote(
        long id,
        [FromBody] CreateNoteRequest request,
        CancellationToken cancellationToken)
    {
        var note = await _references.AddNoteAsync(id, request, cancellationToken);
        return CreatedAtAction(nameof(NotesController.GetById), "Notes", new { id = note.Id }, note);
    }
}
