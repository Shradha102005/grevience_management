
import glob
import re

files = glob.glob("D:/mini_project/src/routes/portal.*.tsx")
for file in files:
    with open(file, "r", encoding="utf-8") as f:
        content = f.read()
    
    # We want to target the Tab Content wrapper
    new_content = content.replace(
        "className=\"flex-1 overflow-y-auto px-6 lg:px-10 py-8 z-10 relative\"",
        "className=\"flex-1 overflow-y-auto px-6 lg:px-10 pt-4 pb-8 z-10 relative\""
    )
    # Some might just be p-8
    new_content = new_content.replace(
        "className=\"flex-1 flex overflow-hidden p-8 justify-center z-10 relative\"",
        "className=\"flex-1 flex overflow-hidden px-8 pt-4 pb-8 justify-center z-10 relative\""
    )
    
    if new_content != content:
        with open(file, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Fixed padding in {file}")

