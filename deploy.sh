#!/bin/bash
# Deployment script for Flugbuch
# Targets: Local execution (orchestration) or Server execution (Docker)

TARGET_HOST="tiffy"
TARGET_DIR="/opt/flugbuch"

# Verzeichnis des Skripts
cd "$(dirname "$0")"

deploy_local() {
    echo ">>> Synchronisiere Daten nach ${TARGET_HOST}:${TARGET_DIR}..."
    # rsync ist effizienter als scp (überträgt nur Änderungen)
    rsync -avz --exclude '.git/' --exclude 'venv/' --exclude 'backend/data/' ./ "${TARGET_HOST}:${TARGET_DIR}/"
    
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
    # Prüfen, ob wir bereits auf dem Zielserver sind (einfacher Check)
    if [[ "$(hostname)" == "${TARGET_HOST}" ]]; then
        deploy_server
    else
        deploy_local
    fi
fi
