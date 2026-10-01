using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SiteNotes.Application.Abstractions;
using SiteNotes.Domain.Notes;
using SiteNotes.Domain.References;
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

        services.AddScoped<IUnitOfWork>(provider => provider.GetRequiredService<SiteNotesDbContext>());
        services.AddScoped<IReferenceRepository, ReferenceRepository>();
        services.AddScoped<INoteRepository, NoteRepository>();
        services.AddSingleton<IClock, SystemClock>();

        return services;
    }
}
