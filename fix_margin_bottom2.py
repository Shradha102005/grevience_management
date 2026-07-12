
import glob
import re

files = glob.glob("D:/mini_project/src/routes/portal.*.tsx")
for file in files:
    with open(file, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Catch any header divs having gap-X mb-Y
    new_content = re.sub(r"gap-(\d+)\s+mb-[68]", r"gap-\1 mb-2", content)
    
    if new_content != content:
        with open(file, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Fixed margin in {file}")

