
import glob
import re

files = glob.glob("D:/mini_project/src/routes/portal.*.tsx")
for file in files:
    with open(file, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Aggressively remove margin-bottom on the header row to pull the tab bar up closely
    new_content = re.sub(r"justify-between gap-(\d+) mb-[248]", r"justify-between gap-\1 mb-2", content)
    
    if new_content != content:
        with open(file, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Fixed margin in {file}")

