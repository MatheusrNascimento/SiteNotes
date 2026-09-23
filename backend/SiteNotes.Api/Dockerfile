# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY SiteNotes.Domain/SiteNotes.Domain.csproj SiteNotes.Domain/
COPY SiteNotes.Application/SiteNotes.Application.csproj SiteNotes.Application/
COPY SiteNotes.Infrastructure/SiteNotes.Infrastructure.csproj SiteNotes.Infrastructure/
COPY SiteNotes.Api/SiteNotes.Api.csproj SiteNotes.Api/
RUN dotnet restore SiteNotes.Api/SiteNotes.Api.csproj

COPY . ./
RUN dotnet publish SiteNotes.Api/SiteNotes.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_EnableDiagnostics=0

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

USER $APP_UID

COPY --from=build --chown=$APP_UID:$APP_UID /app/publish ./

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
    CMD curl -fsS http://127.0.0.1:8080/api/references || exit 1

ENTRYPOINT ["dotnet", "SiteNotes.Api.dll"]
