import glob
import re

files = glob.glob('D:/mini_project/src/routes/portal.*.tsx')
for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content.replace(
        'text-slate-500/80 dark:text-slate-400 mt-2 font-bold text-xl',
        'text-slate-500/80 dark:text-slate-400 mt-2 font-bold text-base md:text-lg'
    )
    
    if new_content != content:
        with open(file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Fixed tagline in {file}')
