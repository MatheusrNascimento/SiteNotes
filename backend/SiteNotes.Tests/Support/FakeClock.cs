using SiteNotes.Application.Abstractions;

namespace SiteNotes.Tests.Support;

internal sealed class FakeClock : IClock
{
    public DateTime UtcNow { get; set; } = new(2026, 3, 1, 12, 0, 0, DateTimeKind.Utc);
}
