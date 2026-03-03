const API_BASE_URL = 'http://127.0.0.1:8000/api';

class ApiClient {
    constructor() {
        this.token = localStorage.getItem('flugbuch_token');
    }

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('flugbuch_token', token);
        } else {
            localStorage.removeItem('flugbuch_token');
        }
    }

    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const config = {
            ...options,
            headers
        };

        if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData) && !(config.body instanceof URLSearchParams)) {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);

            // Handle 401 Unauthorized (Token expired/invalid)
            if (response.status === 401) {
                this.setToken(null);
                window.dispatchEvent(new Event('auth-expired'));
                throw new Error('Nicht autorisiert oder Sitzung abgelaufen');
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                let errorMsg = errorData.detail || `Server Fehler: ${response.status}`;
                if (Array.isArray(errorMsg)) {
                    errorMsg = errorMsg.map(e => e.msg).join(', ');
                }
                throw new Error(errorMsg);
            }

            return await response.json();

        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Auth
    async login(username, password) {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const response = await this.request('/auth/login', {
            method: 'POST',
            body: formData,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        this.setToken(response.access_token);
        localStorage.setItem('flugbuch_user', JSON.stringify(response.user));
        return response.user;
    }

    async loginGast(vorname, nachname, token) {
        const response = await this.request('/auth/gast', {
            method: 'POST',
            body: { vorname, nachname, gast_token: token }
        });

        this.setToken(response.access_token);
        localStorage.setItem('flugbuch_user', JSON.stringify(response.user));
        return response.user;
    }

    // Data Fetching
    async getGelaende() {
        return this.request('/gelaende');
    }

    async getModelle() {
        return this.request('/modelle');
    }

    async createModell(data) {
        return this.request('/modelle', {
            method: 'POST',
            body: data
        });
    }

    async deleteModell(id) {
        return this.request(`/modelle/${id}`, {
            method: 'DELETE'
        });
    }

    async getFlugbuch(gelaendeId, datum) {
        let url = `/flugbuch?gelaende_id=${gelaendeId}`;
        if (datum) url += `&datum=${datum}`;
        return this.request(url);
    }

    // Actions
    async startFlight(data) {
        return this.request('/flugbuch', {
            method: 'POST',
            body: data
        });
    }

    async stopFlight(id, endzeit, besonderesEreignis = null) {
        const update = { endzeit: endzeit };
        if (besonderesEreignis) update.besonderes_ereignis = besonderesEreignis;

        return this.request(`/flugbuch/${id}`, {
            method: 'PUT',
            body: update
        });
    }

    async exportFlugbuchCsv(gelaendeId, datum) {
        let url = `${API_BASE_URL}/flugbuch/export/csv?gelaende_id=${gelaendeId}`;
        if (datum) url += `&datum=${datum}`;

        const headers = {};
        if (this.token) Object.assign(headers, { 'Authorization': `Bearer ${this.token}` });

        const response = await fetch(url, { headers });
        if (!response.ok) {
            let errorMsg = `Server Fehler: ${response.status}`;
            try {
                const errorData = await response.json();
                if (errorData.detail) errorMsg = Array.isArray(errorData.detail) ? errorData.detail.map(e => e.msg).join(', ') : errorData.detail;
            } catch (e) { }
            throw new Error(errorMsg);
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `flugbuch_export${datum ? '_' + datum : ''}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        a.remove();
    }

    async exportFlugbuchPdf(gelaendeId, datum) {
        let url = `${API_BASE_URL}/flugbuch/export/pdf?gelaende_id=${gelaendeId}`;
        if (datum) url += `&datum=${datum}`;

        const headers = {};
        if (this.token) Object.assign(headers, { 'Authorization': `Bearer ${this.token}` });

        const response = await fetch(url, { headers });
        if (!response.ok) {
            let errorMsg = `Server Fehler: ${response.status}`;
            try {
                const errorData = await response.json();
                if (errorData.detail) errorMsg = Array.isArray(errorData.detail) ? errorData.detail.map(e => e.msg).join(', ') : errorData.detail;
            } catch (e) { }
            throw new Error(errorMsg);
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `flugbuch_export${datum ? '_' + datum : ''}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        a.remove();
    }

    async getUsers() {
        return this.request('/users');
    }

    async createUser(payload) {
        return this.request('/users', {
            method: 'POST',
            body: payload
        });
    }

    async updateUserRole(id, rolle) {
        return this.request(`/users/${id}/rolle`, {
            method: 'PUT',
            body: { rolle }
        });
    }

    async updateUserPassword(id, passwort) {
        return this.request(`/users/${id}/passwort`, {
            method: 'PUT',
            body: { passwort }
        });
    }

    async deleteUser(id) {
        return this.request(`/users/${id}`, {
            method: 'DELETE'
        });
    }
}

const api = new ApiClient();
