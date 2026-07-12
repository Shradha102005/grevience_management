import glob
import re

files = glob.glob('D:/mini_project/src/routes/portal.*.tsx')
for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Scale down inline fonts
    content = content.replace('fontSize: "20px"', 'fontSize: "18px"')
    content = content.replace('fontSize: "18px"', 'fontSize: "16px"')
    content = content.replace('fontSize: "16px"', 'fontSize: "14px"')
    content = content.replace('fontSize: "15px"', 'fontSize: "13px"')

    # 2. Scale down tailwind text-xl to text-lg (make sure we don't accidentally touch text-2xl by using word boundaries)
    # Be careful not to replace things like md:text-xl unless we want to. Let's do it with word boundaries.
    content = re.sub(r'\btext-xl\b', 'text-lg', content)
    content = re.sub(r'\btext-lg\b', 'text-base', content)

    # Note: text-base is usually implicit, but if they explicitly wrote text-base we might want to make it text-sm.
    # But wait, earlier we set taglines to 	ext-sm md:text-base. If we run this, md:text-base becomes md:text-sm.
    # Let's SKIP text-base replacement so we don't shrink taglines again.
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Scaled down content fonts in {file}')
