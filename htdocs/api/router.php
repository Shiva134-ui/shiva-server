<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
session_start();

$CONFIG_PASSWORD = "admin"; // PASSWORD
$MODULES_DIR = __DIR__ . '/modules';

// Authentication
if (isset($_POST['action']) && $_POST['action'] === 'login') {
    if (($_POST['password'] ?? '') === $CONFIG_PASSWORD) {
        $_SESSION['authenticated'] = true;
        echo json_encode(['status' => 'success']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Invalid Password']);
    }
    exit;
}

// Security Check (Disabled for development/testing, enable in production)
// if (!isset($_SESSION['authenticated']) || $_SESSION['authenticated'] !== true) {
//    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
//    exit;
// }

// Routing
$module = $_GET['module'] ?? '';
$action = $_GET['action'] ?? '';

$moduleFile = "$MODULES_DIR/$module.php";

if (file_exists($moduleFile)) {
    include $moduleFile;
    if (function_exists('handle_module_request')) {
        echo json_encode(handle_module_request($action));
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Module structure invalid']);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'Module not found']);
}
?>