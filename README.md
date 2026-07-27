# SHIVA Cloud Server Console v2.0

![PHP](https://img.shields.io/badge/PHP-8.x-777BB4?style=flat-square&logo=php&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?style=flat-square&logo=windows&logoColor=white)
![XAMPP](https://img.shields.io/badge/Server-XAMPP%20%2F%20Apache-FB7A24?style=flat-square&logo=xampp&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

**SHIVA Cloud Server Console** is a lightweight, self-hosted web control panel designed for managing local Windows home servers and home labs remotely. It combines real-time hardware telemetry, a Python bot supervisor, remote file manager, static web hosting engine, and an in-browser terminal into a unified Single Page Application (SPA).

---

## 🌟 Features

- 📊 **Real-time Telemetry:** Dynamic live monitoring of CPU load, RAM usage, and disk space (`C:` drive) via native WMI system queries.
- 🤖 **Python Bot Engine:** Launch, monitor, and inspect logs for background Python automation scripts (`.py`) non-blockingly.
- 📁 **Cloud Drive & Storage:** Browse directory structures, view file metrics, and upload assets directly through the browser.
- 🌐 **App Hosting Engine:** Create, manage, and instantly host static websites inside isolated virtual hosting subdirectories.
- 💻 **Web Terminal & Editor:** Full-featured command terminal and integrated Ace Code Editor for remote system administration.
- 📡 **Network Operations:** View active network interfaces, local IP configurations, open sockets, and listening ports.
- 🌙 **Modern Design System:** Built with a custom Lavender & Deep Purple theme featuring light/dark mode toggling and crisp SVG vector icons.

---

## 🛠️ Prerequisites

Before installing, ensure your environment meets the following requirements:

1. **Operating System:** Windows 10, Windows 11, or Windows Server 2016+.
2. **Web Server Stack:** [XAMPP](https://www.apachefriends.org/index.html) with PHP 8.0 or higher.
3. **Python:** [Python 3.9+](https://www.python.org/downloads/) added to your System Environment variables (`PATH`).
4. **Git:** Installed on the host machine.

---

## ⚙️ Installation & XAMPP Configuration

### Step 1: Clone the Repository

Open Command Prompt or PowerShell and clone the repository into your XAMPP `htdocs` directory:

```bash
cd C:\xampp\htdocs
git clone https://github.com/Shiva134-ui/shiva-server.git
```

### Step 2: Configure PHP Permissions (`php.ini`)

Shiva Server Console executes system diagnostics and process management via native PHP functions. Ensure these functions are enabled in your PHP configuration:

1. Open **XAMPP Control Panel**.
2. Next to Apache, click **Config** ➔ **php.ini**.
3. Search for `disable_functions` and ensure `shell_exec`, `exec`, `popen`, and `pclose` are **not** listed:
   ```ini
   ; Ensure these functions are NOT in disable_functions
   disable_functions =
   ```
4. Save the file and restart Apache in XAMPP.

### Step 3: Set Admin Credentials

Open `htdocs/api/router.php` and `htdocs/api/system.php` to set your custom authentication password:

```php
// In htdocs/api/router.php
$CONFIG_PASSWORD = "YOUR_SECURE_PASSWORD";

// In htdocs/api/system.php
$CONFIG_PASSWORD = "YOUR_SECURE_PASSWORD";
```

### Step 4: Verify Local Setup

Start Apache in XAMPP Control Panel, then navigate to your browser:
```
http://localhost/shiva-server/htdocs/
```
You should see the **SHIVA Cloud Console** interface with real-time system metrics active.

---

## 🌐 Port Forwarding & Remote Access

To access your Shiva Server Console globally outside your home network, choose one of the following methods:

---

### Option A: Router Port Forwarding (Traditional NAT)

#### 1. Assign a Static Local IP to your Server
1. Open PowerShell on the server host and check your IPv4 address:
   ```powershell
   ipconfig
   ```
   *(Note down your IPv4 address, e.g., `192.168.1.100`, and Default Gateway, e.g., `192.168.1.1`)*.
2. Go to **Control Panel** ➔ **Network and Sharing Center** ➔ **Change adapter settings**.
3. Right-click your network connection ➔ **Properties** ➔ **IPv4** ➔ **Properties**.
4. Change from Automatic (DHCP) to **Use the following IP address** and enter your static IP details.

#### 2. Configure Windows Defender Firewall Rule
Open PowerShell as Administrator and run the following command to allow incoming web traffic on Port 80:

```powershell
New-NetFirewallRule -DisplayName "SHIVA Web Server (Port 80)" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow
```

#### 3. Set Up NAT Port Forwarding in Your Router
1. Open your web browser and navigate to your router's gateway IP (e.g., `http://192.168.1.1`).
2. Log into your router administration panel.
3. Locate the **Port Forwarding** / **Virtual Server** section (usually under *Advanced Settings* or *WAN*).
4. Create a new rule:
   - **Service Name:** `SHIVA Server`
   - **Protocol:** `TCP`
   - **External Port:** `80` (or custom port like `8080`)
   - **Internal Port:** `80`
   - **Internal IP Address:** `192.168.1.100` *(Your server static IP)*
5. Save settings and apply changes.

#### 4. Access Remote Server
Find your public IP address by searching *"What is my IP"* on Google or running:
```powershell
curl api.ipify.org
```
You can now access your server remotely from any browser at:
`http://YOUR_PUBLIC_IP/shiva-server/htdocs/`

---

### Option B: Cloudflare Tunnel (Recommended & Secure)

Using Cloudflare Tunnel exposes your server securely without opening router ports or exposing your public IP:

1. Install `cloudflared` on Windows via PowerShell:
   ```powershell
   winget install Cloudflare.cloudflared
   ```
2. Login to Cloudflare:
   ```powershell
   cloudflared tunnel login
   ```
3. Create a tunnel:
   ```powershell
   cloudflared tunnel create shiva-server
   ```
4. Run the tunnel pointing to your local XAMPP server:
   ```powershell
   cloudflared tunnel run --url http://localhost/shiva-server/htdocs/ shiva-server
   ```
Cloudflare will generate a secure HTTPS URL (e.g. `https://shiva-server.yourdomain.com`) to access your console safely anywhere in the world.

---

## 📂 Project Architecture

```
shiva-server/
└── htdocs/
    ├── index.html          # Main SPA dashboard UI
    ├── favicon.svg         # SVG vector brand icon
    ├── favicon.png         # High-DPI PNG brand icon
    ├── css/
    │   └── style.css       # Design system & responsive layout styles
    ├── js/
    │   ├── app.js          # Core frontend state controller & API router
    │   ├── main.js         # Navigation handlers & event listeners
    │   └── system.js       # Telemetry updater script
    ├── pages/              # SPA sub-views (loaded dynamically)
    │   ├── console.html    # Bot Engine management view
    │   ├── desktop.html    # Remote view component
    │   ├── files.html      # Cloud drive file explorer
    │   ├── hosting.html    # Web hosting manager
    │   ├── network.html    # Network interface inspector
    │   └── terminal.html   # Web terminal console
    └── api/
        ├── router.php      # Central API entry point & authentication
        ├── system.php      # System control endpoints (stats, power controls)
        └── modules/        # Feature handlers
            ├── files.php    # Directory sandbox & file manager logic
            ├── hosting.php  # Dynamic web hosting site creation
            ├── network.php  # Netstat and socket analyzer
            ├── process.php  # Asynchronous Python process supervisor
            ├── stats.php    # WMI hardware telemetry parser
            └── terminal.php # Command prompt command executor
```

---

## 🔒 Security Best Practices

1. **Change Default Credentials:** Always update the default password in `router.php` and `system.php`.
2. **Enable HTTPS:** If using direct IP access, set up SSL using Let's Encrypt or place the server behind Cloudflare HTTPS proxy.
3. **Restrict IP Access:** In `C:\xampp\apache\conf\extra\httpd-vhosts.conf`, configure IP whitelist rules if access is only required from specific IP ranges.

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for details.

Developed with ❤️ by **[Shiva](https://github.com/Shiva134-ui)**
