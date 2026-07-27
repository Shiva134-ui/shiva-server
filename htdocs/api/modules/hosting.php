<?php
function handle_module_request($action) {
    $dir = __DIR__ . '/../../hosted';
    if (!is_dir($dir)) @mkdir($dir, 0777, true);
    $HOST_DIR = realpath($dir);

    switch ($action) {
        case 'create':
            $name = $_POST['site_name'] ?? '';
            $name = preg_replace("/[^a-zA-Z0-9]/", "", $name); // Sanitize
            if (!$name) return ['status' => 'error', 'message' => 'Invalid Name'];

            $target = "$HOST_DIR/$name";
            if (!file_exists($target)) {
                mkdir($target);
                file_put_contents("$target/index.html", "<h1>Welcome to $name</h1><p>Hosted on SHIVA</p>");
                return ['status' => 'success', 'message' => "Site created at /hosted/$name"];
            }
            return ['status' => 'error', 'message' => 'Site exists'];

        case 'list':
            $dirs = array_filter(glob("$HOST_DIR/*"), 'is_dir');
            $data = [];
            foreach ($dirs as $d) $data[] = basename($d);
            return ['status' => 'success', 'data' => $data];

        default: return ['status' => 'error', 'message' => 'Unknown Action'];
    }
}
?>