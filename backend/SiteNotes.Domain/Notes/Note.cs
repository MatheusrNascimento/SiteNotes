using SiteNotes.Domain.Common;
using SiteNotes.Domain.References;

namespace SiteNotes.Domain.Notes;

public sealed class Note : AggregateRoot<NoteId>
{
    public ReferenceId ReferenceId { get; private set; } = null!;
    public string Content { get; private set; } = string.Empty;
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    private Note()
    {
    }

    public static Note Create(ReferenceId referenceId, string? content, DateTime utcNow)
    {
        ArgumentNullException.ThrowIfNull(referenceId);

        return new Note
        {
            Id = NoteId.New(),
            ReferenceId = referenceId,
            Content = RequireContent(content),
            CreatedAt = utcNow,
            UpdatedAt = utcNow,
        };
    }

    public static Note Restore(
        NoteId id,
        ReferenceId referenceId,
        string content,
        DateTime createdAt,
        DateTime updatedAt)
    {
        return new Note
        {
            Id = id,
            ReferenceId = referenceId,
            Content = content,
            CreatedAt = createdAt,
            UpdatedAt = updatedAt,
        };
    }

    public void Revise(string? content, DateTime utcNow)
    {
        Content = RequireContent(content);
        UpdatedAt = utcNow;
    }

    public static IEnumerable<Note> ByMostRecent(IEnumerable<Note> notes) =>
        notes.OrderByDescending(note => note.CreatedAt);

    private static string RequireContent(string? content)
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            throw new DomainException("Conteudo da anotacao nao pode ser vazio.");
        }

        return content.Trim();
    }
}
