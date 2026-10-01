using SiteNotes.Domain.Common;

namespace SiteNotes.Tests.Domain.Common;

public class PageRequestTests
{
    [Fact]
    public void Create_WithoutParameters_ReturnsEverything()
    {
        var page = PageRequest.Create(null, null);

        Assert.Equal(PageRequest.All, page);
        Assert.Equal([1, 2, 3], page.Apply([1, 2, 3]));
    }

    [Fact]
    public void Apply_SkipsAndTakes()
    {
        Assert.Equal([2, 3], PageRequest.Create(1, 2).Apply([1, 2, 3, 4]));
        Assert.Equal([3, 4], PageRequest.Create(2, null).Apply([1, 2, 3, 4]));
    }

    [Theory]
    [InlineData(-1, null, DomainErrors.Paging.InvalidSkip)]
    [InlineData(null, 0, DomainErrors.Paging.InvalidTake)]
    [InlineData(null, PageRequest.MaxTake + 1, DomainErrors.Paging.InvalidTake)]
    public void Create_RejectsInvalidValues(int? skip, int? take, string message)
    {
        var exception = Assert.Throws<DomainException>(() => PageRequest.Create(skip, take));

        Assert.Equal(message, exception.Message);
    }

    [Fact]
    public void Create_AcceptsTheMaximumTake()
    {
        Assert.Equal(PageRequest.MaxTake, PageRequest.Create(0, PageRequest.MaxTake).Take);
    }
}
