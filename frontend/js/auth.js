class AuthManager {
    constructor() {
        this.loginView = document.getElementById('view-login');
        this.dashboardView = document.getElementById('view-dashboard');
        this.loginForm = document.getElementById('login-form');
        this.gastsBtn = document.getElementById('btn-show-gast');
        this.logoutBtn = document.getElementById('btn-logout');
        this.userNameEl = document.getElementById('nav-user-name');

        this.setupEventListeners();
        this.checkAuthStatus();

        window.addEventListener('auth-expired', () => this.handleLogout());
    }

    setupEventListeners() {
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        if (this.gastsBtn) {
            this.gastsBtn.addEventListener('click', () => {
                const token = prompt("Bitte Einladungscode (Gast-Token) eingeben:", "gast2026");
                if (token) {
                    const name = prompt("Bitte Vor- und Nachname eingeben (z.B. Max Mustermann):");
                    if (name) {
                        const parts = name.split(' ');
                        const vorname = parts[0] || 'Gast';
                        const nachname = parts.slice(1).join(' ') || 'Flieger';
                        this.handleGastLogin(vorname, nachname, token);
                    }
                }
            });
        }
    }

    checkAuthStatus() {
        const token = localStorage.getItem('flugbuch_token');
        const userJson = localStorage.getItem('flugbuch_user');

        if (token && userJson) {
            try {
                const user = JSON.parse(userJson);
                this.showDashboard(user);
            } catch (e) {
                this.handleLogout();
            }
        } else {
            this.showLogin();
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const emailInput = document.getElementById('login-email');
        const passwordInput = document.getElementById('login-password');
        const errorEl = document.getElementById('login-error');
        const btn = this.loginForm.querySelector('button[type="submit"]');

        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Lade...';
        errorEl.classList.add('hidden');

        try {
            const user = await api.login(emailInput.value, passwordInput.value);
            this.showDashboard(user);
            emailInput.value = '';
            passwordInput.value = '';
        } catch (error) {
            errorEl.textContent = error.message;
            errorEl.classList.remove('hidden');
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Anmelden <i class="fa-solid fa-arrow-right"></i>';
        }
    }

    async handleGastLogin(vorname, nachname, token) {
        try {
            const user = await api.loginGast(vorname, nachname, token);
            this.showDashboard(user);
            window.AppUtils.showToast(`Als Tagesgast angemeldet: ${vorname} ${nachname}`, 'success');
        } catch (error) {
            alert("Gast-Login fehlgeschlagen: " + error.message);
        }
    }

    handleLogout() {
        api.setToken(null);
        localStorage.removeItem('flugbuch_user');
        this.showLogin();
        window.AppUtils.showToast('Erfolgreich abgemeldet.', 'info');
    }

    showDashboard(user) {
        this.loginView.classList.remove('active-view');
        this.dashboardView.classList.remove('hidden');

        // Slight delay for animation wrapper
        setTimeout(() => {
            this.dashboardView.classList.add('active-view');
        }, 50);

        if (this.userNameEl) {
            this.userNameEl.innerHTML = `<i class="fa-solid fa-user"></i> ${user.vorname} ${user.nachname} ${user.ist_gast ? '(Gast)' : ''}`;
            this.userNameEl.dataset.userid = user.id;
            this.userNameEl.dataset.role = user.rolle;
        }

        // Trigger global event so app.js can load data
        window.dispatchEvent(new CustomEvent('user-authenticated', { detail: user }));
    }

    showLogin() {
        this.dashboardView.classList.remove('active-view');
        // Wait for fade out
        setTimeout(() => {
            if (!localStorage.getItem('flugbuch_token')) {
                this.dashboardView.classList.add('hidden');
                this.loginView.classList.add('active-view');
            }
        }, 300);
    }
}

// Wait for DOM
document.addEventListener('DOMContentLoaded', () => {
    window.Auth = new AuthManager();
});
