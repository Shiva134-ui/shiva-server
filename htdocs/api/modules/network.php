<?php
function checkPort($host, $port) {
    $connection = @fsockopen($host, $port, $errno, $errstr, 1);
    if (is_resource($connection)) {
        fclose($connection);
        return true;
    }
    return false;
}

function handle_module_request($action) {
    switch ($action) {
        case 'scan':
            $services = [
                'Apache (Web)' => checkPort('127.0.0.1', 80),
                'MySQL (DB)' => checkPort('127.0.0.1', 3306),
                'SSH' => checkPort('127.0.0.1', 22),
                'RDP' => checkPort('127.0.0.1', 3389)
            ];
            $publicIp = trim(@file_get_contents('https://api.ipify.org'));
            return [
                'status' => 'success',
                'data' => [
                    'services' => $services,
                    'public_ip' => $publicIp ?: 'Unknown',
                    'hostname' => gethostname()
                ]
            ];
        default: return ['status' => 'error', 'message' => 'Unknown Action'];
    }
}
?>