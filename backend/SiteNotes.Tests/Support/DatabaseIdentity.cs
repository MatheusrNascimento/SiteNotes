using System.Reflection;
using SiteNotes.Domain.Common;

namespace SiteNotes.Tests.Support;

/// <summary>
/// Simula o Id incremental que o banco atribui ao persistir a entidade.
/// </summary>
internal static class DatabaseIdentity
{
    private static readonly PropertyInfo IdProperty =
        typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!;

    public static T Persisted<T>(this T entity, long id)
        where T : BaseEntity
    {
        IdProperty.SetValue(entity, id);
        return entity;
    }
}

internal sealed class IdentitySequence
{
    private long _last;

    public T Assign<T>(T entity)
        where T : BaseEntity
    {
        if (entity.Id == 0)
        {
            entity.Persisted(++_last);
        }

        return entity;
    }
}
