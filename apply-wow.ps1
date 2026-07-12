$files = Get-ChildItem "src/routes/portal.*.tsx"
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw

    $content = $content -replace 'export function (Agriculture|DisasterAlerts|ElectionCampaign|Helpline|MunicipalCommand|RuralDev|SchemeAI|SmartCity)', 'function $1'

    $content = $content -replace 'background:\s*"var\(--color-card\)"(?:,\s*borderRadius:\s*"[^"]+")?(?:,\s*border:\s*"[^"]+")?', 'background: "rgba(255,255,255,0.6)", backdropFilter: "blur(24px)", borderRadius: "16px", boxShadow: "0 20px 25px -5px rgba(226, 232, 240, 0.4)", border: "1px solid rgba(255,255,255,0.6)"'
    
    $content = $content -replace 'bg-white rounded-xl border border-slate-100 shadow-sm', 'bg-white/60 backdrop-blur-3xl rounded-2xl shadow-xl shadow-slate-200/40 border border-white/60 transition-all hover:shadow-2xl'
    
    $content = $content -replace 'bg-white rounded-2xl p-6 border border-slate-100 shadow-sm', 'bg-white/60 backdrop-blur-3xl rounded-2xl p-6 shadow-xl shadow-slate-200/40 border border-white/60 transition-all hover:shadow-2xl'
    
    $content = $content -replace 'bg-white shadow-sm border border-slate-100', 'bg-white/60 backdrop-blur-3xl shadow-xl shadow-slate-200/40 border border-white/60'
    
    $content = $content -replace 'bg-white border border-slate-100 shadow-sm', 'bg-white/60 backdrop-blur-3xl shadow-xl shadow-slate-200/40 border border-white/60'

    Set-Content $file.FullName -Value $content -NoNewline
}
