# PowerShell Deployment Script for Flugbuch
# Targets: Local-to-Remote Deployment (Windows -> tiffy)

$ErrorActionPreference = "Stop"
$TargetHost = "tiffy"
$TargetDir = "/opt/flugbuch"

Write-Host ">>> Starte Remote-Deployment nach $TargetHost..." -ForegroundColor Cyan

# Sicherstellen, dass wir im richtigen Verzeichnis sind
Set-Location -Path $PSScriptRoot

# 1. Daten zum Server hochladen
Write-Host ">>> Packe Daten (exklusive venv/.git)..." -ForegroundColor Yellow
tar --exclude="venv" --exclude=".git" --exclude="backend/data" -cf deploy_bundle.tar .

Write-Host ">>> Übertrage Bundle nach $TargetHost..." -ForegroundColor Yellow
scp deploy_bundle.tar "${TargetHost}:${TargetDir}/"

Write-Host ">>> Entpacke Bundle auf dem Server..." -ForegroundColor Yellow
ssh $TargetHost "tar -xf ${TargetDir}/deploy_bundle.tar -C $TargetDir && rm ${TargetDir}/deploy_bundle.tar"

# 2. Remote Deployment triggern
Write-Host ">>> Triggere Deployment auf dem Server..." -ForegroundColor Yellow
# Wir nutzen sudo für Docker-Befehle, falls nötig
ssh $TargetHost "cd $TargetDir && sudo bash deploy.sh --server"

Write-Host ">>> Remote-Deployment erfolgreich abgeschlossen." -ForegroundColor Green
Write-Host ">>> Die App sollte unter http://$TargetHost:9277 (oder via Proxy) erreichbar sein." -ForegroundColor Green
