using Microsoft.Extensions.DependencyInjection;
using SiteNotes.Application.Notes;
using SiteNotes.Application.PageMetadata;
using SiteNotes.Application.References;
using SiteNotes.Domain.Services;

namespace SiteNotes.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddSingleton<ReferenceNoteService>();
        services.AddScoped<IReferenceService, ReferenceService>();
        services.AddScoped<INoteService, NoteService>();
        services.AddScoped<IPageMetadataService, PageMetadataService>();
        return services;
    }
}
