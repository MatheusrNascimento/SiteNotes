using System.ComponentModel.DataAnnotations;

namespace SiteNotes.Api.Options;

/// <summary>Origens do frontend liberadas no CORS (secao "Cors").</summary>
public sealed class FrontendCorsOptions
{
    public const string SectionName = "Cors";
    public const string PolicyName = "SiteNotesFrontend";

    [MinLength(1, ErrorMessage = "Cors:AllowedOrigins precisa de pelo menos uma origem.")]
    public string[] AllowedOrigins { get; init; } = [];

    internal static bool HasOnlyAbsoluteOrigins(FrontendCorsOptions options) =>
        options.AllowedOrigins.All(origin => Uri.TryCreate(origin, UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps));
}
