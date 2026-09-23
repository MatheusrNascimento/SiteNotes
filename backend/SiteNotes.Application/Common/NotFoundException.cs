namespace SiteNotes.Application.Common;

public sealed class NotFoundException : Exception
{
    public NotFoundException()
        : base("Recurso nao encontrado.")
    {
    }
}
