using SiteNotes.Domain.Common;

namespace SiteNotes.Domain.References;

public sealed class ReferenceId : IEquatable<ReferenceId>
{
    public string Value { get; }

    private ReferenceId(string value)
    {
        Value = value;
    }

    public static ReferenceId New() => new(EntityIdFactory.Create());

    public static ReferenceId Parse(string? value)
    {
        if (!EntityIdFactory.IsValid(value))
        {
            throw new DomainException("Id invalido.");
        }

        return new ReferenceId(value!.ToLowerInvariant());
    }

    public bool Equals(ReferenceId? other) =>
        other is not null && string.Equals(Value, other.Value, StringComparison.OrdinalIgnoreCase);

    public override bool Equals(object? obj) => obj is ReferenceId other && Equals(other);

    public override int GetHashCode() => StringComparer.OrdinalIgnoreCase.GetHashCode(Value);

    public override string ToString() => Value;
}
