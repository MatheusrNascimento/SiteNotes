using Microsoft.AspNetCore.Mvc;
using SiteNotes.Application.Contracts;
using SiteNotes.Application.Notes;

namespace SiteNotes.Api.Controllers;

[ApiController]
[Route("api/notes")]
public class NotesController : ControllerBase
{
    private readonly INoteService _notes;

    public NotesController(INoteService notes)
    {
        _notes = notes;
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<NoteDto>> GetById(string id, CancellationToken cancellationToken)
    {
        var note = await _notes.GetByIdAsync(id, cancellationToken);
        return Ok(note);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<NoteDto>> Update(
        string id,
        [FromBody] UpdateNoteRequest request,
        CancellationToken cancellationToken)
    {
        var note = await _notes.UpdateAsync(id, request, cancellationToken);
        return Ok(note);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
    {
        await _notes.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
