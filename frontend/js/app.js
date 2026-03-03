// Global Utility for Toasts
window.AppUtils = {
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;

        if (type === 'success') toast.style.borderLeft = '4px solid var(--success)';
        if (type === 'error') toast.style.borderLeft = '4px solid var(--danger)';
        if (type === 'info') toast.style.borderLeft = '4px solid var(--primary)';

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s reverse forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    formatTime(timeString) {
        if (!timeString) return '--:--';
        return timeString.substring(0, 5); // From HH:MM:SS to HH:MM
    }
};

class FlugbuchApp {
    constructor() {
        this.currentDate = document.getElementById('current-date');
        this.currentGelaende = document.getElementById('current-gelaende');
        this.flightForm = document.getElementById('start-flight-form');
        this.flightModellSelect = document.getElementById('flight-modell');
        this.flightListEl = document.getElementById('flight-list');
        this.activeFlightsCountEl = document.getElementById('active-flights-count');
        this.legalConfirm = document.getElementById('legal-confirm');

        // View Management
        this.dashboardView = document.getElementById('view-dashboard');
        this.modelsView = document.getElementById('view-models');
        this.btnManageModels = document.getElementById('btn-manage-models');
        this.btnBackDashboard = document.getElementById('btn-back-dashboard');

        // Model View UI
        this.newModelForm = document.getElementById('new-model-form');
        this.modelsListEl = document.getElementById('models-list');
        this.modelsCountEl = document.getElementById('models-count');

        this.setupEventListeners();

        // Initialize Date
        const today = new Date().toISOString().split('T')[0];
        if (this.currentDate) this.currentDate.value = today;

        window.addEventListener('user-authenticated', (e) => this.initDashboard(e.detail));
    }

    setupEventListeners() {
        if (this.currentDate) {
            this.currentDate.addEventListener('change', () => this.loadFlugbuch());
        }

        if (this.currentGelaende) {
            this.currentGelaende.addEventListener('change', () => this.loadFlugbuch());
        }

        // Handle Radio changes (Modellflug vs Flugleiter)
        const typeRadios = document.querySelectorAll('input[name="flight_type"]');
        const modelGroup = document.getElementById('model-select-group');
        typeRadios.forEach(r => r.addEventListener('change', (e) => {
            document.querySelectorAll('.radio-card').forEach(c => c.classList.remove('active'));
            e.target.closest('.radio-card').classList.add('active');

            if (e.target.value === 'flugleiter') {
                modelGroup.classList.add('hidden');
                this.flightModellSelect.removeAttribute('required');
            } else {
                modelGroup.classList.remove('hidden');
                this.flightModellSelect.setAttribute('required', 'required');
            }
        }));

        if (this.flightForm) {
            this.flightForm.addEventListener('submit', (e) => this.handleStartFlight(e));
        }

        // View Nav Logic
        if (this.btnManageModels) {
            this.btnManageModels.addEventListener('click', () => {
                this.dashboardView.classList.replace('active-view', 'hidden');
                this.modelsView.classList.replace('hidden', 'active-view');
                this.renderModelsView();
            });
        }
        if (this.btnBackDashboard) {
            this.btnBackDashboard.addEventListener('click', () => {
                this.modelsView.classList.replace('active-view', 'hidden');
                this.dashboardView.classList.replace('hidden', 'active-view');
                this.loadModelle(); // Refresh dropdown
            });
        }

        if (this.newModelForm) {
            this.newModelForm.addEventListener('submit', (e) => this.handleNewModel(e));
        }
    }

    async initDashboard(user) {
        this.currentUser = user;

        try {
            // Load Dropdowns
            await Promise.all([
                this.loadGelaende(),
                this.loadModelle()
            ]);

            // Load initial List
            await this.loadFlugbuch();

        } catch (error) {
            window.AppUtils.showToast("Fehler beim Laden der Daten: " + error.message, 'error');
        }
    }

    async loadGelaende() {
        const list = await api.getGelaende();
        this.currentGelaende.innerHTML = '';
        list.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.id;
            opt.textContent = g.bezeichnung;
            if (g.ist_vereinsgelaende) opt.selected = true;
            this.currentGelaende.appendChild(opt);
        });
    }

    async loadModelle() {
        // Only load if pilot has right... handled by API for normal users
        const list = await api.getModelle();
        this.modelsList = list;

        this.flightModellSelect.innerHTML = '<option value="" disabled selected>Modell auswählen...</option>';
        list.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = `${m.bezeichnung} (${m.gewichtsklasse})`;
            this.flightModellSelect.appendChild(opt);
        });
    }

    async loadFlugbuch() {
        const gelaendeId = this.currentGelaende.value;
        const datum = this.currentDate.value;

        if (!gelaendeId) return;

        this.flightListEl.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i> Lade...</div>';

        try {
            const entries = await api.getFlugbuch(gelaendeId, datum);
            this.renderFlugbuch(entries);
        } catch (error) {
            this.flightListEl.innerHTML = `<div class="empty-state" style="color:var(--danger)">Fehler beim Laden</div>`;
            console.error(error);
        }
    }

    renderFlugbuch(entries) {
        if (entries.length === 0) {
            this.flightListEl.innerHTML = '<div class="empty-state">Noch keine Flüge am angewählten Tag.</div>';
            this.activeFlightsCountEl.textContent = '0 aktiv';
            return;
        }

        this.flightListEl.innerHTML = '';
        let activeCount = 0;

        entries.forEach(entry => {
            const isDone = entry.endzeit !== null;
            if (!isDone) activeCount++;

            const isMine = entry.user_id === this.currentUser.id;
            const modelText = entry.ist_flugleiter ? 'Flugleiterdienst' : (entry.modell?.bezeichnung || 'Unbekanntes Modell');
            const icon = entry.ist_flugleiter ? 'fa-user-shield' : 'fa-plane';

            const item = document.createElement('div');
            item.className = 'flight-item glass-panel';
            if (isMine) item.style.borderColor = 'rgba(37, 99, 235, 0.5)';

            let actionHtml = '';
            if (isMine && !isDone) {
                // Stop Button
                actionHtml = `<button class="btn btn-secondary btn-stop-flight" data-efid="${entry.id}">
                    <i class="fa-solid fa-stop"></i> Beenden
                </button>`;
            }

            item.innerHTML = `
                <div class="flight-info">
                    <div class="flight-pilot">
                        <span class="status-indicator ${isDone ? 'status-done' : 'status-active'}"></span>
                        <i class="fa-solid ${icon}"></i> 
                        Test-Pilot (Da API hier noch keinen User-Include macht)
                    </div>
                    <div class="flight-model">${modelText}</div>
                </div>
                <div style="display:flex; align-items:center; gap:1rem;">
                    <div class="flight-time">
                        <span class="time-badge">${AppUtils.formatTime(entry.startzeit)}</span>
                        ${isDone ? `<span class="time-badge">${AppUtils.formatTime(entry.endzeit)}</span>` : '<span style="color:var(--success); font-size:0.8rem">Fliegt...</span>'}
                    </div>
                    ${actionHtml}
                </div>
            `;

            this.flightListEl.appendChild(item);
        });

        this.activeFlightsCountEl.textContent = `${activeCount} aktiv`;

        // Attach event listeners to stop buttons
        document.querySelectorAll('.btn-stop-flight').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleStopFlight(e.currentTarget.dataset.efid));
        });
    }

    async handleStartFlight(e) {
        e.preventDefault();

        const typeRadios = document.querySelector('input[name="flight_type"]:checked').value;
        const isFlugleiter = typeRadios === 'flugleiter';

        const payload = {
            datum: this.currentDate.value,
            startzeit: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            gelaende_id: this.currentGelaende.value,
            ist_flugleiter: isFlugleiter,
            hat_flugordnung_bestaetigt: this.legalConfirm.checked
        };

        if (!isFlugleiter) {
            payload.modell_id = this.flightModellSelect.value;
        }

        const btn = document.getElementById('btn-start-flight');
        btn.disabled = true;

        try {
            await api.startFlight(payload);
            window.AppUtils.showToast('Erfolgreich eingetragen', 'success');

            // Reset form
            this.flightModellSelect.selectedIndex = 0;
            this.legalConfirm.checked = false;

            // Reload list
            this.loadFlugbuch();

        } catch (error) {
            window.AppUtils.showToast(error.message, 'error');
        } finally {
            btn.disabled = false;
        }
    }

    async handleStopFlight(entryId) {
        const endTime = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        try {
            await api.stopFlight(entryId, endTime);
            window.AppUtils.showToast('Flug beendet', 'success');
            this.loadFlugbuch();
        } catch (error) {
            window.AppUtils.showToast('Fehler: ' + error.message, 'error');
        }
    }

    async handleNewModel(e) {
        e.preventDefault();

        const payload = {
            bezeichnung: document.getElementById('model-bezeichnung').value,
            modell_typ: document.getElementById('model-typ').value,
            antrieb: document.getElementById('model-antrieb').value,
            gewichtsklasse: document.getElementById('model-gewichtsklasse').value,
            frequenz: document.getElementById('model-frequenz').value,
            registriernummer: document.getElementById('model-registriernummer').value || null
        };

        const btn = this.newModelForm.querySelector('button[type="submit"]');
        btn.disabled = true;

        try {
            await api.createModell(payload);
            window.AppUtils.showToast('Modell erfolgreich angelegt', 'success');

            this.newModelForm.reset();

            // Reload the list in the mgmt view
            await this.loadModelle();
            this.renderModelsView();

        } catch (error) {
            window.AppUtils.showToast(error.message, 'error');
        } finally {
            btn.disabled = false;
        }
    }

    renderModelsView() {
        if (!this.modelsList) return;

        this.modelsCountEl.textContent = this.modelsList.length;

        if (this.modelsList.length === 0) {
            this.modelsListEl.innerHTML = '<div class="empty-state">Noch keine Modelle gespeichert.</div>';
            return;
        }

        this.modelsListEl.innerHTML = '';
        this.modelsList.forEach(m => {
            const item = document.createElement('div');
            item.className = 'flight-item glass-panel';
            item.innerHTML = `
                <div class="flight-info">
                    <div class="flight-pilot">
                        <i class="fa-solid fa-plane"></i> ${m.bezeichnung}
                    </div>
                    <div class="flight-model">
                        <span class="badge" style="background:rgba(37, 99, 235, 0.2); color:var(--primary); margin-right:5px;">${m.modell_typ}</span>
                        <span class="badge" style="background:rgba(37, 99, 235, 0.2); color:var(--primary); margin-right:5px;">${m.antrieb}</span>
                        <span class="badge" style="background:rgba(255, 255, 255, 0.1); color:var(--text-secondary);">${m.gewichtsklasse}</span>
                        ${m.frequenz ? `<br><small style="color:var(--text-secondary);"><i class="fa-solid fa-wifi"></i> ${m.frequenz}</small>` : ''}
                        ${m.registriernummer ? `<br><small style="color:var(--text-secondary);"><i class="fa-solid fa-passport"></i> Reg: ${m.registriernummer}</small>` : ''}
                    </div>
                </div>
                <div>
                    <button class="btn-icon btn-delete-model" data-id="${m.id}" title="Modell löschen" style="color:var(--danger)">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
            this.modelsListEl.appendChild(item);
        });

        document.querySelectorAll('.btn-delete-model').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleDeleteModel(e.currentTarget.dataset.id));
        });
    }

    async handleDeleteModel(id) {
        if (!confirm('Modell wirklich löschen?')) return;

        try {
            await api.deleteModell(id);
            window.AppUtils.showToast('Modell gelöscht', 'success');
            await this.loadModelle();
            this.renderModelsView();
        } catch (error) {
            window.AppUtils.showToast('Fehler: ' + error.message, 'error');
        }
    }
}

// Init App
document.addEventListener('DOMContentLoaded', () => {
    window.App = new FlugbuchApp();
});
