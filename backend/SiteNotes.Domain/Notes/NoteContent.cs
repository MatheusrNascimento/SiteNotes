using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using SiteNotes.Domain.Common;

namespace SiteNotes.Domain.Notes;

/// <summary>
/// Normaliza o conteudo da anotacao: texto legado ou documento TipTap JSON
/// (paragrafos + marks de link http/https).
/// </summary>
public static class NoteContent
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public static string Normalize(string? content)
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            throw new DomainException(DomainErrors.Notes.EmptyContent);
        }

        var trimmed = content.Trim();
        if (TryParseTipTapDoc(trimmed, out var doc))
        {
            SanitizeLinks(doc);
            if (string.IsNullOrWhiteSpace(ExtractPlainText(doc)))
            {
                throw new DomainException(DomainErrors.Notes.EmptyContent);
            }

            return doc.ToJsonString(JsonOptions);
        }

        return trimmed;
    }

    private static bool TryParseTipTapDoc(string raw, out JsonObject doc)
    {
        doc = null!;
        if (!raw.StartsWith('{'))
        {
            return false;
        }

        try
        {
            var node = JsonNode.Parse(raw);
            if (node is not JsonObject obj)
            {
                return false;
            }

            if (obj["type"]?.GetValue<string>() != "doc")
            {
                return false;
            }

            doc = obj;
            return true;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static string ExtractPlainText(JsonNode? node)
    {
        if (node is null)
        {
            return string.Empty;
        }

        if (node is JsonObject obj)
        {
            if (obj["type"]?.GetValue<string>() == "text" && obj["text"] is JsonValue textValue)
            {
                return textValue.GetValue<string>() ?? string.Empty;
            }

            if (obj["content"] is JsonArray children)
            {
                var builder = new StringBuilder();
                foreach (var child in children)
                {
                    builder.Append(ExtractPlainText(child));
                }

                return builder.ToString();
            }
        }

        if (node is JsonArray array)
        {
            var builder = new StringBuilder();
            foreach (var child in array)
            {
                builder.Append(ExtractPlainText(child));
            }

            return builder.ToString();
        }

        return string.Empty;
    }

    private static void SanitizeLinks(JsonNode? node)
    {
        if (node is JsonObject obj)
        {
            if (obj["marks"] is JsonArray marks)
            {
                for (var i = marks.Count - 1; i >= 0; i--)
                {
                    if (marks[i] is not JsonObject mark)
                    {
                        continue;
                    }

                    if (mark["type"]?.GetValue<string>() != "link")
                    {
                        continue;
                    }

                    var href = mark["attrs"]?["href"]?.GetValue<string>();
                    if (!IsHttpUrl(href))
                    {
                        marks.RemoveAt(i);
                        continue;
                    }

                    var attrs = mark["attrs"] as JsonObject ?? new JsonObject();
                    attrs["href"] = href!.Trim();
                    attrs["target"] = "_blank";
                    attrs["rel"] = "noopener noreferrer nofollow";
                    mark["attrs"] = attrs;
                }

                if (marks.Count == 0)
                {
                    obj.Remove("marks");
                }
            }

            if (obj["content"] is JsonArray children)
            {
                foreach (var child in children)
                {
                    SanitizeLinks(child);
                }
            }
        }
        else if (node is JsonArray array)
        {
            foreach (var child in array)
            {
                SanitizeLinks(child);
            }
        }
    }

    private static bool IsHttpUrl(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return false;
        }

        if (!Uri.TryCreate(raw.Trim(), UriKind.Absolute, out var uri))
        {
            return false;
        }

        return uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps;
    }
}
