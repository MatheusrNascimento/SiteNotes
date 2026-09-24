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

    [HttpGet("{id}")]
    public async Task<ActionResult<ReferenceDto>> GetById(string id, CancellationToken cancellationToken)
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

    [HttpPut("{id}")]
    public async Task<ActionResult<ReferenceDto>> Update(
        string id,
        [FromBody] UpdateReferenceRequest request,
        CancellationToken cancellationToken)
    {
        var reference = await _references.UpdateAsync(id, request, cancellationToken);
        return Ok(reference);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
    {
        await _references.DeleteAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpGet("{id}/notes")]
    public async Task<ActionResult<IEnumerable<NoteDto>>> GetNotes(string id, CancellationToken cancellationToken)
    {
        var notes = await _references.ListNotesAsync(id, cancellationToken);
        return Ok(notes);
    }

    [HttpPost("{id}/notes")]
    public async Task<ActionResult<NoteDto>> AddNote(
        string id,
        [FromBody] CreateNoteRequest request,
        CancellationToken cancellationToken)
    {
        var note = await _references.AddNoteAsync(id, request, cancellationToken);
        return CreatedAtAction(nameof(GetNotes), new { id }, note);
    }

    [HttpGet("{id}/backlinks")]
    public async Task<ActionResult<IEnumerable<NoteBacklinkDto>>> GetBacklinks(
        string id,
        CancellationToken cancellationToken)
    {
        var backlinks = await _references.ListBacklinksAsync(id, cancellationToken);
        return Ok(backlinks);
    }
}
