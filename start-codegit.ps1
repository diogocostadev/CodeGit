# CodeGit 2.0 - PowerShell Startup Script
# This script configures the MSVC environment and starts CodeGit

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CodeGit 2.0 - Configuracao Ambiente" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan

# Set location
Set-Location "F:\Projetos\Serviço de Pagamento\CodeGit"

Write-Host "`n1. Configurando Visual Studio Build Tools..." -ForegroundColor Yellow

# Configure MSVC environment
$vsPath = "T:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools"
$vcVarsPath = "$vsPath\VC\Auxiliary\Build\vcvars64.bat"

if (Test-Path $vcVarsPath) {
    Write-Host "✅ Build Tools encontrados!" -ForegroundColor Green
    
    # Set environment variables for MSVC
    $env:VSINSTALLDIR = $vsPath
    $env:VCINSTALLDIR = "$vsPath\VC\"
    $env:WindowsSdkDir = "$vsPath\VC\Tools\MSVC\14.43.34808\"
    
    # Add MSVC tools to PATH (remove Git's link.exe)
    $msvcBinPath = "$vsPath\VC\Tools\MSVC\14.43.34808\bin\Hostx64\x64"
    $env:PATH = "$msvcBinPath;" + ($env:PATH -replace "T:\\Program Files\\Git\\usr\\bin;", "")
    
    Write-Host "✅ Ambiente MSVC configurado!" -ForegroundColor Green
} else {
    Write-Host "❌ Build Tools não encontrados em: $vcVarsPath" -ForegroundColor Red
    exit 1
}

Write-Host "`n2. Verificando link.exe..." -ForegroundColor Yellow
$linkPath = Get-Command link.exe -ErrorAction SilentlyContinue
if ($linkPath -and $linkPath.Source -like "*Microsoft*") {
    Write-Host "✅ Microsoft link.exe ativo: $($linkPath.Source)" -ForegroundColor Green
} else {
    Write-Host "⚠️ link.exe: $($linkPath.Source)" -ForegroundColor Yellow
}

Write-Host "`n3. Limpando build anterior..." -ForegroundColor Yellow
Set-Location "F:\Projetos\Serviço de Pagamento\CodeGit\src-tauri"
& cargo clean
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build limpo!" -ForegroundColor Green
}

Write-Host "`n4. Testando compilação Rust..." -ForegroundColor Yellow
& cargo check
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Compilação passou!" -ForegroundColor Green
    
    Write-Host "`n5. Iniciando CodeGit 2.0..." -ForegroundColor Yellow
    Set-Location "F:\Projetos\Serviço de Pagamento\CodeGit"
    & npm run tauri:dev
} else {
    Write-Host "❌ Compilação falhou" -ForegroundColor Red
    Write-Host "`nTentando com configuração alternativa..." -ForegroundColor Yellow
    
    # Alternative: Use Rust GNU toolchain
    Write-Host "Instalando toolchain GNU como fallback..." -ForegroundColor Yellow
    & rustup toolchain install stable-x86_64-pc-windows-gnu
    & rustup default stable-x86_64-pc-windows-gnu
    
    Write-Host "Testando com GNU toolchain..." -ForegroundColor Yellow
    & cargo clean
    & cargo check
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ GNU toolchain funcionou!" -ForegroundColor Green
        Set-Location "F:\Projetos\Serviço de Pagamento\CodeGit"
        & npm run tauri:dev
    } else {
        Write-Host "❌ Ambos os toolchains falharam" -ForegroundColor Red
        Write-Host "Manual setup necessário - consulte FINAL_SETUP_INSTRUCTIONS.md" -ForegroundColor Yellow
    }
}

Read-Host "`nPressione Enter para sair..."