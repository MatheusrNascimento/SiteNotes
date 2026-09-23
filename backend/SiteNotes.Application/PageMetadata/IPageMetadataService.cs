using SiteNotes.Application.Contracts;

namespace SiteNotes.Application.PageMetadata;

public interface IPageMetadataService
{
    Task<PageMetadataDto> GetAsync(string? url, CancellationToken cancellationToken);
}
