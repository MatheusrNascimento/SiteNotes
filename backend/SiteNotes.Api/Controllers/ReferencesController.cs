using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MongoDB.Bson;
using SiteNotes.Api.Data;
using SiteNotes.Api.Models;
using SiteNotes.Api.Models.Dtos;

namespace SiteNotes.Api.Controllers;

[ApiController]
[Route("api/references")]
public class ReferencesController : ControllerBase
{
    private readonly SiteNotesDbContext _db;

    public ReferencesController(SiteNotesDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ReferenceDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? tag,
        CancellationToken cancellationToken)
    {
        var references = await _db.References.ToListAsync(cancellationToken);

        IEnumerable<Reference> filtered = references;

        if (!string.IsNullOrWhiteSpace(search))
        {
            filtered = filtered.Where(r =>
                r.Title.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                r.Url.Contains(search, StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(tag))
        {
            filtered = filtered.Where(r => r.Tags.Contains(tag, StringComparer.OrdinalIgnoreCase));
        }

        var result = filtered
            .OrderByDescending(r => r.UpdatedAt)
            .Select(ToDto);

        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ReferenceDto>> GetById(string id, CancellationToken cancellationToken)
    {
        if (!ObjectId.TryParse(id, out var objectId))
        {
            return BadRequest("Id invalido.");
        }

        var reference = await _db.References.FindAsync([objectId], cancellationToken);
        if (reference is null)
        {
            return NotFound();
        }

        return Ok(ToDto(reference));
    }

    [HttpPost]
    public async Task<ActionResult<ReferenceDto>> Create(
        [FromBody] CreateReferenceRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Url))
        {
            return BadRequest("Url e obrigatoria.");
        }

        var now = DateTime.UtcNow;
        var reference = new Reference
        {
            Url = request.Url.Trim(),
            Title = string.IsNullOrWhiteSpace(request.Title) ? request.Url.Trim() : request.Title.Trim(),
            Tags = NormalizeTags(request.Tags),
            CreatedAt = now,
            UpdatedAt = now,
        };

        _db.References.Add(reference);
        await _db.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = reference.Id.ToString() }, ToDto(reference));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ReferenceDto>> Update(
        string id,
        [FromBody] UpdateReferenceRequest request,
        CancellationToken cancellationToken)
    {
        if (!ObjectId.TryParse(id, out var objectId))
        {
            return BadRequest("Id invalido.");
        }

        var reference = await _db.References.FindAsync([objectId], cancellationToken);
        if (reference is null)
        {
            return NotFound();
        }

        reference.Url = string.IsNullOrWhiteSpace(request.Url) ? reference.Url : request.Url.Trim();
        reference.Title = string.IsNullOrWhiteSpace(request.Title) ? reference.Title : request.Title.Trim();
        reference.Tags = NormalizeTags(request.Tags);
        reference.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        return Ok(ToDto(reference));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
    {
        if (!ObjectId.TryParse(id, out var objectId))
        {
            return BadRequest("Id invalido.");
        }

        var reference = await _db.References.FindAsync([objectId], cancellationToken);
        if (reference is null)
        {
            return NotFound();
        }

        _db.References.Remove(reference);

        var notes = await _db.Notes.ToListAsync(cancellationToken);
        var notesToRemove = notes.Where(n => n.ReferenceId == objectId);
        _db.Notes.RemoveRange(notesToRemove);

        await _db.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [HttpGet("{id}/notes")]
    public async Task<ActionResult<IEnumerable<NoteDto>>> GetNotes(string id, CancellationToken cancellationToken)
    {
        if (!ObjectId.TryParse(id, out var objectId))
        {
            return BadRequest("Id invalido.");
        }

        var referenceExists = await _db.References.FindAsync([objectId], cancellationToken);
        if (referenceExists is null)
        {
            return NotFound();
        }

        var notes = await _db.Notes.ToListAsync(cancellationToken);
        var result = notes
            .Where(n => n.ReferenceId == objectId)
            .OrderByDescending(n => n.CreatedAt)
            .Select(ToDto);

        return Ok(result);
    }

    [HttpPost("{id}/notes")]
    public async Task<ActionResult<NoteDto>> AddNote(
        string id,
        [FromBody] CreateNoteRequest request,
        CancellationToken cancellationToken)
    {
        if (!ObjectId.TryParse(id, out var objectId))
        {
            return BadRequest("Id invalido.");
        }

        var reference = await _db.References.FindAsync([objectId], cancellationToken);
        if (reference is null)
        {
            return NotFound();
        }

        if (string.IsNullOrWhiteSpace(request.Content))
        {
            return BadRequest("Conteudo da anotacao nao pode ser vazio.");
        }

        var now = DateTime.UtcNow;
        var note = new NoteEntry
        {
            ReferenceId = objectId,
            Content = request.Content.Trim(),
            CreatedAt = now,
            UpdatedAt = now,
        };

        _db.Notes.Add(note);

        reference.UpdatedAt = now;

        await _db.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetNotes), new { id }, ToDto(note));
    }

    private static List<string> NormalizeTags(List<string>? tags) =>
        (tags ?? [])
            .Select(t => t.Trim())
            .Where(t => t.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

    private static ReferenceDto ToDto(Reference reference) => new(
        reference.Id.ToString(),
        reference.Url,
        reference.Title,
        reference.Tags,
        reference.CreatedAt,
        reference.UpdatedAt);

    private static NoteDto ToDto(NoteEntry note) => new(
        note.Id.ToString(),
        note.ReferenceId.ToString(),
        note.Content,
        note.CreatedAt,
        note.UpdatedAt);
}
