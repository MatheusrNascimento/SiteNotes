using SiteNotes.Domain.Common;

namespace SiteNotes.Domain.References;

public sealed class Reference : BaseEntity
{
    private readonly List<Tag> _tags = [];

    public PageUrl Url { get; private set; } = null!;
    public string Title { get; private set; } = string.Empty;
    public IReadOnlyCollection<Tag> Tags => _tags;

    private Reference()
    {
    }

    public static Reference Create(string? url, string? title, IEnumerable<string>? tags, DateTime utcNow)
    {
        var pageUrl = PageUrl.Create(url);
        var reference = new Reference
        {
            Url = pageUrl,
            Title = ResolveTitle(title, pageUrl),
        };
        reference.InitializeTimestamps(utcNow);
        reference.ReplaceTags(tags);
        return reference;
    }

    public void ChangeDetails(string? url, string? title, IEnumerable<string>? tags, DateTime utcNow)
    {
        if (!string.IsNullOrWhiteSpace(url))
        {
            Url = PageUrl.Create(url);
        }

        if (!string.IsNullOrWhiteSpace(title))
        {
            Title = title.Trim();
        }

        if (tags is not null)
        {
            ReplaceTags(tags);
        }

        Touch(utcNow);
    }

    public void RegisterActivity(DateTime utcNow)
    {
        Touch(utcNow);
    }

    public bool Matches(string? search, string? tag)
    {
        if (!string.IsNullOrWhiteSpace(search) &&
            !Title.Contains(search, StringComparison.OrdinalIgnoreCase) &&
            !Url.Value.Contains(search, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (!string.IsNullOrWhiteSpace(tag) &&
            !_tags.Any(item => item.Value.Equals(tag, StringComparison.OrdinalIgnoreCase)))
        {
            return false;
        }

        return true;
    }

    private void ReplaceTags(IEnumerable<string>? tags)
    {
        _tags.Clear();
        _tags.AddRange(Tag.Normalize(tags));
    }

    private static string ResolveTitle(string? title, PageUrl url) =>
        string.IsNullOrWhiteSpace(title) ? url.Value : title.Trim();
}
