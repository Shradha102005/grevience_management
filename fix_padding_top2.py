
import glob
import re

files = glob.glob("D:/mini_project/src/routes/portal.*.tsx")
for file in files:
    with open(file, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Catch any flex-1 ... py-8 or p-8 that sits right below the header/tabs
    # Typically: className="flex-1 overflow-y-auto px-6 lg:px-10 py-8 z-10 relative"
    # We will just replace py-8 with pt-4 pb-8
    new_content = re.sub(r"className=\"(flex-1[^>]+?)\s+py-8\b", r"className=\"\1 pt-4 pb-8", content)
    new_content = re.sub(r"className=\"(flex-1[^>]+?)\s+p-8\b", r"className=\"\1 px-8 pt-4 pb-8", new_content)
    
    if new_content != content:
        with open(file, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Fixed padding in {file}")

