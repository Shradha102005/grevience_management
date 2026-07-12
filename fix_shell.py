import os
import re

file = 'D:/mini_project/src/components/portal/portal-shell.tsx'
with open(file, 'r', encoding='utf-8') as f:
    content = f.read()

new_content = re.sub(r'\btext-sm\b', 'text-base', content)
new_content = re.sub(r'\btext-xs\b', 'text-sm', new_content)

if new_content != content:
    with open(file, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Updated sizes in portal-shell')
