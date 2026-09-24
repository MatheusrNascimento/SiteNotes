namespace SiteNotes.Application.Abstractions;

public interface IClock
{
    DateTime UtcNow { get; }
}
