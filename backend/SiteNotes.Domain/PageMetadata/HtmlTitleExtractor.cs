using System.Net;
using System.Text.RegularExpressions;

namespace SiteNotes.Domain.PageMetadata;

public static partial class HtmlTitleExtractor
{
    public static string? Extract(string html)
    {
        var ogTitle = ExtractMetaContent(html, "og:title");
        if (!string.IsNullOrWhiteSpace(ogTitle))
        {
            return PageTitle.Normalize(ogTitle);
        }

        var twitterTitle = ExtractMetaContent(html, "twitter:title");
        if (!string.IsNullOrWhiteSpace(twitterTitle))
        {
            return PageTitle.Normalize(twitterTitle);
        }

        var heading = ExtractFirstHeading(html);
        if (!string.IsNullOrWhiteSpace(heading))
        {
            return PageTitle.Normalize(heading);
        }

        var documentTitle = ExtractDocumentTitle(html);
        return string.IsNullOrWhiteSpace(documentTitle) ? null : PageTitle.Normalize(documentTitle);
    }

    private static string? ExtractMetaContent(string html, string key)
    {
        var pattern =
            $@"<meta\b[^>]*(?:property|name)\s*=\s*[""']{Regex.Escape(key)}[""'][^>]*content\s*=\s*[""'](?<content>.*?)[""'][^>]*/?>|" +
            $@"<meta\b[^>]*content\s*=\s*[""'](?<content>.*?)[""'][^>]*(?:property|name)\s*=\s*[""']{Regex.Escape(key)}[""'][^>]*/?>";

        var match = Regex.Match(html, pattern, RegexOptions.IgnoreCase | RegexOptions.Singleline);
        return match.Success ? Decode(match.Groups["content"].Value) : null;
    }

    private static string? ExtractDocumentTitle(string html)
    {
        var match = DocumentTitle().Match(html);
        return match.Success ? Decode(match.Groups["title"].Value) : null;
    }

    private static string? ExtractFirstHeading(string html)
    {
        var match = FirstHeading().Match(html);
        if (!match.Success)
        {
            return null;
        }

        var heading = HtmlTag().Replace(match.Groups["heading"].Value, " ");
        return Decode(heading);
    }

    private static string Decode(string value) =>
        WebUtility.HtmlDecode(value.Replace('\u00a0', ' ')).Trim();

    [GeneratedRegex(@"<title\b[^>]*>(?<title>.*?)</title>", RegexOptions.IgnoreCase | RegexOptions.Singleline)]
    private static partial Regex DocumentTitle();

    [GeneratedRegex(@"<h1\b[^>]*>(?<heading>.*?)</h1>", RegexOptions.IgnoreCase | RegexOptions.Singleline)]
    private static partial Regex FirstHeading();

    [GeneratedRegex("<.*?>")]
    private static partial Regex HtmlTag();
}
