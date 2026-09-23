using System.Net;
using System.Net.Sockets;
using SiteNotes.Domain.Common;

namespace SiteNotes.Domain.PageMetadata;

public sealed class PageAddress
{
    public Uri Uri { get; }
    public bool IsBlocked { get; }

    public string Value => Uri.ToString();

    public string HostTitle => Uri.Host.Replace("www.", "", StringComparison.OrdinalIgnoreCase);

    private PageAddress(Uri uri)
    {
        Uri = uri;
        IsBlocked = IsBlockedHost(uri);
    }

    public static PageAddress Create(string raw)
    {
        if (!Uri.TryCreate(raw.Trim(), UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            throw new DomainException("Url invalida. Use http ou https.");
        }

        return new PageAddress(uri);
    }

    private static bool IsBlockedHost(Uri uri)
    {
        var host = uri.Host;
        if (host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
            host.Equals("::1") ||
            host.EndsWith(".local", StringComparison.OrdinalIgnoreCase) ||
            host.EndsWith(".internal", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (!IPAddress.TryParse(host, out var ip))
        {
            return false;
        }

        return IPAddress.IsLoopback(ip) || IsPrivateIp(ip);
    }

    private static bool IsPrivateIp(IPAddress ip)
    {
        if (ip.IsIPv4MappedToIPv6)
        {
            ip = ip.MapToIPv4();
        }

        var bytes = ip.GetAddressBytes();
        if (ip.AddressFamily == AddressFamily.InterNetwork && bytes.Length == 4)
        {
            return bytes[0] == 10
                || (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31)
                || (bytes[0] == 192 && bytes[1] == 168)
                || (bytes[0] == 169 && bytes[1] == 254);
        }

        if (ip.AddressFamily != AddressFamily.InterNetworkV6)
        {
            return false;
        }

        if (ip.IsIPv6LinkLocal || ip.IsIPv6SiteLocal)
        {
            return true;
        }

        return bytes.Length > 0 && (bytes[0] & 0xfe) == 0xfc;
    }
}
