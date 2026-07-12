$files = Get-ChildItem "src/routes/portal.*.tsx"
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    $content = $content -replace 'text-\[10px\]', 'text-xs'
    $content = $content -replace 'text-\[11px\]', 'text-xs'
    $content = $content -replace 'text-\[13px\]', 'text-sm'
    $content = $content -replace 'text-\[15px\]', 'text-base'
    $content = $content -replace 'text-\[16px\]', 'text-base'
    
    Set-Content $file.FullName -Value $content -NoNewline
}
