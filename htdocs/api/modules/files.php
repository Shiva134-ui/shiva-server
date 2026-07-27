<?php
function handle_module_request($action) {
    $BASE_DIR = realpath(__DIR__ . '/../../drive');

    switch ($action) {
        case 'list':
            $path = $_POST['path'] ?? '';
            $target = realpath("$BASE_DIR/$path");
            // Security Sandbox check
            if ($target === false || strpos($target, $BASE_DIR) !== 0) return ['status' => 'error', 'message' => 'Access Denied'];

            $files = scandir($target);
            $result = [];
            foreach ($files as $f) {
                if ($f === '.' || $f === '..') continue;
                $fullPath = "$target/$f";
                $result[] = [
                    'name' => $f,
                    'type' => is_dir($fullPath) ? 'dir' : 'file',
                    'size' => is_dir($fullPath) ? '-' : filesize($fullPath),
                    'path' => "$path/$f"
                ];
            }
            return ['status' => 'success', 'data' => $result];

        case 'upload':
            $path = $_POST['path'] ?? '';
            $targetDir = realpath("$BASE_DIR/$path");
            if (isset($_FILES['file'])) {
                $targetFile = $targetDir . '/' . basename($_FILES['file']['name']);
                if (move_uploaded_file($_FILES['file']['tmp_name'], $targetFile)) return ['status' => 'success'];
            }
            return ['status' => 'error', 'message' => 'Upload Failed'];

        default: return ['status' => 'error', 'message' => 'Unknown Action'];
    }
}
?>