<?php
function handle_module_request($action) {
    switch ($action) {
        case 'get':
            // MEMORY
            $memOut = shell_exec('wmic OS get FreePhysicalMemory,TotalVisibleMemorySize /Value');
            preg_match('/FreePhysicalMemory=(\d+)/', $memOut, $freeMatches);
            preg_match('/TotalVisibleMemorySize=(\d+)/', $memOut, $totalMatches);

            $totalRam = isset($totalMatches[1]) ? $totalMatches[1] : 0; // KB
            $freeRam = isset($freeMatches[1]) ? $freeMatches[1] : 0;   // KB
            $usedRam = $totalRam - $freeRam;
            $ramPercent = ($totalRam > 0) ? round(($usedRam / $totalRam) * 100, 1) : 0;

            // CPU
            $cpuOut = shell_exec('wmic cpu get loadpercentage | findstr [0-9]');
            $cpuPercent = intval(trim($cpuOut));

            // STORAGE (C:)
            $diskOut = shell_exec('wmic logicaldisk where Caption="C:" get FreeSpace,Size /Value');
            preg_match('/FreeSpace=(\d+)/', $diskOut, $freeDiskMatches);
            preg_match('/Size=(\d+)/', $diskOut, $sizeDiskMatches);

            $totalDisk = isset($sizeDiskMatches[1]) ? $sizeDiskMatches[1] : 0;
            $freeDisk = isset($freeDiskMatches[1]) ? $freeDiskMatches[1] : 0;
            $usedDisk = $totalDisk - $freeDisk;
            $diskPercent = ($totalDisk > 0) ? round(($usedDisk / $totalDisk) * 100, 1) : 0;

            return [
                'status' => 'success',
                'data' => [
                    'cpu' => $cpuPercent,
                    'ram' => $ramPercent,
                    'disk' => $diskPercent,
                    'disk_total_gb' => round($totalDisk / 1073741824, 1),
                    'disk_free_gb' => round($freeDisk / 1073741824, 1)
                ]
            ];
        default: return ['status' => 'error', 'message' => 'Unknown Action'];
    }
}
?>