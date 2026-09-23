using Microsoft.AspNetCore.Mvc;
using SiteNotes.Application.Contracts;
using SiteNotes.Application.PageMetadata;

namespace SiteNotes.Api.Controllers;

[ApiController]
[Route("api/page-metadata")]
public class PageMetadataController : ControllerBase
{
    private readonly IPageMetadataService _pageMetadata;

    public PageMetadataController(IPageMetadataService pageMetadata)
    {
        _pageMetadata = pageMetadata;
    }

    [HttpGet]
    public async Task<ActionResult<PageMetadataDto>> Get(
        [FromQuery] string url,
        CancellationToken cancellationToken)
    {
        var metadata = await _pageMetadata.GetAsync(url, cancellationToken);
        return Ok(metadata);
    }
}
