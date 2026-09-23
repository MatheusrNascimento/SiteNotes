namespace SiteNotes.Domain.References;

public sealed class Tag : IEquatable<Tag>
{
    public string Value { get; }

    private Tag(string value)
    {
        Value = value;
    }

    public static IReadOnlyList<Tag> Normalize(IEnumerable<string>? tags)
    {
        var result = new List<Tag>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var raw in tags ?? [])
        {
            var trimmed = raw.Trim();
            if (trimmed.Length == 0 || !seen.Add(trimmed))
            {
                continue;
            }

            result.Add(new Tag(trimmed));
        }

        return result;
    }

    public static Tag Restore(string stored) => new(stored);

    public bool Equals(Tag? other) =>
        other is not null && string.Equals(Value, other.Value, StringComparison.OrdinalIgnoreCase);

    public override bool Equals(object? obj) => obj is Tag other && Equals(other);

    public override int GetHashCode() => StringComparer.OrdinalIgnoreCase.GetHashCode(Value);

    public override string ToString() => Value;
}
