namespace SiteNotes.Application.PageMetadata;

public interface IPageContentReader
{
    Task<string?> TryReadYouTubeTitleAsync(Uri pageUrl, CancellationToken cancellationToken);
    Task<string?> TryReadHtmlAsync(Uri pageUrl, CancellationToken cancellationToken);
}
