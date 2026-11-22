# Etapa 1: compila a API
FROM mcr.microsoft.com/dotnet/sdk:11.0 AS build
WORKDIR /src

# Copia só o .csproj primeiro: se o código mudar mas os pacotes não, o Docker reaproveita essa etapa.
COPY Roles.Api/Roles.Api.csproj Roles.Api/
RUN dotnet restore Roles.Api/Roles.Api.csproj

COPY Roles.Api/ Roles.Api/
RUN dotnet publish Roles.Api/Roles.Api.csproj -c Release -o /app/publish --no-restore

# Etapa 2: imagem final, menor, só com o necessário para rodar
FROM mcr.microsoft.com/dotnet/aspnet:11.0 AS final
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Roles.Api.dll"]