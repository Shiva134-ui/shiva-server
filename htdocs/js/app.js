const App = {
    state: {
        currentPath: '',
        activeBots: [],
        currentModule: 'dashboard',
        theme: localStorage.getItem('shiva-theme') || 'light'
    },

    async req(module, action, data = {}) {
        const formData = new FormData();
        for (const k in data) formData.append(k, data[k]);
        try {
            const res = await fetch(`api/router.php?module=${module}&action=${action}`, { method: 'POST', body: formData });
            return await res.json();
        } catch (e) {
            console.error(e);
            return { status: 'error', message: 'Connection Failed' };
        }
    },

    Dashboard: {
        timer: null,
        init() {
            this.update();
            this.timer = setInterval(() => this.update(), 2000);
        },
        destroy() { if(this.timer) clearInterval(this.timer); },
        async update() {
            if(App.state.currentModule !== 'dashboard') return;
            const res = await App.req('stats', 'get');
            if (res.status === 'success') {
                this.renderBar('cpu', res.data.cpu);
                this.renderBar('ram', res.data.ram);
                this.renderBar('disk', res.data.disk);
                document.getElementById('disk-details').innerText = `${res.data.disk_free_gb}GB Free / ${res.data.disk_total_gb}GB Total`;
            }
        },
        renderBar(id, val) {
            const bar = document.getElementById(id + '-bar');
            const text = document.getElementById(id + '-text');
            if(bar && text) {
                bar.style.width = val + '%';
                text.innerText = val + '%';
                bar.style.background = val > 85 ? '#e74c3c' : 'var(--primary)';
            }
        }
    },

    Files: {
        async load(path = '') {
            App.state.currentPath = path;
            const res = await App.req('files', 'list', { path });
            if (res.status === 'success') this.render(res.data);
        },
        render(files) {
            const container = document.getElementById('file-list');
            if(!container) return;
            let html = '';
            if (App.state.currentPath !== '') {
               const parent = App.state.currentPath.split('/').slice(0,-1).join('/');
               html += `<div class="file-item" onclick="App.Files.load('${parent}')"><i class="fas fa-arrow-up"></i> ..</div>`;
            }
            files.forEach(f => {
                const icon = f.type === 'dir' ? 'fa-folder' : 'fa-file';
                const click = f.type === 'dir' ? `onclick="App.Files.load('${f.path}')"` : '';
                html += `<div class="file-item ${f.type}" ${click}>
                    <i class="fas ${icon}"></i>
                    <span>${f.name}</span>
                </div>`;
            });
            container.innerHTML = html;
        },
        async upload(input) {
            const file = input.files[0];
            if (!file) return;
            const fd = new FormData();
            fd.append('file', file);
            fd.append('path', App.state.currentPath);
            await fetch(`api/router.php?module=files&action=upload`, { method: 'POST', body: fd});
            this.load(App.state.currentPath);
        }
    },
    
    Bots: {
        async refresh() {
           const res = await App.req('process', 'list_files');
           const container = document.getElementById('bot-list');
           if (!container || res.status !== 'success') return;
           container.innerHTML = res.data.map(bot => `
               <div class="bot-card">
                   <h4><i class="fab fa-python"></i> ${bot}</h4>
                   <div class="bot-controls">
                       <button class="btn-sm" onclick="App.Bots.start('${bot}')">START</button>
                       <button class="btn-sm" onclick="App.Bots.logs('${bot}')">LOGS</button>
                   </div>
               </div>`).join('');
        },
        async start(script) {
            const res = await App.req('process', 'start', { script });
            alert(res.message);
        },
        async logs(script) {
            const res = await App.req('process', 'read_log', { script });
            document.getElementById('log-viewer').textContent = res.data;
            document.getElementById('log-modal').style.display = 'flex';
        }
    },
    
    Hosting: {
        async list() {
            const res = await App.req('hosting', 'list');
             const container = document.getElementById('site-list');
             if (res.status === 'success') {
                 container.innerHTML = res.data.map(site => `
                     <div class="site-card">
                         <h4>${site}</h4>
                         <a href="hosted/${site}" target="_blank" class="btn-link">OPEN <i class="fas fa-external-link-alt"></i></a>
                     </div>
                 `).join('');
             }
        },
        async create() {
            const name = prompt("Site Name (Alphanumeric only):");
            if (name) {
                const res = await App.req('hosting', 'create', { site_name: name });
                alert(res.message);
                this.list();
            }
        }
    },

    Terminal: {
        cwd: '',
        async init() {
            const input = document.getElementById('terminal-input');
            const output = document.getElementById('terminal-output');
            if(!input) return;
            input.focus();
            input.addEventListener('keydown', async (e) => {
                if (e.key === 'Enter') {
                    const cmd = input.value;
                    input.value = '';
                    this.log(`> ${cmd}`);
                    if (cmd.trim() === 'cls' || cmd.trim() === 'clear') { output.innerHTML = ''; return; }
                    const res = await App.req('terminal', 'exec', { cmd, cwd: this.cwd });
                    if (res.status === 'success') {
                        if (res.data) this.log(res.data);
                        if (res.cwd) {
                            this.cwd = res.cwd;
                            document.getElementById('term-cwd').textContent = this.cwd;
                        }
                    } else this.log(`Error: ${res.message}`);
                }
            });
        },
        log(msg) {
            const output = document.getElementById('terminal-output');
            output.innerText += msg + "\n";
            output.scrollTop = output.scrollHeight;
        },
        exec(cmd) {
             // For buttons in Launcher
             this.init(); // ensure active
             App.req('terminal', 'exec', { cmd, cwd: this.cwd });
             alert('Command Sent');
        }
    },
    
    Desktop: {
        async refresh() {
            const img = document.getElementById('desktop-view');
            const msg = document.getElementById('desktop-msg');
            msg.textContent = 'Capturing...';
            const res = await App.req('desktop', 'screenshot');
            if (res.status === 'success') {
                img.src = `data:image/jpeg;base64,${res.data}`;
                img.style.display = 'block';
                msg.style.display = 'none';
            } else {
                img.style.display = 'none';
                msg.style.display = 'block';
                msg.textContent = res.message;
            }
        },
        async vol(type) { await App.req('desktop', 'volume', { type }); },
        async power(type) { if(confirm('Are you sure?')) await App.req('desktop', 'power', { type }); }
    },

    init() {
        document.documentElement.setAttribute('data-theme', this.state.theme);
        const themeBtn = document.getElementById('theme-toggle');
        const themeIcon = themeBtn.querySelector('i');
        
        const updateIcon = () => {
            if (this.state.theme === 'dark') { themeIcon.classList.remove('fa-moon'); themeIcon.classList.add('fa-sun'); } 
            else { themeIcon.classList.remove('fa-sun'); themeIcon.classList.add('fa-moon'); }
        };
        updateIcon();

        themeBtn.addEventListener('click', () => {
            this.state.theme = this.state.theme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', this.state.theme);
            localStorage.setItem('shiva-theme', this.state.theme);
            updateIcon();
        });

        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = btn.dataset.target;
                const file = btn.dataset.file;
                
                App.state.currentModule = target;
                document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                document.getElementById(target).classList.add('active');
                
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                btn.classList.add('active');
                
                if (target === 'dashboard') this.Dashboard.init(); else this.Dashboard.destroy();

                if (file) this.loadFile(target, file, () => {
                    if (target === 'storage') this.Files.load(); 
                    if (target === 'console') this.Bots.refresh(); 
                    if (target === 'hosting') this.Hosting.list(); 
                    if (target === 'terminal') this.Terminal.init(); 
                    if (target === 'desktop') this.Desktop.refresh(); 
                });
            });
        });
    },
    
    async loadFile(targetId, file, callback) {
        const el = document.getElementById(targetId);
        if (el.innerHTML.trim() === '') {
            const res = await fetch(file);
            el.innerHTML = await res.text();
        }
        if(callback) callback();
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());