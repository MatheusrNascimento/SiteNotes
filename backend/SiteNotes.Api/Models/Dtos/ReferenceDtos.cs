namespace SiteNotes.Api.Models.Dtos;

public record ReferenceDto(
    string Id,
    string Url,
    string Title,
    List<string> Tags,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record CreateReferenceRequest(
    string Url,
    string Title,
    List<string>? Tags);

public record UpdateReferenceRequest(
    string Url,
    string Title,
    List<string>? Tags);
