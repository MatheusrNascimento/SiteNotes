using SiteNotes.Application.Abstractions;

namespace SiteNotes.Infrastructure.Time;

public sealed class SystemClock : IClock
{
    public DateTime UtcNow => DateTime.UtcNow;
}
