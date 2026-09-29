namespace SiteNotes.Domain.Common;

public abstract class BaseEntity
{
    public long Id { get; protected set; }
    public DateTime CreatedAt { get; protected set; }
    public DateTime UpdatedAt { get; protected set; }

    protected void InitializeTimestamps(DateTime utcNow)
    {
        CreatedAt = utcNow;
        UpdatedAt = utcNow;
    }

    protected void Touch(DateTime utcNow)
    {
        UpdatedAt = utcNow;
    }
}
