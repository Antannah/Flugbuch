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

        // View Management
        this.dashboardView = document.getElementById('view-dashboard');
        this.modelsView = document.getElementById('view-models');
        this.btnManageModels = document.getElementById('btn-manage-models');
        this.btnBackDashboard = document.getElementById('btn-back-dashboard');
        this.editingModelId = null; // Track if we're editing a model

        // Model View UI
        this.newModelForm = document.getElementById('new-model-form');
        this.modelsListEl = document.getElementById('models-list');
        this.modelsCountEl = document.getElementById('models-count');

        // User Admin UI
        this.usersView = document.getElementById('view-users');
        this.btnAdminUsers = document.getElementById('btn-admin-users');
        this.btnBackUsers = document.getElementById('btn-back-dashboard-from-users');
        this.usersListEl = document.getElementById('users-list');
        this.usersCountEl = document.getElementById('users-count');
        this.btnExportCsv = document.getElementById('btn-export-csv');
        this.btnExportPdf = document.getElementById('btn-export-pdf');
        this.btnExportCsvBottom = document.querySelectorAll('#btn-export-csv')[0];
        this.btnExportPdfBottom = document.querySelectorAll('#btn-export-pdf')[0];
        this.newUserForm = document.getElementById('new-user-form');

        // Settings UI
        this.settingsView = document.getElementById('view-settings');
        this.btnAdminSettings = document.getElementById('btn-admin-settings');
        this.btnBackSettings = document.getElementById('btn-back-dashboard-from-settings');
        this.settingsForm = document.getElementById('settings-form');
        this.settingsNameInput = document.getElementById('settings-flugplatz-name');
        this.settingsAddrInput = document.getElementById('settings-adresse');

        // Profile dropdown
        this.profileTrigger = document.getElementById('btn-profile-trigger');
        this.profileMenu = document.getElementById('profile-menu');

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

        if (this.btnAdminUsers) {
            this.btnAdminUsers.addEventListener('click', () => {
                this.dashboardView.classList.replace('active-view', 'hidden');
                this.usersView.classList.replace('hidden', 'active-view');
                this.renderUsersView();
            });
        }

        if (this.btnBackUsers) {
            this.btnBackUsers.addEventListener('click', () => {
                this.usersView.classList.replace('active-view', 'hidden');
                this.dashboardView.classList.replace('hidden', 'active-view');
            });
        }

        if (this.btnExportCsv) {
            this.btnExportCsv.addEventListener('click', () => this.handleExportCsv());
        }

        if (this.btnExportPdf) {
            this.btnExportPdf.addEventListener('click', () => this.handleExportPdf());
        }

        if (this.newModelForm) {
            this.newModelForm.addEventListener('submit', (e) => this.handleSaveModel(e));
        }

        if (this.newUserForm) {
            this.newUserForm.addEventListener('submit', (e) => this.handleCreateUser(e));
        }

        if (this.btnAdminSettings) {
            this.btnAdminSettings.addEventListener('click', () => {
                this.dashboardView.classList.replace('active-view', 'hidden');
                this.settingsView.classList.replace('hidden', 'active-view');
                this.renderSettingsView();
            });
        }

        if (this.btnBackSettings) {
            this.btnBackSettings.addEventListener('click', () => {
                this.settingsView.classList.replace('active-view', 'hidden');
                this.dashboardView.classList.replace('hidden', 'active-view');
            });
        }

        if (this.settingsForm) {
            this.settingsForm.addEventListener('submit', (e) => this.handleSaveSettings(e));
        }

        // Nachmelden toggle
        const btnNachmelden = document.getElementById('btn-toggle-nachmelden');
        if (btnNachmelden) {
            btnNachmelden.addEventListener('click', () => {
                const form = document.getElementById('nachmelden-form');
                form.classList.toggle('hidden');
                if (!form.classList.contains('hidden')) {
                    document.getElementById('retro-datum').value = new Date().toISOString().split('T')[0];
                }
            });
        }

        const retroForm = document.getElementById('retroactive-flight-form');
        if (retroForm) {
            retroForm.addEventListener('submit', (e) => this.handleRetroactiveFlight(e));
        }

        // Profile dropdown
        if (this.profileTrigger) {
            this.profileTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                this.profileMenu.classList.toggle('hidden');
                if (!this.profileMenu.classList.contains('hidden')) {
                    document.getElementById('profile-vorname').value = this.currentUser.vorname;
                    document.getElementById('profile-nachname').value = this.currentUser.nachname;
                    document.getElementById('profile-schulung').checked = this.currentUser.hat_schulungsnachweis || false;
                    document.getElementById('profile-flugordnung').checked = this.currentUser.hat_flugordnung_bestaetigt || false;
                }
            });
        }

        // Close profile menu on outside click
        document.addEventListener('click', (e) => {
            if (this.profileMenu && !this.profileMenu.classList.contains('hidden')) {
                if (!e.target.closest('.profile-dropdown')) {
                    this.profileMenu.classList.add('hidden');
                }
            }
        });

        const btnSaveProfile = document.getElementById('btn-save-profile');
        if (btnSaveProfile) {
            btnSaveProfile.addEventListener('click', () => this.handleSaveProfile());
        }

        const btnSavePassword = document.getElementById('btn-save-password');
        if (btnSavePassword) {
            btnSavePassword.addEventListener('click', () => this.handleSavePassword());
        }
    }

    async initDashboard(user) {
        this.currentUser = user;

        // Reset and check admin visibility
        const isAdmin = user.rolle === 'admin';

        if (this.btnAdminUsers) {
            if (isAdmin) this.btnAdminUsers.classList.remove('hidden');
            else this.btnAdminUsers.classList.add('hidden');
        }

        if (this.btnAdminSettings) {
            if (isAdmin) this.btnAdminSettings.classList.remove('hidden');
            else this.btnAdminSettings.classList.add('hidden');
        }

        // Show export buttons only for admins (bottom buttons)
        document.querySelectorAll('#btn-export-csv, #btn-export-pdf').forEach(btn => {
            if (isAdmin) btn.classList.remove('hidden');
            else btn.classList.add('hidden');
        });

        try {
            // Load Dropdowns
            await Promise.all([
                this.loadGelaende(),
                this.loadModelle(),
                this.loadSettings()
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

        // Also populate retro model dropdown
        const retroSelect = document.getElementById('retro-flight-modell');
        if (retroSelect) {
            retroSelect.innerHTML = '<option value="" disabled selected>Modell auswählen...</option>';
            list.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = `${m.bezeichnung} (${m.gewichtsklasse})`;
                retroSelect.appendChild(opt);
            });
        }
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
                        ${entry.pilot ? entry.pilot.vorname + ' ' + entry.pilot.nachname : 'Unbekannter Pilot'}
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

        const today = new Date().toISOString().split('T')[0];

        const payload = {
            datum: today,
            startzeit: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            gelaende_id: this.currentGelaende.value,
            ist_flugleiter: isFlugleiter,
            hat_flugordnung_bestaetigt: this.currentUser.hat_flugordnung_bestaetigt || false
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

    async handleRetroactiveFlight(e) {
        e.preventDefault();
        const datum = document.getElementById('retro-datum').value;
        const startzeit = document.getElementById('retro-startzeit').value + ':00';
        const endzeit = document.getElementById('retro-endzeit').value + ':00';
        const modellId = document.getElementById('retro-flight-modell').value;

        if (!datum || !startzeit || !endzeit || !modellId) {
            window.AppUtils.showToast('Bitte alle Felder ausfüllen', 'error');
            return;
        }

        const payload = {
            datum,
            startzeit,
            gelaende_id: this.currentGelaende.value,
            ist_flugleiter: false,
            hat_flugordnung_bestaetigt: this.currentUser.hat_flugordnung_bestaetigt || false,
            modell_id: modellId
        };

        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;

        try {
            const result = await api.startFlight(payload);
            await api.stopFlight(result.id, endzeit);
            window.AppUtils.showToast('Nachträglicher Eintrag gespeichert', 'success');

            document.getElementById('retro-startzeit').value = '';
            document.getElementById('retro-endzeit').value = '';
            document.getElementById('retro-flight-modell').selectedIndex = 0;
            document.getElementById('nachmelden-form').classList.add('hidden');
            this.loadFlugbuch();
        } catch (error) {
            window.AppUtils.showToast(error.message, 'error');
        } finally {
            btn.disabled = false;
        }
    }

    async handleSaveModel(e) {
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
            if (this.editingModelId) {
                await api.updateModell(this.editingModelId, payload);
                window.AppUtils.showToast('Modell aktualisiert', 'success');
                this.editingModelId = null;
                btn.innerHTML = '<i class="fa-solid fa-plus"></i> Modell hinzufügen';
                document.querySelector('.new-model-card h2').textContent = 'Neues Modell anlegen';
            } else {
                await api.createModell(payload);
                window.AppUtils.showToast('Modell erfolgreich angelegt', 'success');
            }

            this.newModelForm.reset();
            document.getElementById('model-frequenz').value = '2.4 GHz';

            await this.loadModelle();
            this.renderModelsView();

        } catch (error) {
            window.AppUtils.showToast(error.message, 'error');
        } finally {
            btn.disabled = false;
        }
    }

    handleEditModel(id) {
        const model = this.modelsList.find(m => m.id === parseInt(id) || m.id === id);
        if (!model) return;

        this.editingModelId = id;

        document.getElementById('model-bezeichnung').value = model.bezeichnung;
        document.getElementById('model-typ').value = model.modell_typ;
        document.getElementById('model-antrieb').value = model.antrieb;
        document.getElementById('model-gewichtsklasse').value = model.gewichtsklasse;
        document.getElementById('model-frequenz').value = model.frequenz || '2.4 GHz';
        document.getElementById('model-registriernummer').value = model.registriernummer || '';

        const btn = this.newModelForm.querySelector('button[type="submit"]');
        btn.innerHTML = '<i class="fa-solid fa-save"></i> Änderungen speichern';
        document.querySelector('.new-model-card h2').textContent = 'Modell bearbeiten';

        // Scroll to form
        this.newModelForm.scrollIntoView({ behavior: 'smooth' });
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
                <div style="display:flex; gap:0.5rem;">
                    <button class="btn-icon btn-edit-model" data-id="${m.id}" title="Modell bearbeiten" style="color:var(--primary)">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-icon btn-delete-model" data-id="${m.id}" title="Modell löschen" style="color:var(--danger)">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
            this.modelsListEl.appendChild(item);
        });

        document.querySelectorAll('.btn-edit-model').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleEditModel(e.currentTarget.dataset.id));
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

    // --- Export Logic ---
    async handleExportCsv() {
        const gelaendeId = this.currentGelaende.value;
        const datum = this.currentDate.value;
        if (!gelaendeId) return;

        try {
            await api.exportFlugbuchCsv(gelaendeId, datum);
            window.AppUtils.showToast('CSV Export gestartet', 'success');
        } catch (error) {
            window.AppUtils.showToast('CSV Export fehlgeschlagen: ' + error.message, 'error');
        }
    }

    async handleExportPdf() {
        const gelaendeId = this.currentGelaende.value;
        const datum = this.currentDate.value;
        if (!gelaendeId) return;

        try {
            await api.exportFlugbuchPdf(gelaendeId, datum);
            window.AppUtils.showToast('PDF Export gestartet', 'success');
        } catch (error) {
            window.AppUtils.showToast('PDF Export fehlgeschlagen: ' + error.message, 'error');
        }
    }

    // --- User Management Logic ---
    async handleCreateUser(e) {
        e.preventDefault();
        const isAdmin = document.getElementById('new-user-admin').checked;
        const payload = {
            vorname: document.getElementById('new-user-vorname').value,
            nachname: document.getElementById('new-user-nachname').value,
            email: document.getElementById('new-user-email').value,
            passwort: document.getElementById('new-user-password').value,
            rolle: isAdmin ? 'admin' : 'pilot',
            hat_schulungsnachweis: false
        };

        const btn = this.newUserForm.querySelector('button[type="submit"]');
        btn.disabled = true;

        try {
            await api.createUser(payload);
            window.AppUtils.showToast('Benutzer angelegt', 'success');
            this.newUserForm.reset();
            this.renderUsersView();
        } catch (error) {
            window.AppUtils.showToast('Fehler: ' + error.message, 'error');
        } finally {
            btn.disabled = false;
        }
    }

    async renderUsersView() {
        this.usersListEl.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i> Lade...</div>';
        try {
            const users = await api.getUsers();
            this.usersCountEl.textContent = users.length;
            this.usersListEl.innerHTML = '';

            users.forEach(u => {
                const isAdmin = u.rolle === 'admin';
                const isMe = u.id === this.currentUser.id;

                const item = document.createElement('div');
                item.className = 'flight-item glass-panel';
                item.innerHTML = `
                    <div class="flight-info">
                        <div class="flight-pilot" style="color:var(--text-primary);">
                            <i class="fa-solid ${isAdmin ? 'fa-user-shield' : 'fa-user'}"></i> 
                            ${u.vorname} ${u.nachname} ${isMe ? '(Ich)' : ''}
                        </div>
                        <div class="flight-model">
                            <span class="badge" style="background:rgba(255, 255, 255, 0.1); color:var(--text-secondary);">${u.email || 'Keine E-Mail'}</span>
                            ${isAdmin ? '<span class="badge status-active">ADMIN</span>' : ''}
                        </div>
                    </div>
                    ${!isMe ? `
                    <div style="display:flex; gap:0.5rem; align-items:center;">
                        <label class="toggle-switch" title="Admin-Rechte">
                            <input type="checkbox" class="admin-toggle" data-id="${u.id}" ${isAdmin ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                        <span style="font-size:0.75rem; color:var(--text-secondary); min-width:2.5rem;">Admin</span>
                        <button class="btn-icon btn-password-change" data-id="${u.id}" title="Passwort ändern" style="color:var(--warning)">
                            <i class="fa-solid fa-key"></i>
                        </button>
                        <button class="btn-icon btn-delete-user" data-id="${u.id}" title="Benutzer löschen" style="color:var(--danger)">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>` : '<span style="color:var(--text-secondary); font-size:0.8rem">Keine Aktion</span>'}
                `;
                this.usersListEl.appendChild(item);
            });

            // Bind admin toggle
            this.usersListEl.querySelectorAll('.admin-toggle').forEach(toggle => {
                toggle.addEventListener('change', async (e) => {
                    const newRole = e.target.checked ? 'admin' : 'pilot';
                    const id = e.target.dataset.id;
                    try {
                        await api.updateUserRole(id, newRole);
                        window.AppUtils.showToast(newRole === 'admin' ? 'Admin-Rechte erteilt' : 'Admin-Rechte entzogen', 'success');
                        this.renderUsersView();
                    } catch (err) {
                        window.AppUtils.showToast(err.message, 'error');
                        this.renderUsersView();
                    }
                });
            });

            // Bind password change
            this.usersListEl.querySelectorAll('.btn-password-change').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.currentTarget.dataset.id;
                    const newPass = prompt("Neues Passwort eingeben:");
                    if (!newPass) return;
                    try {
                        await api.updateUserPassword(id, newPass);
                        window.AppUtils.showToast("Passwort erfolgreich geändert", "success");
                    } catch (err) {
                        window.AppUtils.showToast(err.message, "error");
                    }
                });
            });

            // Bind delete
            this.usersListEl.querySelectorAll('.btn-delete-user').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.currentTarget.dataset.id;
                    if (!confirm("Benutzer wirklich löschen?")) return;
                    try {
                        await api.deleteUser(id);
                        window.AppUtils.showToast("Benutzer gelöscht", "success");
                        this.renderUsersView();
                    } catch (err) {
                        window.AppUtils.showToast(err.message, "error");
                    }
                });
            });

        } catch (error) {
            this.usersListEl.innerHTML = `<div class="empty-state" style="color:var(--danger)">Fehler beim Laden der Benutzer: ${error.message}</div>`;
        }
    }

    // --- Settings Logic ---
    async loadSettings() {
        try {
            const config = await api.getSettings();
            this.appSettings = config;
            this.updateDynamicText();
        } catch (error) {
            console.error("Settings load failed:", error);
        }
    }

    updateDynamicText() {
        if (!this.appSettings) return;

        const name = this.appSettings.flugplatz_name;
        // Update H1 in Login
        const loginH1 = document.querySelector('#view-login h1');
        if (loginH1) loginH1.textContent = name;

        // Update Confirm text
        const legalText = document.querySelector('.legal-checkbox span:not(.custom-checkbox)');
        if (legalText) {
            legalText.textContent = `Ich bestätige die Geltung der StRfF und der Flugordnung der ${name} e.V.`;
        }
    }

    async renderSettingsView() {
        try {
            const config = await api.getSettings();
            this.settingsNameInput.value = config.flugplatz_name;
            this.settingsAddrInput.value = config.adresse;
        } catch (error) {
            window.AppUtils.showToast("Fehler beim Laden der Einstellungen", "error");
        }
    }

    async handleSaveSettings(e) {
        e.preventDefault();
        const payload = {
            flugplatz_name: this.settingsNameInput.value,
            adresse: this.settingsAddrInput.value
        };

        const btn = this.settingsForm.querySelector('button[type="submit"]');
        btn.disabled = true;

        try {
            await api.updateSettings(payload);
            window.AppUtils.showToast("Einstellungen gespeichert", "success");
            await this.loadSettings(); // Sync local state
        } catch (error) {
            window.AppUtils.showToast(error.message, "error");
        } finally {
            btn.disabled = false;
        }
    }

    // --- Profile Self-Service ---
    async handleSaveProfile() {
        const vorname = document.getElementById('profile-vorname').value.trim();
        const nachname = document.getElementById('profile-nachname').value.trim();
        if (!vorname || !nachname) {
            window.AppUtils.showToast('Bitte Vor- und Nachname eingeben', 'error');
            return;
        }
        try {
            const schulung = document.getElementById('profile-schulung').checked;
            const flugordnung = document.getElementById('profile-flugordnung').checked;
            const updated = await api.updateOwnProfile({ vorname, nachname, hat_schulungsnachweis: schulung, hat_flugordnung_bestaetigt: flugordnung });
            this.currentUser.vorname = updated.vorname;
            this.currentUser.nachname = updated.nachname;
            this.currentUser.hat_schulungsnachweis = updated.hat_schulungsnachweis;
            this.currentUser.hat_flugordnung_bestaetigt = updated.hat_flugordnung_bestaetigt;
            localStorage.setItem('flugbuch_user', JSON.stringify(this.currentUser));
            document.getElementById('nav-user-name').textContent = `${updated.vorname} ${updated.nachname}`;
            this.profileMenu.classList.add('hidden');
            window.AppUtils.showToast('Profil aktualisiert', 'success');
        } catch (error) {
            window.AppUtils.showToast(error.message, 'error');
        }
    }

    async handleSavePassword() {
        const newPw = document.getElementById('profile-new-password').value;
        const confirmPw = document.getElementById('profile-confirm-password').value;
        if (!newPw || newPw.length < 4) {
            window.AppUtils.showToast('Passwort muss mindestens 4 Zeichen lang sein', 'error');
            return;
        }
        if (newPw !== confirmPw) {
            window.AppUtils.showToast('Passwörter stimmen nicht überein', 'error');
            return;
        }
        try {
            await api.updateOwnPassword(newPw);
            document.getElementById('profile-new-password').value = '';
            document.getElementById('profile-confirm-password').value = '';
            this.profileMenu.classList.add('hidden');
            window.AppUtils.showToast('Passwort erfolgreich geändert', 'success');
        } catch (error) {
            window.AppUtils.showToast(error.message, 'error');
        }
    }
}

// Init App
document.addEventListener('DOMContentLoaded', () => {
    window.App = new FlugbuchApp();
});
