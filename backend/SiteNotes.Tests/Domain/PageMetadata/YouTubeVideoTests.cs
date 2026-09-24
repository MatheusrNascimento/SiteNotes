using SiteNotes.Domain.PageMetadata;

namespace SiteNotes.Tests.Domain.PageMetadata;

public class YouTubeVideoTests
{
    [Theory]
    [InlineData("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ")]
    [InlineData("https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ")]
    [InlineData("https://www.youtube.com/shorts/abc123", "abc123")]
    [InlineData("https://www.youtube.com/embed/abc123", "abc123")]
    [InlineData("https://www.youtube.com/live/abc123", "abc123")]
    [InlineData("https://music.youtube.com/watch?v=abc123", "abc123")]
    public void TryGetId_ReadsSupportedYouTubeUrls(string url, string expected)
    {
        var found = YouTubeVideo.TryGetId(new Uri(url), out var videoId);

        Assert.True(found);
        Assert.Equal(expected, videoId);
    }

    [Fact]
    public void TryGetId_RejectsPagesThatAreNotVideos()
    {
        var found = YouTubeVideo.TryGetId(new Uri("https://example.com/watch?v=abc"), out _);

        Assert.False(found);
    }
}
