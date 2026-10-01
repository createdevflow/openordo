const fs = require('fs');

const code = fs.readFileSync('src/app/admin/tax/TaxClient.tsx', 'utf8');
const newCode = code.replace(/export function TaxClient\(\{ initialConfigs \}: \{ initialConfigs: TaxCountryConfig\[\] \}\) \{/,
`export function MarketsGeoTab({ 
  initialConfigs, 
  globalSettings, 
  handleSaveGlobal, 
  savingGlobal 
}: { 
  initialConfigs: TaxCountryConfig[]
  globalSettings: Record<string, string>
  handleSaveGlobal: (s: Record<string, string>) => void
  savingGlobal: boolean
}) {`);

const withDropdown = newCode.replace(/return \(\s*<div className="space-y-6">/,
`const [defaultMarket, setDefaultMarket] = useState(globalSettings.DEFAULT_MARKET || 'US')

  return (
    <div className="space-y-6">
      <section>
        <div style={{ marginBottom: 20 }}>
          <div className="adm-section-label" style={{ marginBottom: 4 }}>Default Market</div>
          <p style={{ fontSize: 13.5, color: "var(--adm-muted)", margin: 0 }}>
            Choose the default fallback market for pricing and taxes.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Select value={defaultMarket} onChange={(e) => setDefaultMarket(e.target.value)} style={{ width: 200 }}>
            <option value="US">US / Rest of World</option>
            <option value="IN">India (IN)</option>
          </Select>
          <Button 
            disabled={savingGlobal} 
            onClick={() => handleSaveGlobal({ DEFAULT_MARKET: defaultMarket })}
          >
            {savingGlobal ? 'Saving...' : 'Save Default Market'}
          </Button>
        </div>
      </section>
      <hr style={{ border: 0, borderTop: '1px solid var(--adm-border)' }} />
`);

fs.writeFileSync('src/app/admin/settings/MarketsGeoTab.tsx', withDropdown);
console.log('Created MarketsGeoTab.tsx');
