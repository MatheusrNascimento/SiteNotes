using System.Security.Cryptography;

namespace SiteNotes.Domain.Common;

internal static class EntityIdFactory
{
    public static bool IsValid(string? value) =>
        value is not null && value.Length == 24 && value.All(Uri.IsHexDigit);

    public static string Create()
    {
        Span<byte> bytes = stackalloc byte[12];
        var timestamp = (int)DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        bytes[0] = (byte)(timestamp >> 24);
        bytes[1] = (byte)(timestamp >> 16);
        bytes[2] = (byte)(timestamp >> 8);
        bytes[3] = (byte)timestamp;
        RandomNumberGenerator.Fill(bytes[4..]);
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
