<?php
function handle_module_request($action) {
    switch ($action) {
        case 'screenshot':
            $file = __DIR__ . '/../../snapshot.jpg';
            // PowerShell to take screenshot
            $psCommand = "Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; " .
                "\$bmp = New-Object System.Drawing.Bitmap([System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width, [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height); " .
                "\$graphics = [System.Drawing.Graphics]::FromImage(\$bmp); " .
                "\$graphics.CopyFromScreen([System.Windows.Forms.Screen]::PrimaryScreen.Bounds.X, [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Y, 0, 0, \$bmp.Size); " .
                "\$bmp.Save('$file', [System.Drawing.Imaging.ImageFormat]::Jpeg); " .
                "\$bmp.Dispose(); \$graphics.Dispose();";

            shell_exec("powershell -Command \"$psCommand\"");

            if (file_exists($file)) {
                $data = base64_encode(file_get_contents($file));
                return ['status' => 'success', 'data' => $data];
            } else {
                return ['status' => 'error', 'message' => 'Screenshot failed. Apache permissions?'];
            }

        case 'volume':
            $type = $_POST['type'] ?? 'mute'; 
            $vbsFile = sys_get_temp_dir() . '/vol.vbs';
            $code = 'Set WshShell = CreateObject("WScript.Shell")' . "\r\n";
            if ($type === 'mute') $code .= 'WshShell.SendKeys(chr(&hAD))';
            if ($type === 'up') $code .= 'WshShell.SendKeys(chr(&hAF))';
            if ($type === 'down') $code .= 'WshShell.SendKeys(chr(&hAE))';
            file_put_contents($vbsFile, $code);
            shell_exec("cscript //Nologo $vbsFile");
            unlink($vbsFile);
            return ['status' => 'success', 'message' => "Volume $type"];

        case 'power':
            $type = $_POST['type'] ?? '';
            if ($type === 'lock') shell_exec('rundll32.exe user32.dll,LockWorkStation');
            if ($type === 'sleep') shell_exec('rundll32.exe powrprof.dll,SetSuspendState 0,1,0');
            return ['status' => 'success', 'message' => 'Executed'];

        default: return ['status' => 'error', 'message' => 'Unknown Action'];
    }
}
?>