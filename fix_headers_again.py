import glob

files = glob.glob('D:/mini_project/src/routes/portal.*.tsx')
for file in files:
    if "portal.grievances.tsx" in file:
        continue
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content.replace(
        'text-2xl md:text-3xl font-extrabold tracking-tight',
        'text-2xl font-extrabold tracking-tight'
    )
    
    if new_content != content:
        with open(file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Fixed header size in {file}')
