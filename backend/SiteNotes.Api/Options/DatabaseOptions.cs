namespace SiteNotes.Api.Options;

public sealed class DatabaseOptions
{
    public const string SectionName = "Database";

    /// <summary>So tem efeito em Development (ver <see cref="DatabaseMigrations"/>).</summary>
    public bool ApplyMigrationsOnStartup { get; init; }
}
