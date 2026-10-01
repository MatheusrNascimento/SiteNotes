using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.Extensions.Options;
using SiteNotes.Api;
using SiteNotes.Api.Options;
using SiteNotes.Application;
using SiteNotes.Infrastructure;
using SiteNotes.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOptions<DatabaseOptions>()
    .BindConfiguration(DatabaseOptions.SectionName)
    .ValidateOnStart();

builder.Services.AddOptions<FrontendCorsOptions>()
    .BindConfiguration(FrontendCorsOptions.SectionName)
    .ValidateDataAnnotations()
    .Validate(FrontendCorsOptions.HasOnlyAbsoluteOrigins, "Cors:AllowedOrigins aceita so URLs http(s) absolutas.")
    .ValidateOnStart();

builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddHealthChecks()
    .AddDbContextCheck<SiteNotesDbContext>();

builder.Services.AddCors();
builder.Services.AddOptions<CorsOptions>()
    .Configure<IOptions<FrontendCorsOptions>>((cors, frontend) =>
        cors.AddPolicy(FrontendCorsOptions.PolicyName, policy => policy
            .WithOrigins(frontend.Value.AllowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()));

var app = builder.Build();

await app.ApplyMigrationsIfEnabledAsync();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseCors(FrontendCorsOptions.PolicyName);
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");

app.Run();
