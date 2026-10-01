using Microsoft.EntityFrameworkCore;
using SiteNotes.Domain.Common;
using SiteNotes.Domain.References;

namespace SiteNotes.Infrastructure.Persistence.Repositories;

public sealed class ReferenceRepository : IReferenceRepository
{
    // Sem escape explicito o Npgsql gera ESCAPE '' e % ou _ digitados viram curingas.
    private const string LikeEscape = @"\";

    private readonly SiteNotesDbContext _db;

    public ReferenceRepository(SiteNotesDbContext db)
    {
        _db = db;
    }

    public async Task<Reference?> GetByIdAsync(long id, CancellationToken cancellationToken) =>
        await _db.References.FindAsync([id], cancellationToken);

    public async Task<IReadOnlyList<Reference>> SearchAsync(
        string? search,
        string? tag,
        PageRequest page,
        CancellationToken cancellationToken) =>
        await BuildSearchQuery(search, tag).Page(page).ToListAsync(cancellationToken);

    public async Task AddAsync(Reference reference, CancellationToken cancellationToken) =>
        await _db.References.AddAsync(reference, cancellationToken);

    public void Remove(Reference reference) => _db.References.Remove(reference);

    internal IQueryable<Reference> BuildSearchQuery(string? search, string? tag)
    {
        // As tags sao um text[] mapeado a partir de um campo privado convertido, entao o filtro
        // sem diferenciar maiusculas so e expressavel em SQL.
        IQueryable<Reference> query = string.IsNullOrWhiteSpace(tag)
            ? _db.References
            : _db.References.FromSql(
                $"""
                SELECT * FROM "references"
                WHERE EXISTS (SELECT 1 FROM unnest(tags) AS t(value) WHERE lower(t.value) = lower({tag.Trim()}))
                """);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{EscapeLikePattern(search.Trim())}%";
            query = query.Where(reference =>
                EF.Functions.ILike(reference.Title, pattern, LikeEscape) ||
                EF.Functions.ILike((string)(object)reference.Url, pattern, LikeEscape));
        }

        return query
            .AsNoTracking()
            .OrderByDescending(reference => reference.UpdatedAt)
            .ThenByDescending(reference => reference.Id);
    }

    private static string EscapeLikePattern(string value) =>
        value.Replace(@"\", @"\\").Replace("%", @"\%").Replace("_", @"\_");
}
