// Path: htdocs/js/main.js
document.addEventListener('DOMContentLoaded', () => {
    // State
    let isAuthenticated = false; // In a real app, check session cookie first

    // DOM Elements
    const loginModal = document.getElementById('loginModal');
    const loginBtn = document.getElementById('loginBtn');
    const passwordInput = document.getElementById('passwordInput');
    const loginError = document.getElementById('loginError');
    
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    
    const cpuBar = document.getElementById('cpuBar');
    const ramBar = document.getElementById('ramBar');
    const cpuText = document.getElementById('cpuText');
    const ramText = document.getElementById('ramText');
    
    const toggleBtn = document.getElementById('mobileToggle');
    const sidebar = document.querySelector('.sidebar');

    // --- Authentication ---
    async function handleLogin() {
        const pwd = passwordInput.value;
        const res = await System.login(pwd);
        
        if (res.status === 'success') {
            isAuthenticated = true;
            loginModal.style.display = 'none';
            startStatsPolling();
            alert('Welcome, Commander.');
        } else {
            loginError.textContent = res.message;
            passwordInput.value = '';
        }
    }

    loginBtn.addEventListener('click', handleLogin);
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // --- Navigation ---
    navItems.forEach(item => {
        item.addEventListener('click', async () => {
            // Remove active class
            navItems.forEach(n => n.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active'));
            
            // Add active class
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            const targetPage = document.getElementById(targetId);
            targetPage.classList.add('active');
            
            // Load content if needed
            const file = item.getAttribute('data-file');
            if (file && file !== 'dashboard' && targetPage.innerHTML.trim().includes('class="loader"')) {
                try {
                    const response = await fetch(file);
                    if (response.ok) {
                        const html = await response.text();
                        targetPage.innerHTML = html;
                    } else {
                        targetPage.innerHTML = '<p style="color:red">ERROR LOADING MODULE</p>';
                    }
                } catch (e) {
                    targetPage.innerHTML = '<p style="color:red">CONNECTION SEVERED</p>';
                }
            }
            
            // Close mobile sidebar if open
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
            }
        });
    });

    // --- System Controls ---
    window.execSystem = async (action) => {
        if (!confirm(`Are you sure you want to ${action.toUpperCase()} the system?`)) return;
        
        const res = await System[action]();
        alert(res.message);
    };

    window.launchApp = async (appName) => {
        const res = await System.launch(appName);
        // Toast notification could be better here
        console.log(res.message);
    };

    // --- Stats Polling ---
    function updateStats(data) {
        if (!data) return;
        
        // CPU
        cpuBar.style.width = `${data.cpu}%`;
        cpuText.textContent = `${data.cpu}%`;
        if(data.cpu > 80) cpuBar.classList.add('danger');
        else cpuBar.classList.remove('danger');
        
        // RAM
        ramBar.style.width = `${data.ram}%`;
        ramText.textContent = `${data.ram}%`;
        if(data.ram > 80) ramBar.classList.add('danger');
        else ramBar.classList.remove('danger');
    }

    function startStatsPolling() {
        setInterval(async () => {
            if (!isAuthenticated) return;
            const res = await System.getStats();
            if (res.status === 'success') {
                updateStats(res.data);
            }
        }, 2000);
    }
    
    // --- Mobile Toggle ---
    if(toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // --- Init ---
    // Check if we are already logged in (optional check against backend)
    // For now, force login screen on load
});
