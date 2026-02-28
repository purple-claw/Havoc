$errors = $null
$null = [System.Management.Automation.Language.Parser]::ParseFile("c:\Users\nithi\Documents\Dv\Havoc\start.ps1", [ref]$null, [ref]$errors)
if ($errors.Count -eq 0) { Write-Host "Syntax OK" } else { $errors | ForEach-Object { $_.Message } }
