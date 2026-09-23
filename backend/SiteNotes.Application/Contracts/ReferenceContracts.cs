using SiteNotes.Domain.References;

namespace SiteNotes.Application.Contracts;

public sealed record ReferenceDto(
    string Id,
    string Url,
    string Title,
    List<string> Tags,
    DateTime CreatedAt,
    DateTime UpdatedAt)
{
    public static ReferenceDto From(Reference reference) => new(
        reference.Id.Value,
        reference.Url.Value,
        reference.Title,
        reference.Tags.Select(tag => tag.Value).ToList(),
        reference.CreatedAt,
        reference.UpdatedAt);
}

public sealed record CreateReferenceRequest(
    string? Url,
    string? Title,
    List<string>? Tags);

public sealed record UpdateReferenceRequest(
    string? Url,
    string? Title,
    List<string>? Tags);
