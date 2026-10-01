using SiteNotes.Domain.Common;

namespace SiteNotes.Domain.Notes;

public sealed class Note : BaseEntity
{
    public long ReferenceId { get; private set; }
    public string Content { get; private set; } = string.Empty;

    private Note()
    {
    }

    public static Note Create(long referenceId, string? content, DateTime utcNow)
    {
        if (referenceId <= 0)
        {
            throw new DomainException("Referencia invalida para a anotacao.");
        }

        var note = new Note
        {
            ReferenceId = referenceId,
            Content = RequireContent(content),
        };
        note.InitializeTimestamps(utcNow);
        return note;
    }

    public void Revise(string? content, DateTime utcNow)
    {
        Content = RequireContent(content);
        Touch(utcNow);
    }

    public static IEnumerable<Note> ByMostRecent(IEnumerable<Note> notes) =>
        notes.OrderByDescending(note => note.CreatedAt).ThenByDescending(note => note.Id);

    private static string RequireContent(string? content)
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            throw new DomainException("Conteudo da anotacao nao pode ser vazio.");
        }

        return content.Trim();
    }
}
