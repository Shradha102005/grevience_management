import glob
import re

files = glob.glob('D:/mini_project/src/routes/portal.*.tsx') + ['D:/mini_project/src/components/portal/portal-shell.tsx']
for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = re.sub(r'fontSize:\s*"16px"', 'fontSize: "14px"', content)
    new_content = re.sub(r'fontSize:\s*"15px"', 'fontSize: "13px"', new_content)
    new_content = re.sub(r'\btext-base\b', 'text-sm', new_content)

    if new_content != content:
        with open(file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Reduced sizes in {file}')
