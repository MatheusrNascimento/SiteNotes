using SiteNotes.Domain.Common;

namespace SiteNotes.Domain.Notes;

public sealed class NoteId : IEquatable<NoteId>
{
    public string Value { get; }

    private NoteId(string value)
    {
        Value = value;
    }

    public static NoteId New() => new(EntityIdFactory.Create());

    public static NoteId Parse(string? value)
    {
        if (!EntityIdFactory.IsValid(value))
        {
            throw new DomainException("Id invalido.");
        }

        return new NoteId(value!.ToLowerInvariant());
    }

    public bool Equals(NoteId? other) =>
        other is not null && string.Equals(Value, other.Value, StringComparison.OrdinalIgnoreCase);

    public override bool Equals(object? obj) => obj is NoteId other && Equals(other);

    public override int GetHashCode() => StringComparer.OrdinalIgnoreCase.GetHashCode(Value);

    public override string ToString() => Value;
}
