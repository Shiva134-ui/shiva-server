// Path: htdocs/js/system.js
const API_URL = 'api/system.php';

// Demo Mode Toggle (automatically enabled if server fails)
let demoMode = false;

const System = {
    async post(action, data = {}) {
        if (demoMode) return this.mockResponse(action, data);

        const formData = new FormData();
        formData.append('action', action);
        for (const key in data) {
            formData.append(key, data[key]);
        }

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                // If 405 (Method Not Allowed) or 404, switch to demo mode
                if (response.status === 405 || response.status === 404) {
                    console.warn('Server not found/supported. Switching to DEMO MODE.');
                    demoMode = true;
                    return this.mockResponse(action, data);
                }
                throw new Error(`Server Error: ${response.status}`);
            }

            const text = await response.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                console.warn('Invalid JSON from server. Switching to DEMO MODE.');
                demoMode = true;
                return this.mockResponse(action, data);
            }
        } catch (error) {
            console.error('API Error:', error);
            // Fallback to demo mode on network error or file:// access
            console.warn('Connection failed. Switching to DEMO MODE.');
            demoMode = true;
            return this.mockResponse(action, data);
        }
    },

    mockResponse(action, data) {
        // Simulate network delay
        return new Promise(resolve => {
            setTimeout(() => {
                switch (action) {
                    case 'login':
                        if (data.password === 'admin') {
                            resolve({ status: 'success', message: 'Logged in (SIMULATION)' });
                        } else {
                            resolve({ status: 'error', message: 'Invalid Password' });
                        }
                        break;
                    case 'stats':
                        // Generate random stats
                        resolve({
                            status: 'success',
                            data: {
                                cpu: Math.floor(Math.random() * 100),
                                ram: Math.floor(Math.random() * 100),
                                timestamp: Date.now()
                            }
                        });
                        break;
                    case 'shutdown':
                    case 'restart':
                    case 'cancel':
                        resolve({ status: 'success', message: `System ${action} command sent (SIMULATION)` });
                        break;
                    case 'launch':
                        resolve({ status: 'success', message: `Launched ${data.app} (SIMULATION)` });
                        break;
                    default:
                        resolve({ status: 'error', message: 'Unknown Action' });
                }
            }, 500);
        });
    },

    async login(password) {
        return await this.post('login', { password });
    },

    async getStats() {
        return await this.post('stats');
    },

    async shutdown() {
        return await this.post('shutdown');
    },

    async restart() {
        return await this.post('restart');
    },

    async cancel() {
        return await this.post('cancel');
    },

    async launch(appParams) {
        return await this.post('launch', { app: appParams });
    }
};
