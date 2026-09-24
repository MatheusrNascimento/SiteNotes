using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using MongoDB.Bson;
using SiteNotes.Api.Data;
using SiteNotes.Api.Models;
using SiteNotes.Api.Models.Dtos;

namespace SiteNotes.Api.Services;

public static partial class NoteMentions
{
    [GeneratedRegex(@"@\[(?<title>[^\]]*)\]\(ref:(?<id>[a-fA-F0-9]{24})\)", RegexOptions.CultureInvariant)]
    private static partial Regex TokenRegex();

    public static async Task<List<ObjectId>> ResolveMentionedIdsAsync(
        SiteNotesDbContext db,
        string content,
        CancellationToken cancellationToken)
    {
        var parsed = ParseIds(content);
        if (parsed.Count == 0)
        {
            return [];
        }

        var references = await db.References.ToListAsync(cancellationToken);
        var existing = references.Select(reference => reference.Id).ToHashSet();
        return parsed.Where(existing.Contains).ToList();
    }

    public static async Task<NoteDto> ToDtoAsync(
        SiteNotesDbContext db,
        NoteEntry note,
        CancellationToken cancellationToken)
    {
        var dtos = await ToDtosAsync(db, [note], cancellationToken);
        return dtos[0];
    }

    public static async Task<List<NoteDto>> ToDtosAsync(
        SiteNotesDbContext db,
        IEnumerable<NoteEntry> notes,
        CancellationToken cancellationToken)
    {
        var noteList = notes.ToList();
        var titles = await LoadTitlesAsync(db, noteList.Select(note => note.Content), cancellationToken);
        return noteList.Select(note => ToDto(note, titles)).ToList();
    }

    public static string ToExcerpt(string content, int maxLength = 140)
    {
        var readable = TokenRegex().Replace(content, match => match.Groups["title"].Value);
        readable = WhitespaceRegex().Replace(readable, " ").Trim();
        if (readable.Length <= maxLength)
        {
            return readable;
        }

        return readable[..maxLength].TrimEnd() + "...";
    }

    private static List<ObjectId> ParseIds(string content)
    {
        var parsed = new List<ObjectId>();
        var seen = new HashSet<ObjectId>();
        foreach (Match match in TokenRegex().Matches(content))
        {
            if (ObjectId.TryParse(match.Groups["id"].Value, out var id) && seen.Add(id))
            {
                parsed.Add(id);
            }
        }

        return parsed;
    }

    private static async Task<Dictionary<ObjectId, string>> LoadTitlesAsync(
        SiteNotesDbContext db,
        IEnumerable<string> contents,
        CancellationToken cancellationToken)
    {
        var ids = new HashSet<ObjectId>();
        foreach (var content in contents)
        {
            foreach (var id in ParseIds(content))
            {
                ids.Add(id);
            }
        }

        var titles = new Dictionary<ObjectId, string>();
        if (ids.Count == 0)
        {
            return titles;
        }

        var references = await db.References.ToListAsync(cancellationToken);
        foreach (var reference in references)
        {
            if (ids.Contains(reference.Id))
            {
                titles[reference.Id] = reference.Title;
            }
        }

        return titles;
    }

    private static NoteDto ToDto(NoteEntry note, IReadOnlyDictionary<ObjectId, string> titles) => new(
        note.Id.ToString(),
        note.ReferenceId.ToString(),
        note.Content,
        note.CreatedAt,
        note.UpdatedAt,
        BuildSegments(note.Content, titles));

    private static List<NoteSegmentDto> BuildSegments(string content, IReadOnlyDictionary<ObjectId, string> titles)
    {
        var segments = new List<NoteSegmentDto>();
        var index = 0;
        foreach (Match match in TokenRegex().Matches(content))
        {
            if (match.Index > index)
            {
                segments.Add(new NoteSegmentDto("text", content[index..match.Index], null, false));
            }

            var snapshot = match.Groups["title"].Value;
            var idText = match.Groups["id"].Value;
            string? currentTitle = null;
            var exists = ObjectId.TryParse(idText, out var id) && titles.TryGetValue(id, out currentTitle);
            var title = exists
                ? currentTitle ?? snapshot
                : string.IsNullOrWhiteSpace(snapshot) ? "Referencia excluida" : snapshot;
            segments.Add(new NoteSegmentDto("mention", title, idText, exists));
            index = match.Index + match.Length;
        }

        if (index < content.Length || segments.Count == 0)
        {
            segments.Add(new NoteSegmentDto("text", content[index..], null, false));
        }

        return segments;
    }

    [GeneratedRegex(@"\s+")]
    private static partial Regex WhitespaceRegex();
}
