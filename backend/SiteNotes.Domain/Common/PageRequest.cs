namespace SiteNotes.Domain.Common;

/// <summary>Janela de uma listagem. <see cref="Take"/> nulo devolve todos os itens a partir de <see cref="Skip"/>.</summary>
public readonly record struct PageRequest
{
    public const int MaxTake = 200;

    private PageRequest(int skip, int? take)
    {
        Skip = skip;
        Take = take;
    }

    public static PageRequest All => default;

    public int Skip { get; }
    public int? Take { get; }

    public static PageRequest Create(int? skip, int? take)
    {
        if (skip < 0)
        {
            throw new DomainException(DomainErrors.Paging.InvalidSkip);
        }

        if (take is < 1 or > MaxTake)
        {
            throw new DomainException(DomainErrors.Paging.InvalidTake);
        }

        return new PageRequest(skip ?? 0, take);
    }

    public IEnumerable<T> Apply<T>(IEnumerable<T> items)
    {
        var page = items.Skip(Skip);
        return Take is { } take ? page.Take(take) : page;
    }
}
