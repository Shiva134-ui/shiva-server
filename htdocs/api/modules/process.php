<?php
function handle_module_request($action) {
    $BOTS_DIR = realpath(__DIR__ . '/../../bots');

    switch ($action) {
        case 'list_files':
            $files = glob("$BOTS_DIR/*.py");
            $data = [];
            foreach ($files as $f) $data[] = basename($f);
            return ['status' => 'success', 'data' => $data];

        case 'start':
            $script = $_POST['script'] ?? '';
            $scriptPath = realpath("$BOTS_DIR/$script");
            if ($scriptPath && strpos($scriptPath, $BOTS_DIR) === 0 && file_exists($scriptPath)) {
                $logFile = "$BOTS_DIR/" . $script . ".log";
                // Start background python process
                $cmd = "start /B python \"$scriptPath\" > \"$logFile\" 2>&1";
                pclose(popen($cmd, "r"));
                return ['status' => 'success', 'message' => 'Bot Started'];
            }
            return ['status' => 'error', 'message' => 'Script not found'];

        case 'read_log':
            $script = $_POST['script'] ?? '';
            $logFile = realpath("$BOTS_DIR/" . $script . ".log");
            if ($logFile && strpos($logFile, $BOTS_DIR) === 0 && file_exists($logFile)) {
                $content = file_get_contents($logFile);
                return ['status' => 'success', 'data' => substr($content, -2000)];
            }
            return ['status' => 'success', 'data' => 'No log found'];

        default: return ['status' => 'error', 'message' => 'Unknown Action'];
    }
}
?>