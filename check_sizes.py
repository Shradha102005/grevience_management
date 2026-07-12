import glob, re
for f in glob.glob('D:/mini_project/src/routes/portal.*.tsx'):
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
        sizes = re.findall(r'fontSize:\s*\"(\d+px)\"', content)
        sizes += re.findall(r'text-(xs|sm|base|lg|xl|2xl|3xl|4xl)', content)
        from collections import Counter
        print(f"{f.split('/')[-1]}: {Counter(sizes).most_common(5)}")
