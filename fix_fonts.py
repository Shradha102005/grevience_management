import glob
import re

files = glob.glob('D:/mini_project/src/routes/portal.*.tsx')
for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = re.sub(r'fontSize:\s*"14px"', 'fontSize: "16px"', content)
    new_content = re.sub(r'fontSize:\s*"12px"', 'fontSize: "14px"', new_content)
    new_content = re.sub(r'fontSize:\s*"13px"', 'fontSize: "15px"', new_content)
    new_content = re.sub(r'\btext-sm\b', 'text-base', new_content)
    new_content = re.sub(r'\btext-xs\b', 'text-sm', new_content)

    if new_content != content:
        with open(file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Updated sizes in {file}')
