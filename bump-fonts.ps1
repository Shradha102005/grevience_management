$files = Get-ChildItem "src/routes/portal.*.tsx"
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # We must replace in order to avoid double bumping
    # First, handle inline fonts
    $content = $content -replace 'fontSize:\s*"16px"', 'fontSize: "18px"'
    $content = $content -replace 'fontSize:\s*"14px"', 'fontSize: "16px"'
    $content = $content -replace 'fontSize:\s*"12px"', 'fontSize: "14px"'
    
    # Now handle Tailwind classes. 
    # Use word boundary so we don't accidentally match part of another string.
    $content = $content -replace '\btext-lg\b', 'text-xl'
    $content = $content -replace '\btext-base\b', 'text-lg'
    $content = $content -replace '\btext-sm\b', 'text-base'
    $content = $content -replace '\btext-xs\b', 'text-sm'
    
    Set-Content $file.FullName -Value $content -NoNewline
}
