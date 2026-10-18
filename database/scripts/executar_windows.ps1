# Executar em um terminal local interativo. A senha é lida pelo próprio psql.
$ErrorActionPreference = 'Stop'
$psql = 'C:\Program Files\PostgreSQL\18\bin\psql.exe'
if (-not (Test-Path -LiteralPath $psql)) { throw 'psql não encontrado; ajuste somente este caminho.' }
& $psql -X -h 127.0.0.1 -p 5432 -U postgres -d postgres -W -v ON_ERROR_STOP=1 -f (Join-Path $PSScriptRoot 'executar.psql')
if ($LASTEXITCODE -ne 0) { throw 'Execução interrompida. Leia o erro acima; não remova objetos existentes.' }
