const fs = require('fs');
let code = fs.readFileSync('src/app/admin/settings/SettingsShell.tsx', 'utf8');

// 1. Add import
code = code.replace(/import \{ DnsHealthCheck \} from ".\/DnsHealthCheck"/, 'import { DnsHealthCheck } from "./DnsHealthCheck"\nimport { MarketsGeoTab } from "./MarketsGeoTab"');

// 2. Add taxConfigs to props
code = code.replace(/baaTemplateVersions: any\[\]\n\}\) \{/, 'baaTemplateVersions: any[]\n  taxConfigs: any[]\n}) {');
code = code.replace(/baaTemplateVersions \}: \{/, 'baaTemplateVersions, taxConfigs }: {');

// 3. Update ALL_TABS
code = code.replace(/\{ value: 'danger', label: 'Danger Zone', icon: <AlertTriangle size=\{14\} \/> \},/, '{ value: \'danger\', label: \'Danger Zone\', icon: <AlertTriangle size={14} /> },\n    { value: \'markets\', label: \'Markets & Geo\', icon: <Globe size={14} /> },');

// 4. Inject Tabs.Content for markets right before {/* ── DANGER ZONE ── */}
const marketsTabContent = `
          {/* ── MARKETS & GEO ── */}
          <Tabs.Content value="markets" className="adm-tab-content">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <MarketsGeoTab 
                initialConfigs={taxConfigs} 
                globalSettings={globalSettings} 
                handleSaveGlobal={handleSaveGlobal} 
                savingGlobal={savingGlobal} 
              />
            </div>
          </Tabs.Content>
`;
code = code.replace(/\{\/\* ── DANGER ZONE ── \*\/\}/, marketsTabContent + '\n          {/* ── DANGER ZONE ── */}');

fs.writeFileSync('src/app/admin/settings/SettingsShell.tsx', code);
