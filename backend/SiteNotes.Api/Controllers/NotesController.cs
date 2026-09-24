using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MongoDB.Bson;
using SiteNotes.Api.Data;
using SiteNotes.Api.Models;
using SiteNotes.Api.Models.Dtos;

namespace SiteNotes.Api.Controllers;

[ApiController]
[Route("api/notes")]
public class NotesController : ControllerBase
{
    private readonly SiteNotesDbContext _db;

    public NotesController(SiteNotesDbContext db)
    {
        _db = db;
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<NoteDto>> GetById(string id, CancellationToken cancellationToken)
    {
        if (!ObjectId.TryParse(id, out var objectId))
        {
            return BadRequest("Id invalido.");
        }

        var note = await _db.Notes.FindAsync([objectId], cancellationToken);
        if (note is null)
        {
            return NotFound();
        }

        return Ok(ToDto(note));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<NoteDto>> Update(
        string id,
        [FromBody] UpdateNoteRequest request,
        CancellationToken cancellationToken)
    {
        if (!ObjectId.TryParse(id, out var objectId))
        {
            return BadRequest("Id invalido.");
        }

        if (string.IsNullOrWhiteSpace(request.Content))
        {
            return BadRequest("Conteudo da anotacao nao pode ser vazio.");
        }

        var note = await _db.Notes.FindAsync([objectId], cancellationToken);
        if (note is null)
        {
            return NotFound();
        }

        note.Content = request.Content.Trim();
        note.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        return Ok(ToDto(note));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
    {
        if (!ObjectId.TryParse(id, out var objectId))
        {
            return BadRequest("Id invalido.");
        }

        var note = await _db.Notes.FindAsync([objectId], cancellationToken);
        if (note is null)
        {
            return NotFound();
        }

        _db.Notes.Remove(note);
        await _db.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    private static NoteDto ToDto(NoteEntry note) => new(
        note.Id.ToString(),
        note.ReferenceId.ToString(),
        note.Content,
        note.CreatedAt,
        note.UpdatedAt);
}
