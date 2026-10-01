import { ObservabilityClient } from "./ObservabilityClient"

export default function ObservabilityPage() {
  return (
    <div className="adm-container">
      <div className="adm-header">
        <h1 className="adm-title">Observability</h1>
      </div>
      <ObservabilityClient />
    </div>
  )
}
