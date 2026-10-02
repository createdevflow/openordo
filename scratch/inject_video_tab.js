const fs = require('fs');

let code = fs.readFileSync('src/app/admin/settings/SettingsShell.tsx', 'utf8');

// Add import
if (!code.includes('VideoInfrastructureTab')) {
  code = code.replace(
    'import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"',
    'import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"\nimport { VideoInfrastructureTab } from "./VideoInfrastructureTab"'
  );

  // Add trigger
  code = code.replace(
    '<TabsTrigger value="webhooks"',
    '<TabsTrigger value="video">Video Infra</TabsTrigger>\n                <TabsTrigger value="webhooks"'
  );

  // Add content
  code = code.replace(
    '<TabsContent value="webhooks"',
    '<TabsContent value="video" className="p-0 border-none">\n                <VideoInfrastructureTab />\n              </TabsContent>\n              <TabsContent value="webhooks"'
  );
  
  fs.writeFileSync('src/app/admin/settings/SettingsShell.tsx', code);
}
