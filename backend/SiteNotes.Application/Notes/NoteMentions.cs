using System.Text.RegularExpressions;
using SiteNotes.Application.Contracts;
using SiteNotes.Domain.Common;
using SiteNotes.Domain.Notes;
using SiteNotes.Domain.References;

namespace SiteNotes.Application.Notes;

public static partial class NoteMentions
{
    [GeneratedRegex(@"@\[(?<title>[^\]]*)\]\(ref:(?<id>[a-fA-F0-9]{24})\)", RegexOptions.CultureInvariant)]
    private static partial Regex TokenRegex();

    public static IReadOnlyList<ReferenceId> ResolveMentionedIds(
        string content,
        IReadOnlySet<string> existingReferenceIds)
    {
        var resolved = new List<ReferenceId>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var id in ParseIds(content))
        {
            if (!existingReferenceIds.Contains(id.Value) || !seen.Add(id.Value))
            {
                continue;
            }

            resolved.Add(id);
        }

        return resolved;
    }

    public static NoteDto ToDto(Note note, IReadOnlyDictionary<string, string> titles) =>
        new(
            note.Id.Value,
            note.ReferenceId.Value,
            note.Content,
            note.CreatedAt,
            note.UpdatedAt,
            BuildSegments(note.Content, titles));

    public static IReadOnlyList<NoteDto> ToDtos(
        IEnumerable<Note> notes,
        IReadOnlyDictionary<string, string> titles) =>
        notes.Select(note => ToDto(note, titles)).ToList();

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

    public static IReadOnlyList<ReferenceId> ParseIds(string content)
    {
        var parsed = new List<ReferenceId>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (Match match in TokenRegex().Matches(content))
        {
            var idText = match.Groups["id"].Value;
            if (!seen.Add(idText))
            {
                continue;
            }

            try
            {
                parsed.Add(ReferenceId.Parse(idText));
            }
            catch (DomainException)
            {
                // Ignore malformed ids that somehow passed the regex.
            }
        }

        return parsed;
    }

    public static HashSet<string> CollectIds(IEnumerable<string> contents)
    {
        var ids = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var content in contents)
        {
            foreach (var id in ParseIds(content))
            {
                ids.Add(id.Value);
            }
        }

        return ids;
    }

    private static List<NoteSegmentDto> BuildSegments(
        string content,
        IReadOnlyDictionary<string, string> titles)
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
            var idText = match.Groups["id"].Value.ToLowerInvariant();
            var exists = titles.TryGetValue(idText, out var currentTitle);
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
