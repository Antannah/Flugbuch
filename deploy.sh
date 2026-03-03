#!/bin/bash
# Deployment script for Flugbuch
# --server: Wird auf dem Server ausgeführt (Docker build + start)
# Ohne Flag: Überträgt Dateien via rsync und triggert --server remote.

TARGET_HOST="tiffy"
TARGET_DIR="/opt/flugbuch"

cd "$(dirname "$0")"

deploy_local() {
    echo ">>> Synchronisiere Daten nach ${TARGET_HOST}:${TARGET_DIR}..."
    # rsync: nur benötigte Dateien übertragen
    rsync -avz \
        --exclude '.git/' \
        --exclude 'venv/' \
        --exclude '__pycache__/' \
        --exclude 'backend/data/' \
        --exclude 'backend/Dockerfile' \
        --exclude 'backend/docker-compose.yml' \
        --exclude '*.pdf' \
        --exclude '*.csv' \
        --exclude '*.tar' \
        --exclude '*.zip' \
        --exclude 'mfsd_manual.txt' \
        --exclude 'spezifikation.md' \
        --exclude 'deploy.ps1' \
        ./ "${TARGET_HOST}:${TARGET_DIR}/"

    echo ">>> Triggere Remote-Deployment..."
    ssh "${TARGET_HOST}" "bash ${TARGET_DIR}/deploy.sh --server"
}

deploy_server() {
    echo ">>> Starte Server-side Deployment in ${TARGET_DIR}..."
    cd "${TARGET_DIR}" || exit 1

    docker compose down
    echo ">>> Baue Images und starte Container..."
    docker compose up --build -d
    docker image prune -f
    echo ">>> Deployment auf Server abgeschlossen."
}

if [[ "$1" == "--server" ]]; then
    deploy_server
else
    if [[ "$(hostname)" == "${TARGET_HOST}" ]]; then
        deploy_server
    else
        deploy_local
    fi
fi
