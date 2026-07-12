import glob
import re

files = glob.glob('D:/mini_project/src/routes/portal.*.tsx')
for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content.replace('text-4xl md:text-[2.5rem]', 'text-3xl md:text-4xl')
    new_content = new_content.replace('text-4xl font-extrabold', 'text-3xl font-extrabold')

    if new_content != content:
        with open(file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Reduced headers in {file}')
