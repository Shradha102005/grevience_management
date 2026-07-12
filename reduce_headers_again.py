import glob
import re

files = glob.glob('D:/mini_project/src/routes/portal.*.tsx')
for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Scale main titles down to 2xl/3xl
    new_content = content.replace('text-3xl md:text-4xl', 'text-2xl md:text-3xl')
    
    # Scale large numbers/kpi values down
    new_content = new_content.replace('text-3xl font-extrabold', 'text-2xl font-extrabold')

    # Also try to catch any remaining text-4xl that I missed
    new_content = new_content.replace('text-4xl', 'text-3xl')

    if new_content != content:
        with open(file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Reduced headers again in {file}')
