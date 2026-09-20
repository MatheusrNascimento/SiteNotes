using Microsoft.EntityFrameworkCore;
using SiteNotes.Api.Data;
using SiteNotes.Api.Services;

var builder = WebApplication.CreateBuilder(args);

const string CorsPolicyName = "SiteNotesFrontend";

// Add services to the container.
builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var mongoConnectionString = builder.Configuration.GetConnectionString("MongoDb")
    ?? throw new InvalidOperationException("ConnectionStrings:MongoDb nao foi configurada.");
var mongoDatabaseName = builder.Configuration["MongoDbSettings:DatabaseName"]
    ?? throw new InvalidOperationException("MongoDbSettings:DatabaseName nao foi configurada.");

builder.Services.AddDbContext<SiteNotesDbContext>(options =>
    options.UseMongoDB(mongoConnectionString, mongoDatabaseName));

builder.Services.AddHttpClient<PageMetadataService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(8);
    client.DefaultRequestHeaders.TryAddWithoutValidation(
        "User-Agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 SiteNotes/1.0");
    client.DefaultRequestHeaders.TryAddWithoutValidation(
        "Accept",
        "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8");
});

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? [];

builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicyName, policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors(CorsPolicyName);

app.UseAuthorization();

app.MapGet("/health", () => Results.Ok());

app.MapControllers();

app.Run();
