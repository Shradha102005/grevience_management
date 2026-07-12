
import glob
import re

files = glob.glob("D:/mini_project/src/routes/portal.*.tsx")
for file in files:
    with open(file, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Shrink header buttons (h-14 -> h-10)
    content = content.replace("h-14 px-6 rounded-[1.25rem]", "h-10 px-4 rounded-xl")
    
    # Shrink tab bar container
    content = content.replace("rounded-[1.25rem] p-1.5", "rounded-xl p-1")
    
    # Shrink tab buttons
    content = content.replace("px-6 py-3 rounded-xl text-sm font-extrabold", "px-4 py-2 rounded-lg text-sm font-bold")
    
    # Shrink icons inside tab buttons
    content = content.replace("w-5 h-5 ${activeTab", "w-4 h-4 ${activeTab")
    
    # Shrink icons in header buttons
    content = content.replace("w-5 h-5 group-hover", "w-4 h-4 group-hover")
    content = content.replace("w-5 h-5 animate-spin", "w-4 h-4 animate-spin")
    content = content.replace("w-5 h-5\"", "w-4 h-4\"")
    content = content.replace("w-5 h-5 ", "w-4 h-4 ")

    # Remove scale-105 to make them less huge
    content = content.replace(" scale-105", "")

    with open(file, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Shrunk buttons/tabs in {file}")

