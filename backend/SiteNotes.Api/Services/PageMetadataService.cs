using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using SiteNotes.Api.Models.Dtos;

namespace SiteNotes.Api.Services;

public class PageMetadataService
{
    private const int MaxHtmlBytes = 512 * 1024;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly HttpClient _httpClient;
    private readonly ILogger<PageMetadataService> _logger;

    public PageMetadataService(HttpClient httpClient, ILogger<PageMetadataService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<PageMetadataDto> GetAsync(string rawUrl, CancellationToken cancellationToken)
    {
        if (!Uri.TryCreate(rawUrl, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            throw new ArgumentException("Url invalida. Use http ou https.");
        }

        if (IsBlockedHost(uri))
        {
            return Fallback(uri, "blocked-host");
        }

        try
        {
            if (TryGetYouTubeVideoId(uri, out _))
            {
                var youtubeTitle = await TryGetYouTubeTitleAsync(uri, cancellationToken);
                if (!string.IsNullOrWhiteSpace(youtubeTitle))
                {
                    return new PageMetadataDto(uri.ToString(), CleanTitle(youtubeTitle), "youtube");
                }
            }

            var htmlTitle = await TryGetHtmlTitleAsync(uri, cancellationToken);
            if (!string.IsNullOrWhiteSpace(htmlTitle))
            {
                return new PageMetadataDto(uri.ToString(), htmlTitle, "page");
            }
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or IOException)
        {
            _logger.LogWarning(ex, "Falha ao obter metadados de {Url}", uri);
        }

        return Fallback(uri, "fallback");
    }

    private async Task<string?> TryGetYouTubeTitleAsync(Uri uri, CancellationToken cancellationToken)
    {
        var oembedUrl = $"https://www.youtube.com/oembed?url={Uri.EscapeDataString(uri.ToString())}&format=json";

        using var response = await _httpClient.GetAsync(oembedUrl, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return null;
        }

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        var payload = await JsonSerializer.DeserializeAsync<YouTubeOEmbedResponse>(stream, JsonOptions, cancellationToken);
        return payload?.Title;
    }

    private async Task<string?> TryGetHtmlTitleAsync(Uri uri, CancellationToken cancellationToken)
    {
        using var response = await _httpClient.GetAsync(uri, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return null;
        }

        var mediaType = response.Content.Headers.ContentType?.MediaType;
        if (mediaType is not null &&
            !mediaType.Contains("html", StringComparison.OrdinalIgnoreCase) &&
            !mediaType.Contains("xml", StringComparison.OrdinalIgnoreCase) &&
            !mediaType.Equals("text/plain", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        var html = await ReadLimitedStringAsync(stream, cancellationToken);
        if (string.IsNullOrWhiteSpace(html))
        {
            return null;
        }

        return ExtractTitleFromHtml(html);
    }

    private static async Task<string> ReadLimitedStringAsync(Stream stream, CancellationToken cancellationToken)
    {
        var buffer = new byte[MaxHtmlBytes];
        var read = 0;

        while (read < buffer.Length)
        {
            var n = await stream.ReadAsync(buffer.AsMemory(read, buffer.Length - read), cancellationToken);
            if (n == 0)
            {
                break;
            }

            read += n;
        }

        return System.Text.Encoding.UTF8.GetString(buffer, 0, read);
    }

    internal static string? ExtractTitleFromHtml(string html)
    {
        var ogTitle = ExtractMetaContent(html, "og:title");
        if (!string.IsNullOrWhiteSpace(ogTitle))
        {
            return CleanTitle(ogTitle);
        }

        var twitterTitle = ExtractMetaContent(html, "twitter:title");
        if (!string.IsNullOrWhiteSpace(twitterTitle))
        {
            return CleanTitle(twitterTitle);
        }

        var heading = ExtractFirstHeading(html);
        if (!string.IsNullOrWhiteSpace(heading))
        {
            return CleanTitle(heading);
        }

        var documentTitle = ExtractDocumentTitle(html);
        return string.IsNullOrWhiteSpace(documentTitle) ? null : CleanTitle(documentTitle);
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
        var match = Regex.Match(html, @"<title\b[^>]*>(?<title>.*?)</title>", RegexOptions.IgnoreCase | RegexOptions.Singleline);
        return match.Success ? Decode(match.Groups["title"].Value) : null;
    }

    private static string? ExtractFirstHeading(string html)
    {
        var match = Regex.Match(html, @"<h1\b[^>]*>(?<heading>.*?)</h1>", RegexOptions.IgnoreCase | RegexOptions.Singleline);
        if (!match.Success)
        {
            return null;
        }

        var heading = Regex.Replace(match.Groups["heading"].Value, "<.*?>", " ");
        return Decode(heading);
    }

    internal static bool TryGetYouTubeVideoId(Uri uri, out string videoId)
    {
        videoId = string.Empty;
        var host = uri.Host.Replace("www.", "", StringComparison.OrdinalIgnoreCase);

        if (host.Equals("youtu.be", StringComparison.OrdinalIgnoreCase))
        {
            var id = uri.AbsolutePath.Trim('/');
            if (!string.IsNullOrWhiteSpace(id))
            {
                videoId = id.Split('/')[0];
                return true;
            }

            return false;
        }

        if (!host.Equals("youtube.com", StringComparison.OrdinalIgnoreCase) &&
            !host.Equals("m.youtube.com", StringComparison.OrdinalIgnoreCase) &&
            !host.Equals("music.youtube.com", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var queryId = uri.Query.TrimStart('?')
            .Split('&', StringSplitOptions.RemoveEmptyEntries)
            .Select(part => part.Split('=', 2))
            .FirstOrDefault(part => part.Length == 2 && part[0].Equals("v", StringComparison.OrdinalIgnoreCase));

        if (queryId is not null)
        {
            videoId = Uri.UnescapeDataString(queryId[1]);
            return !string.IsNullOrWhiteSpace(videoId);
        }

        var segments = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length >= 2 &&
            (segments[0].Equals("shorts", StringComparison.OrdinalIgnoreCase) ||
             segments[0].Equals("embed", StringComparison.OrdinalIgnoreCase) ||
             segments[0].Equals("live", StringComparison.OrdinalIgnoreCase)))
        {
            videoId = segments[1];
            return !string.IsNullOrWhiteSpace(videoId);
        }

        return false;
    }

    internal static string CleanTitle(string title)
    {
        var decoded = Decode(title);
        decoded = Regex.Replace(decoded, @"\s+", " ").Trim();

        if (decoded.EndsWith(" - YouTube", StringComparison.OrdinalIgnoreCase))
        {
            decoded = decoded[..^" - YouTube".Length].Trim();
        }

        return decoded;
    }

    private static string Decode(string value) =>
        WebUtility.HtmlDecode(value.Replace('\u00a0', ' ')).Trim();

    private static PageMetadataDto Fallback(Uri uri, string source)
    {
        var hostTitle = uri.Host.Replace("www.", "", StringComparison.OrdinalIgnoreCase);
        return new PageMetadataDto(uri.ToString(), hostTitle, source);
    }

    private static bool IsBlockedHost(Uri uri)
    {
        var host = uri.Host;
        if (host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
            host.Equals("::1") ||
            host.EndsWith(".local", StringComparison.OrdinalIgnoreCase) ||
            host.EndsWith(".internal", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (!IPAddress.TryParse(host, out var ip))
        {
            return false;
        }

        return IPAddress.IsLoopback(ip) || IsPrivateIp(ip);
    }

    private static bool IsPrivateIp(IPAddress ip)
    {
        if (ip.IsIPv4MappedToIPv6)
        {
            ip = ip.MapToIPv4();
        }

        var bytes = ip.GetAddressBytes();
        if (ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork && bytes.Length == 4)
        {
            return bytes[0] == 10
                || (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31)
                || (bytes[0] == 192 && bytes[1] == 168)
                || (bytes[0] == 169 && bytes[1] == 254);
        }

        if (ip.AddressFamily != System.Net.Sockets.AddressFamily.InterNetworkV6)
        {
            return false;
        }

        if (ip.IsIPv6LinkLocal || ip.IsIPv6SiteLocal)
        {
            return true;
        }

        // Unique local (fc00::/7).
        return bytes.Length > 0 && (bytes[0] & 0xfe) == 0xfc;
    }

    private sealed class YouTubeOEmbedResponse
    {
        public string? Title { get; set; }
    }
}
