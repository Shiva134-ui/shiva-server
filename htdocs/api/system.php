<?php // Path: htdocs/api/system.php
header('Content-Type: application/json');
session_start();

// --- SECURITY CONFIG ---
$CONFIG_PASSWORD = "janvi"; // <--- CHANGE THIS PASSWORD
// -----------------------

// Helper function
function executeCommand($cmd)
{
    return shell_exec($cmd);
}

// 1. LOGIN
if (isset($_POST['action']) && $_POST['action'] === 'login') {
    $password = $_POST['password'] ?? '';
    if ($password === $CONFIG_PASSWORD) {
        $_SESSION['authenticated'] = true;
        echo json_encode(['status' => 'success', 'message' => 'Access Granted']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Access Denied']);
    }
    exit;
}

// 2. AUTH CHECK (Gatekeeper)
if (!isset($_SESSION['authenticated']) || $_SESSION['authenticated'] !== true) {
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

// 3. SYSTEM ACTIONS
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    switch ($action) {
        case 'shutdown':
            // /t 5 gives you 5 seconds to realize if you made a mistake
            executeCommand('shutdown /s /t 5');
            echo json_encode(['status' => 'success', 'message' => 'System halting in 5s...']);
            break;

        case 'restart':
            executeCommand('shutdown /r /t 5');
            echo json_encode(['status' => 'success', 'message' => 'System restarting in 5s...']);
            break;

        case 'cancel':
            executeCommand('shutdown /a');
            echo json_encode(['status' => 'success', 'message' => 'Sequence Aborted']);
            break;

        case 'launch':
            $app = $_POST['app'] ?? '';
            if ($app) {
                // pclose/popen allows PHP to launch the app without waiting for it to close
                pclose(popen("start \"\" \"" . escapeshellcmd($app) . "\"", "r"));
                echo json_encode(['status' => 'success', 'message' => "Launching $app..."]);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Target invalid']);
            }
            break;

        case 'stats':
            // CPU (Windows specific)
            $cpuLoad = trim(executeCommand('wmic cpu get loadpercentage | findstr [0-9]'));

            // RAM (Math Fix: Total is Bytes, Free is Kilobytes in wmic)
            $freeMemKB = trim(executeCommand('wmic OS get FreePhysicalMemory | findstr [0-9]'));
            $totalMemBytes = trim(executeCommand('wmic ComputerSystem get TotalPhysicalMemory | findstr [0-9]'));

            // Convert everything to KB for calculation
            $totalMemKB = $totalMemBytes / 1024;
            $usedMemKB = $totalMemKB - $freeMemKB;

            $memPercent = 0;
            if ($totalMemKB > 0) {
                $memPercent = ($usedMemKB / $totalMemKB) * 100;
            }

            echo json_encode([
                'status' => 'success',
                'data' => [
                    'cpu' => intval($cpuLoad),
                    'ram' => round($memPercent, 1)
                ]
            ]);
            break;

        case 'logout':
            session_destroy();
            echo json_encode(['status' => 'success', 'message' => 'Logged out']);
            break;

        default:
            echo json_encode(['status' => 'error', 'message' => 'Unknown Command']);
    }
}
?>