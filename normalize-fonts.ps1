$files = Get-ChildItem "src/routes/portal.*.tsx"
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    $content = $content -replace 'fontSize:\s*"9px"', 'fontSize: "12px"'
    $content = $content -replace 'fontSize:\s*"10px"', 'fontSize: "12px"'
    $content = $content -replace 'fontSize:\s*"11px"', 'fontSize: "12px"'
    $content = $content -replace 'fontSize:\s*"13px"', 'fontSize: "14px"'
    $content = $content -replace 'fontSize:\s*"15px"', 'fontSize: "16px"'
    $content = $content -replace 'fontSize:\s*"17px"', 'fontSize: "16px"'
    $content = $content -replace 'fontSize:\s*"19px"', 'fontSize: "20px"'
    $content = $content -replace 'fontSize:\s*"21px"', 'fontSize: "20px"'
    $content = $content -replace 'fontSize:\s*"22px"', 'fontSize: "24px"'
    $content = $content -replace 'fontSize:\s*"23px"', 'fontSize: "24px"'

    Set-Content $file.FullName -Value $content -NoNewline
}
