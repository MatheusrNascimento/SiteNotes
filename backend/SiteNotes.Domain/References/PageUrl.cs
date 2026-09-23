using SiteNotes.Domain.Common;

namespace SiteNotes.Domain.References;

public sealed class PageUrl : IEquatable<PageUrl>
{
    public string Value { get; }

    private PageUrl(string value)
    {
        Value = value;
    }

    public static PageUrl Create(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            throw new DomainException("Url e obrigatoria.");
        }

        return new PageUrl(raw.Trim());
    }

    public static PageUrl Restore(string stored) => new(stored);

    public bool Equals(PageUrl? other) =>
        other is not null && string.Equals(Value, other.Value, StringComparison.Ordinal);

    public override bool Equals(object? obj) => obj is PageUrl other && Equals(other);

    public override int GetHashCode() => Value.GetHashCode(StringComparison.Ordinal);

    public override string ToString() => Value;
}
