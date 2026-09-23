export function OAuthDivider() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        margin: "20px 0",
        userSelect: "none",
      }}
    >
      <div style={{ flex: 1, height: 1, background: "var(--color-line)" }} />
      <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--color-moss)", letterSpacing: "0.04em" }}>
        OR
      </span>
      <div style={{ flex: 1, height: 1, background: "var(--color-line)" }} />
    </div>
  )
}
