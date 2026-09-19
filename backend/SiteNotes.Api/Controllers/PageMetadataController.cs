using Microsoft.AspNetCore.Mvc;
using SiteNotes.Api.Models.Dtos;
using SiteNotes.Api.Services;

namespace SiteNotes.Api.Controllers;

[ApiController]
[Route("api/page-metadata")]
public class PageMetadataController : ControllerBase
{
    private readonly PageMetadataService _pageMetadata;

    public PageMetadataController(PageMetadataService pageMetadata)
    {
        _pageMetadata = pageMetadata;
    }

    [HttpGet]
    public async Task<ActionResult<PageMetadataDto>> Get(
        [FromQuery] string url,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            return BadRequest("Url e obrigatoria.");
        }

        try
        {
            var metadata = await _pageMetadata.GetAsync(url.Trim(), cancellationToken);
            return Ok(metadata);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}
