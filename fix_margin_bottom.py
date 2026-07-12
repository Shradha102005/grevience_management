
import glob
import re

files = glob.glob("D:/mini_project/src/routes/portal.*.tsx")
for file in files:
    with open(file, "r", encoding="utf-8") as f:
        content = f.read()
    
    # We want to target the gap-6 mb-8 or gap-4 mb-8 on the header row
    # E.g.: className="max-w-[1400px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8"
    new_content = content.replace("justify-between gap-6 mb-8", "justify-between gap-6 mb-4")
    new_content = new_content.replace("justify-between gap-4 mb-8", "justify-between gap-4 mb-4")
    new_content = new_content.replace("justify-between gap-6 mb-10", "justify-between gap-6 mb-4")
    
    if new_content != content:
        with open(file, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Fixed margin in {file}")

