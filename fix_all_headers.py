import glob
import re

files = glob.glob('D:/mini_project/src/routes/portal.*.tsx')
for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix main headers
    new_content = re.sub(
        r'text-\d+xl md:text-(?:\[.*?\]|\d+xl) font-extrabold tracking-tight flex items-center',
        r'text-2xl md:text-3xl font-extrabold tracking-tight flex items-center',
        content
    )
    
    # Fix secondary sub-header paragraphs that might be too large
    new_content = re.sub(r'text-xl(?= font-bold text-slate-500)', 'text-lg', new_content)

    if new_content != content:
        with open(file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Fixed headers in {file}')
