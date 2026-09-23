namespace SiteNotes.Domain.PageMetadata;

public static class YouTubeVideo
{
    public static bool TryGetId(Uri uri, out string videoId)
    {
        videoId = string.Empty;
        var host = uri.Host.Replace("www.", "", StringComparison.OrdinalIgnoreCase);

        if (host.Equals("youtu.be", StringComparison.OrdinalIgnoreCase))
        {
            var id = uri.AbsolutePath.Trim('/');
            if (!string.IsNullOrWhiteSpace(id))
            {
                videoId = id.Split('/')[0];
                return true;
            }

            return false;
        }

        if (!host.Equals("youtube.com", StringComparison.OrdinalIgnoreCase) &&
            !host.Equals("m.youtube.com", StringComparison.OrdinalIgnoreCase) &&
            !host.Equals("music.youtube.com", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var queryId = uri.Query.TrimStart('?')
            .Split('&', StringSplitOptions.RemoveEmptyEntries)
            .Select(part => part.Split('=', 2))
            .FirstOrDefault(part => part.Length == 2 && part[0].Equals("v", StringComparison.OrdinalIgnoreCase));

        if (queryId is not null)
        {
            videoId = Uri.UnescapeDataString(queryId[1]);
            return !string.IsNullOrWhiteSpace(videoId);
        }

        var segments = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length >= 2 &&
            (segments[0].Equals("shorts", StringComparison.OrdinalIgnoreCase) ||
             segments[0].Equals("embed", StringComparison.OrdinalIgnoreCase) ||
             segments[0].Equals("live", StringComparison.OrdinalIgnoreCase)))
        {
            videoId = segments[1];
            return !string.IsNullOrWhiteSpace(videoId);
        }

        return false;
    }
}
