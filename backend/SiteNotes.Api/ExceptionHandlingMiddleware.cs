using Microsoft.AspNetCore.Mvc;
using SiteNotes.Application.Common;
using SiteNotes.Domain.Common;

namespace SiteNotes.Api;

public sealed class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, IProblemDetailsService problemDetails)
    {
        try
        {
            await _next(context);
        }
        catch (DomainException exception)
        {
            await WriteProblemAsync(
                context,
                problemDetails,
                StatusCodes.Status400BadRequest,
                "Regra de negocio violada.",
                exception.Message);
        }
        catch (NotFoundException)
        {
            await WriteProblemAsync(
                context,
                problemDetails,
                StatusCodes.Status404NotFound,
                "Recurso nao encontrado.",
                detail: null);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Erro nao tratado.");
            await WriteProblemAsync(
                context,
                problemDetails,
                StatusCodes.Status500InternalServerError,
                "Erro interno.",
                detail: null);
        }
    }

    private static async Task WriteProblemAsync(
        HttpContext context,
        IProblemDetailsService problemDetails,
        int statusCode,
        string title,
        string? detail)
    {
        if (context.Response.HasStarted)
        {
            return;
        }

        context.Response.StatusCode = statusCode;
        await problemDetails.WriteAsync(new ProblemDetailsContext
        {
            HttpContext = context,
            ProblemDetails = new ProblemDetails
            {
                Status = statusCode,
                Title = title,
                Detail = detail,
            },
        });
    }
}
