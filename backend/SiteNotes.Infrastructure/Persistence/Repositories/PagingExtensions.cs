using SiteNotes.Domain.Common;

namespace SiteNotes.Infrastructure.Persistence.Repositories;

internal static class PagingExtensions
{
    /// <summary>Aplica OFFSET/LIMIT; a consulta precisa estar ordenada de forma estavel.</summary>
    public static IQueryable<T> Page<T>(this IQueryable<T> query, PageRequest page)
    {
        if (page.Skip > 0)
        {
            query = query.Skip(page.Skip);
        }

        return page.Take is { } take ? query.Take(take) : query;
    }
}
