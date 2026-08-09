import os
import re

solar_map = {
    'Upload': 'solar:upload-minimalistic-bold-duotone',
    'FileText': 'solar:file-text-bold-duotone',
    'Activity': 'solar:pulse-bold-duotone',
    'Stethoscope': 'solar:stethoscope-bold-duotone',
    'Clock': 'solar:clock-circle-bold-duotone',
    'FilePlus': 'solar:file-download-bold-duotone',
    'Calendar': 'solar:calendar-bold-duotone',
    'LayoutDashboard': 'solar:widget-bold-duotone',
    'User': 'solar:user-bold-duotone',
    'Users': 'solar:users-group-rounded-bold-duotone',
    'ChevronRight': 'solar:alt-arrow-right-bold-duotone',
    'Sparkles': 'solar:stars-bold-duotone',
    'Bot': 'solar:smart-speaker-bold-duotone',
    'Send': 'solar:plain-2-bold-duotone',
    'CheckCircle': 'solar:check-circle-bold-duotone',
    'UserCircle': 'solar:user-circle-bold-duotone',
    'ArrowLeft': 'solar:arrow-left-bold-duotone',
    'Search': 'solar:magnifier-bold-duotone',
    'FileSignature': 'solar:file-check-bold-duotone',
    'ArrowRight': 'solar:arrow-right-bold-duotone',
    'ShieldCheck': 'solar:shield-check-bold-duotone',
    'FileUp': 'solar:file-send-bold-duotone',
    'Share2': 'solar:share-bold-duotone',
    'X': 'solar:close-circle-bold-duotone',
    'Check': 'solar:check-read-bold-duotone'
}

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            path = os.path.join(root, file)
            with open(path, 'r') as f:
                content = f.read()

            if 'lucide-react' not in content:
                continue

            match = re.search(r'import\s+\{([^}]+)\}\s+from\s+[\'"]lucide-react[\'"];?', content)
            if match:
                imports = [i.strip() for i in match.group(1).split(',')]
                
                new_content = content
                for imp in imports:
                    if not imp: continue
                    solar_icon = solar_map.get(imp, 'solar:star-bold-duotone')
                    new_content = re.sub(fr'<{imp}([\s>])', fr'<Icon icon="{solar_icon}"\g<1>', new_content)
                
                new_content = new_content.replace(match.group(0), "import { Icon } from '@iconify/react';")
                
                if "import { Icon } from '@iconify/react';" not in new_content:
                    new_content = "import { Icon } from '@iconify/react';\n" + new_content

                with open(path, 'w') as f:
                    f.write(new_content)
            
            print(f"Updated {path}")
