using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SiteNotes.Application.Abstractions;
using SiteNotes.Application.PageMetadata;
using SiteNotes.Domain.Notes;
using SiteNotes.Domain.Persistence;
using SiteNotes.Domain.References;
using SiteNotes.Infrastructure.PageMetadata;
using SiteNotes.Infrastructure.Persistence;
using SiteNotes.Infrastructure.Persistence.Repositories;
using SiteNotes.Infrastructure.Time;

namespace SiteNotes.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Postgres")
            ?? throw new InvalidOperationException("ConnectionStrings:Postgres nao foi configurada.");

        services.AddDbContext<SiteNotesDbContext>(options =>
            options.UseNpgsql(connectionString)
                .UseSnakeCaseNamingConvention());

        services.AddScoped<IReferenceRepository, ReferenceRepository>();
        services.AddScoped<INoteRepository, NoteRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddSingleton<IClock, SystemClock>();

        services.AddHttpClient<IPageContentReader, HttpPageContentReader>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(8);
            client.DefaultRequestHeaders.TryAddWithoutValidation(
                "User-Agent",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 SiteNotes/1.0");
            client.DefaultRequestHeaders.TryAddWithoutValidation(
                "Accept",
                "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8");
        });

        return services;
    }
}
