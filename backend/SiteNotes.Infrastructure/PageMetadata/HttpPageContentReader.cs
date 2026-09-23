using System.Text.Json;
using SiteNotes.Application.PageMetadata;

namespace SiteNotes.Infrastructure.PageMetadata;

public sealed class HttpPageContentReader : IPageContentReader
{
    private const int MaxHtmlBytes = 512 * 1024;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly HttpClient _httpClient;

    public HttpPageContentReader(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<string?> TryReadYouTubeTitleAsync(Uri pageUrl, CancellationToken cancellationToken)
    {
        var oembedUrl = $"https://www.youtube.com/oembed?url={Uri.EscapeDataString(pageUrl.ToString())}&format=json";

        using var response = await _httpClient.GetAsync(oembedUrl, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return null;
        }

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        var payload = await JsonSerializer.DeserializeAsync<YouTubeOEmbedResponse>(stream, JsonOptions, cancellationToken);
        return payload?.Title;
    }

    public async Task<string?> TryReadHtmlAsync(Uri pageUrl, CancellationToken cancellationToken)
    {
        using var response = await _httpClient.GetAsync(pageUrl, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
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
        return string.IsNullOrWhiteSpace(html) ? null : html;
    }

    private static async Task<string> ReadLimitedStringAsync(Stream stream, CancellationToken cancellationToken)
    {
        var buffer = new byte[MaxHtmlBytes];
        var read = 0;

        while (read < buffer.Length)
        {
            var count = await stream.ReadAsync(buffer.AsMemory(read, buffer.Length - read), cancellationToken);
            if (count == 0)
            {
                break;
            }

            read += count;
        }

        return System.Text.Encoding.UTF8.GetString(buffer, 0, read);
    }

    private sealed class YouTubeOEmbedResponse
    {
        public string? Title { get; set; }
    }
}
