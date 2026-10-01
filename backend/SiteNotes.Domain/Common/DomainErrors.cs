namespace SiteNotes.Domain.Common;

/// <summary>Mensagens das regras de dominio; viram o <c>detail</c> do ProblemDetails 400.</summary>
public static class DomainErrors
{
    public static class References
    {
        public const string UrlRequired = "Url e obrigatoria.";
    }

    public static class Notes
    {
        public const string InvalidReference = "Referencia invalida para a anotacao.";
        public const string EmptyContent = "Conteudo da anotacao nao pode ser vazio.";
    }

    public static class Paging
    {
        public const string InvalidSkip = "skip nao pode ser negativo.";
        public const string InvalidTake = "take deve estar entre 1 e 200.";
    }
}
