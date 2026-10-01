using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SiteNotes.Api.Options;
using SiteNotes.Infrastructure.Persistence;

namespace SiteNotes.Api;

internal static class DatabaseMigrations
{
    /// <summary>
    /// Aplica as migrations pendentes quando Database:ApplyMigrationsOnStartup esta ligado, mas so em
    /// Development. Fora dele a flag e ignorada: migration em producao e um passo explicito do deploy.
    /// </summary>
    public static async Task ApplyMigrationsIfEnabledAsync(this WebApplication app)
    {
        if (!app.Services.GetRequiredService<IOptions<DatabaseOptions>>().Value.ApplyMigrationsOnStartup)
        {
            return;
        }

        if (!app.Environment.IsDevelopment())
        {
            app.Logger.LogWarning(
                "Database:ApplyMigrationsOnStartup ignorado no ambiente {Environment}; aplique as migrations no deploy.",
                app.Environment.EnvironmentName);
            return;
        }

        await using var scope = app.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<SiteNotesDbContext>();
        var pending = (await db.Database.GetPendingMigrationsAsync()).ToList();
        if (pending.Count == 0)
        {
            app.Logger.LogInformation("Banco ja esta na ultima migration.");
            return;
        }

        app.Logger.LogInformation("Aplicando {Count} migration(s): {Migrations}.", pending.Count, string.Join(", ", pending));
        await db.Database.MigrateAsync();
        app.Logger.LogInformation("Migrations aplicadas.");
    }
}
