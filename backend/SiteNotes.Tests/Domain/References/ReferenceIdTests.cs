using SiteNotes.Domain.Common;
using SiteNotes.Domain.References;

namespace SiteNotes.Tests.Domain.References;

public class ReferenceIdTests
{
    [Fact]
    public void New_ProducesAParseableId()
    {
        var id = ReferenceId.New();

        var parsed = ReferenceId.Parse(id.Value.ToUpperInvariant());

        Assert.Equal(id, parsed);
        Assert.NotEqual(id, ReferenceId.New());
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("123")]
    [InlineData("zzzzzzzzzzzzzzzzzzzzzzzz")]
    public void Parse_RejectsInvalidValues(string? value)
    {
        var exception = Assert.Throws<DomainException>(() => ReferenceId.Parse(value));

        Assert.Equal("Id invalido.", exception.Message);
    }
}
