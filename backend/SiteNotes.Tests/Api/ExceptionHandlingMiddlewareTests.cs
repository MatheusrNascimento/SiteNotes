using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using SiteNotes.Api;
using SiteNotes.Application.Common;
using SiteNotes.Domain.Common;

namespace SiteNotes.Tests.Api;

public class ExceptionHandlingMiddlewareTests
{
    [Fact]
    public async Task DomainException_Returns400WithTheRuleAsDetail()
    {
        var (status, problem) = await InvokeAsync(_ => throw new DomainException("Url invalida."));

        Assert.Equal(StatusCodes.Status400BadRequest, status);
        Assert.Equal(400, problem.GetProperty("status").GetInt32());
        Assert.Equal("Regra de negocio violada.", problem.GetProperty("title").GetString());
        Assert.Equal("Url invalida.", problem.GetProperty("detail").GetString());
    }

    [Fact]
    public async Task NotFoundException_Returns404()
    {
        var (status, problem) = await InvokeAsync(_ => throw new NotFoundException());

        Assert.Equal(StatusCodes.Status404NotFound, status);
        Assert.Equal("Recurso nao encontrado.", problem.GetProperty("title").GetString());
    }

    [Fact]
    public async Task UnexpectedException_Returns500WithoutLeakingTheMessage()
    {
        var (status, problem) = await InvokeAsync(_ => throw new InvalidOperationException("senha=segredo"));

        Assert.Equal(StatusCodes.Status500InternalServerError, status);
        Assert.Equal("Erro interno.", problem.GetProperty("title").GetString());
        Assert.DoesNotContain("segredo", problem.GetRawText());
    }

    [Fact]
    public async Task Cancellation_ByTheClient_IsRethrown()
    {
        using var aborted = new CancellationTokenSource();
        await aborted.CancelAsync();
        var context = CreateContext();
        context.RequestAborted = aborted.Token;
        var middleware = CreateMiddleware(_ => throw new OperationCanceledException(aborted.Token));

        await Assert.ThrowsAsync<OperationCanceledException>(() => InvokeMiddlewareAsync(middleware, context));
    }

    [Fact]
    public async Task Success_PassesThrough()
    {
        var context = CreateContext();
        var middleware = CreateMiddleware(ctx =>
        {
            ctx.Response.StatusCode = StatusCodes.Status204NoContent;
            return Task.CompletedTask;
        });

        await InvokeMiddlewareAsync(middleware, context);

        Assert.Equal(StatusCodes.Status204NoContent, context.Response.StatusCode);
        Assert.Equal(0, context.Response.Body.Length);
    }

    private static async Task<(int Status, JsonElement Problem)> InvokeAsync(RequestDelegate next)
    {
        var context = CreateContext();
        await InvokeMiddlewareAsync(CreateMiddleware(next), context);

        context.Response.Body.Position = 0;
        using var document = await JsonDocument.ParseAsync(context.Response.Body);
        return (context.Response.StatusCode, document.RootElement.Clone());
    }

    private static ExceptionHandlingMiddleware CreateMiddleware(RequestDelegate next) =>
        new(next, NullLogger<ExceptionHandlingMiddleware>.Instance);

    private static Task InvokeMiddlewareAsync(ExceptionHandlingMiddleware middleware, HttpContext context) =>
        middleware.InvokeAsync(context, context.RequestServices.GetRequiredService<IProblemDetailsService>());

    private static DefaultHttpContext CreateContext()
    {
        var services = new ServiceCollection()
            .AddLogging()
            .AddProblemDetails()
            .BuildServiceProvider();

        return new DefaultHttpContext
        {
            RequestServices = services,
            Response = { Body = new MemoryStream() },
        };
    }
}
