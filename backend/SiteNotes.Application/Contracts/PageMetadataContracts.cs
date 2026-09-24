namespace SiteNotes.Application.Contracts;

public sealed record PageMetadataDto(
    string Url,
    string Title,
    string Source);
