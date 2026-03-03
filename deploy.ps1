# PowerShell Deployment Script for Flugbuch
# Überträgt nur die für den Server notwendigen Dateien via scp.

$ErrorActionPreference = "Stop"
$TargetHost = "tiffy"
$TargetDir = "/opt/flugbuch"

Write-Host ">>> Starte Remote-Deployment nach $TargetHost..." -ForegroundColor Cyan

# Sicherstellen, dass wir im richtigen Verzeichnis sind
Set-Location -Path $PSScriptRoot

# 1. Zielverzeichnisse auf dem Server vorbereiten
Write-Host ">>> Erstelle Zielverzeichnisse auf dem Server..." -ForegroundColor Yellow
ssh $TargetHost "mkdir -p ${TargetDir}/backend ${TargetDir}/frontend"

# 2. Nur benötigte Dateien übertragen
Write-Host ">>> Übertrage Deployment-Dateien..." -ForegroundColor Yellow
scp Dockerfile docker-compose.yml deploy.sh "${TargetHost}:${TargetDir}/"

Write-Host ">>> Übertrage Backend..." -ForegroundColor Yellow
scp -r backend/routers backend/models.py backend/main.py backend/database.py backend/schemas.py backend/auth.py backend/init_db.py backend/requirements.txt "${TargetHost}:${TargetDir}/backend/"

Write-Host ">>> Übertrage Frontend..." -ForegroundColor Yellow
scp -r frontend/index.html frontend/css frontend/js "${TargetHost}:${TargetDir}/frontend/"

# 3. Remote Deployment triggern
Write-Host ">>> Triggere Deployment auf dem Server..." -ForegroundColor Yellow
ssh $TargetHost "cd $TargetDir && sudo bash deploy.sh --server"

Write-Host ">>> Remote-Deployment erfolgreich abgeschlossen." -ForegroundColor Green
Write-Host ">>> Die App sollte unter https://flugbuch.antannah.blausee.eu erreichbar sein." -ForegroundColor Green
