using System.Net;
using System.Text.RegularExpressions;

namespace SiteNotes.Domain.PageMetadata;

public static partial class PageTitle
{
    public static string Normalize(string title)
    {
        var decoded = WebUtility.HtmlDecode(title.Replace('\u00a0', ' ')).Trim();
        decoded = Whitespace().Replace(decoded, " ").Trim();

        const string suffix = " - YouTube";
        if (decoded.EndsWith(suffix, StringComparison.OrdinalIgnoreCase))
        {
            decoded = decoded[..^suffix.Length].Trim();
        }

        return decoded;
    }

    [GeneratedRegex(@"\s+")]
    private static partial Regex Whitespace();
}
