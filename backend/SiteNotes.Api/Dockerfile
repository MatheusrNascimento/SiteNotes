# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS build
WORKDIR /src

COPY SiteNotes.Api.csproj ./
RUN --mount=type=cache,id=sitenotes-nuget,target=/root/.nuget/packages \
    dotnet restore SiteNotes.Api.csproj

COPY . ./
RUN --mount=type=cache,id=sitenotes-nuget,target=/root/.nuget/packages \
    dotnet publish SiteNotes.Api.csproj \
        -c Release \
        -o /app/publish \
        --no-restore \
        --no-self-contained \
        /p:UseAppHost=false \
        /p:DebugType=None \
        /p:DebugSymbols=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS final
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_EnableDiagnostics=0 \
    DOTNET_CLI_TELEMETRY_OPTOUT=1

USER $APP_UID

COPY --from=build --chown=$APP_UID:$APP_UID /app/publish ./

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
    CMD wget -qO- http://127.0.0.1:8080/health >/dev/null || exit 1

ENTRYPOINT ["dotnet", "SiteNotes.Api.dll"]
