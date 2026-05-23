param(
  [switch]$Yes,
  [switch]$Install,
  [switch]$StartDockerDb,
  [switch]$FreshDockerDb,
  [switch]$RebuildDocker,
  [switch]$StartApps,
  [switch]$SkipDbReset,
  [switch]$Help
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Read-DotEnv {
  param([string]$Path)

  $values = @{}

  if (-not (Test-Path $Path)) {
    return $values
  }

  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
      return
    }

    $parts = $line.Split("=", 2)
    $values[$parts[0].Trim()] = $parts[1].Trim()
  }

  return $values
}

function Require-Command {
  param([string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Comando '$Name' nao encontrado no PATH."
  }
}

function Write-Utf8NoBom {
  param(
    [string]$Path,
    [string[]]$Lines
  )

  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllLines($Path, $Lines, $encoding)
}

if ($Help) {
  Write-Host "Uso:"
  Write-Host "  powershell -ExecutionPolicy Bypass -File .\reset-test-app.ps1 -Yes"
  Write-Host ""
  Write-Host "Opcoes:"
  Write-Host "  -Install        Roda npm install em backend e frontend antes do reset."
  Write-Host "  -StartDockerDb  Sobe apenas o servico mysql do docker-compose."
  Write-Host "  -FreshDockerDb  Para containers e apaga .docker/data para recriar o MariaDB."
  Write-Host "  -RebuildDocker   Rebuilda imagens backend/frontend e sobe tudo via Docker."
  Write-Host "  -StartApps      Abre backend e frontend em novas janelas depois do reset."
  Write-Host "  -SkipDbReset    Nao mexe no banco; apenas gera envs e roda builds."
  Write-Host "  -Yes            Confirma automaticamente operacoes destrutivas."
  exit 0
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"
$rootEnvPath = Join-Path $root ".env"
$backendEnvPath = Join-Path $backend ".env"
$frontendEnvPath = Join-Path $frontend ".env"

Set-Location $root

Require-Command "npm.cmd"

$envValues = Read-DotEnv $rootEnvPath

$dbHost = if ($envValues.DB_HOST) { $envValues.DB_HOST } else { "127.0.0.1" }
$dbUser = if ($envValues.DB_USER) { $envValues.DB_USER } else { "root" }
$dbPass = if ($envValues.DB_PASS) { $envValues.DB_PASS } else { $envValues.MYSQL_ROOT_PASSWORD }
$dbName = if ($envValues.DB_NAME) { $envValues.DB_NAME } else { $envValues.MYSQL_DATABASE }
$dbPort = if ($envValues.DB_PORT) { $envValues.DB_PORT } else { $envValues.MYSQL_PORT }
$backendPort = if ($envValues.PORT) { $envValues.PORT } elseif ($envValues.BACKEND_PORT) { $envValues.BACKEND_PORT } else { "8085" }
$frontendPort = if ($envValues.FRONTEND_PORT) { $envValues.FRONTEND_PORT } else { "3005" }
$frontendUrl = if ($envValues.FRONTEND_URL) { $envValues.FRONTEND_URL } else { "http://localhost:$frontendPort" }
$backendUrl = if ($envValues.BACKEND_URL -and $envValues.BACKEND_URL -match ":\d+") { $envValues.BACKEND_URL } else { "http://localhost:$backendPort" }
$jwtSecret = if ($envValues.JWT_SECRET) { $envValues.JWT_SECRET } else { "dev_jwt_secret" }
$jwtRefreshSecret = if ($envValues.JWT_REFRESH_SECRET) { $envValues.JWT_REFRESH_SECRET } else { "dev_refresh_secret" }

if (-not $dbPass) { $dbPass = "strongpassword" }
if (-not $dbName) { $dbName = "whaticket" }
if (-not $dbPort) { $dbPort = "3307" }

Write-Step "Configurando backend/.env e frontend/.env para teste local"

$backendEnv = @(
  "NODE_ENV=development",
  "PORT=$backendPort",
  "DB_DIALECT=mysql",
  "DB_HOST=$dbHost",
  "DB_PORT=$dbPort",
  "DB_USER=$dbUser",
  "DB_PASS=$dbPass",
  "DB_NAME=$dbName",
  "JWT_SECRET=$jwtSecret",
  "JWT_REFRESH_SECRET=$jwtRefreshSecret",
  "BACKEND_URL=$backendUrl",
  "FRONTEND_URL=$frontendUrl",
  "CHROME_ARGS=--no-sandbox --disable-setuid-sandbox"
)

Write-Utf8NoBom -Path $backendEnvPath -Lines $backendEnv
Write-Utf8NoBom -Path $frontendEnvPath -Lines @("VITE_BACKEND_URL=$backendUrl")

if ($FreshDockerDb) {
  Write-Host ""
  Write-Host "ATENCAO: -FreshDockerDb apaga todos os dados em .docker/data." -ForegroundColor Yellow

  if (-not $Yes) {
    $answer = Read-Host "Digite APAGAR para recriar o banco Docker"
    if ($answer -ne "APAGAR") {
      Write-Host "Cancelado."
      exit 1
    }
  }

  Write-Step "Parando containers e limpando dados do MariaDB"
  docker compose down

  $dockerData = Join-Path $root ".docker\data"
  $resolvedRoot = [System.IO.Path]::GetFullPath($root)
  $resolvedData = [System.IO.Path]::GetFullPath($dockerData)

  if (-not $resolvedData.StartsWith($resolvedRoot)) {
    throw "Caminho de dados Docker inseguro: $resolvedData"
  }

  if (Test-Path $resolvedData) {
    Remove-Item -LiteralPath $resolvedData -Recurse -Force
  }
}

if ($StartDockerDb -or $FreshDockerDb -or $RebuildDocker) {
  Write-Step "Subindo mysql no Docker"
  docker compose up -d mysql

  Write-Step "Aguardando MariaDB responder"
  $ready = $false
  for ($i = 1; $i -le 40; $i++) {
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    docker compose exec -T mysql mariadb -uroot "-p$dbPass" -e "SELECT 1" *> $null
    $mysqlExitCode = $LASTEXITCODE
    $ErrorActionPreference = $previousErrorActionPreference
    if ($mysqlExitCode -eq 0) {
      $ready = $true
      break
    }
    Start-Sleep -Seconds 2
  }

  if (-not $ready) {
    throw "MariaDB nao respondeu a tempo."
  }
}

if ($Install) {
  Write-Step "Instalando dependencias do backend"
  Set-Location $backend
  npm.cmd install

  Write-Step "Instalando dependencias do frontend"
  Set-Location $frontend
  npm.cmd install
}

if (-not (Test-Path (Join-Path $backend "node_modules"))) {
  throw "backend/node_modules nao existe. Rode com -Install ou execute npm install em backend."
}

if (-not (Test-Path (Join-Path $frontend "node_modules"))) {
  throw "frontend/node_modules nao existe. Rode com -Install ou execute npm install em frontend."
}

if (-not $SkipDbReset) {
  Write-Host ""
  Write-Host "ATENCAO: este reset vai desfazer migrations, recriar tabelas e rodar seeds no banco '$dbName' em '${dbHost}:${dbPort}'." -ForegroundColor Yellow

  if (-not $Yes) {
    $answer = Read-Host "Digite RESET para continuar"
    if ($answer -ne "RESET") {
      Write-Host "Cancelado."
      exit 1
    }
  }

  Write-Step "Resetando banco com Sequelize"
  Set-Location $backend
  npm.cmd run build
  npx.cmd sequelize db:migrate:undo:all
  npx.cmd sequelize db:migrate
  npx.cmd sequelize db:seed:all
} else {
  Write-Step "Pulando reset do banco"
  Set-Location $backend
  npm.cmd run build
}

Write-Step "Build do frontend"
Set-Location $frontend
npm.cmd run build

if ($StartApps) {
  Write-Step "Abrindo backend e frontend em novas janelas"
  Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "cd `"$backend`"; npm.cmd run dev" -WindowStyle Normal
  Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "cd `"$frontend`"; npm.cmd run dev -- --host 0.0.0.0 --port $frontendPort" -WindowStyle Normal
}

if ($RebuildDocker) {
  Write-Step "Rebuildando e subindo backend/frontend Docker"
  docker compose up -d --build backend frontend
}

Set-Location $root

Write-Host ""
Write-Host "Reset finalizado." -ForegroundColor Green
Write-Host "Backend:  $backendUrl"
Write-Host "Frontend: http://localhost:$frontendPort"
Write-Host ""
Write-Host "Login seed padrao do Whaticket Community costuma ser:"
Write-Host "  Email: admin@whaticket.com"
Write-Host "  Senha: admin"
