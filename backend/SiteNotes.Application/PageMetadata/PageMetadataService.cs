using Microsoft.Extensions.Logging;
using SiteNotes.Application.Contracts;
using SiteNotes.Domain.Common;
using SiteNotes.Domain.PageMetadata;

namespace SiteNotes.Application.PageMetadata;

public sealed class PageMetadataService : IPageMetadataService
{
    private readonly IPageContentReader _reader;
    private readonly ILogger<PageMetadataService> _logger;

    public PageMetadataService(IPageContentReader reader, ILogger<PageMetadataService> logger)
    {
        _reader = reader;
        _logger = logger;
    }

    public async Task<PageMetadataDto> GetAsync(string? url, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            throw new DomainException("Url e obrigatoria.");
        }

        var address = PageAddress.Create(url.Trim());
        if (address.IsBlocked)
        {
            return new PageMetadataDto(address.Value, address.HostTitle, "blocked-host");
        }

        try
        {
            if (YouTubeVideo.TryGetId(address.Uri, out _))
            {
                var youtubeTitle = await _reader.TryReadYouTubeTitleAsync(address.Uri, cancellationToken);
                if (!string.IsNullOrWhiteSpace(youtubeTitle))
                {
                    return new PageMetadataDto(address.Value, PageTitle.Normalize(youtubeTitle), "youtube");
                }
            }

            var html = await _reader.TryReadHtmlAsync(address.Uri, cancellationToken);
            if (!string.IsNullOrWhiteSpace(html))
            {
                var htmlTitle = HtmlTitleExtractor.Extract(html);
                if (!string.IsNullOrWhiteSpace(htmlTitle))
                {
                    return new PageMetadataDto(address.Value, htmlTitle, "page");
                }
            }
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException or IOException)
        {
            _logger.LogWarning(exception, "Falha ao obter metadados de {Url}", address.Uri);
        }

        return new PageMetadataDto(address.Value, address.HostTitle, "fallback");
    }
}
