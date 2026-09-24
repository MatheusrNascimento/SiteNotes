using SiteNotes.Domain.Common;
using SiteNotes.Domain.PageMetadata;

namespace SiteNotes.Tests.Domain.PageMetadata;

public class PageAddressTests
{
    [Theory]
    [InlineData("http://example.com/artigo")]
    [InlineData("https://www.example.com")]
    public void Create_AcceptsHttpUrls(string url)
    {
        var address = PageAddress.Create(url);

        Assert.False(address.IsBlocked);
        Assert.Equal("example.com", address.HostTitle);
    }

    [Theory]
    [InlineData("ftp://example.com")]
    [InlineData("/relativo")]
    [InlineData("nota-solta")]
    public void Create_RejectsUrlsThatCannotBeFetched(string url)
    {
        var exception = Assert.Throws<DomainException>(() => PageAddress.Create(url));

        Assert.Equal("Url invalida. Use http ou https.", exception.Message);
    }

    [Theory]
    [InlineData("http://localhost/notas")]
    [InlineData("http://127.0.0.1/notas")]
    [InlineData("http://10.1.1.1/notas")]
    [InlineData("http://192.168.0.8/notas")]
    [InlineData("http://172.16.0.4/notas")]
    [InlineData("http://169.254.1.1/notas")]
    [InlineData("http://files.local/notas")]
    [InlineData("http://api.internal/notas")]
    [InlineData("http://[::1]/notas")]
    public void Create_BlocksPrivateHosts(string url)
    {
        var address = PageAddress.Create(url);

        Assert.True(address.IsBlocked);
    }
}
