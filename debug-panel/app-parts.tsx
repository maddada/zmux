import type { NativeTerminalDebugProjection } from "../shared/native-terminal-debug-contract";

export function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="summary-card">
      <div className="summary-label">{label}</div>
      <div className="summary-value">{value}</div>
    </div>
  );
}

export function SectionTitle({ detail, title }: { detail?: string; title: string }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {detail ? <span>{detail}</span> : null}
    </div>
  );
}

export function ProjectionList({
  projections,
  visibleSessionSet,
}: {
  projections: NativeTerminalDebugProjection[];
  visibleSessionSet: Set<string>;
}) {
  if (projections.length === 0) {
    return <p className="empty-copy">No terminals in this bucket.</p>;
  }

  return (
    <div className="projection-table">
      <div className="projection-header">
        <span>Alias</span>
        <span>Session</span>
        <span>Location</span>
        <span>Flags</span>
      </div>
      {projections.map((projection) => (
        <div className="projection-row" key={`${projection.sessionId}-${projection.location}`}>
          <span className="projection-primary">
            {projection.alias ?? projection.terminalName ?? projection.sessionId}
          </span>
          <span>{projection.sessionId}</span>
          <span>{projection.location}</span>
          <div className="projection-flags">
            {projection.isParked ? <StatusPill label="Parked" tone="muted" /> : null}
            {visibleSessionSet.has(projection.sessionId) ? (
              <StatusPill label="Visible" tone="active" />
            ) : null}
            {projection.exitCode !== undefined ? (
              <StatusPill label={`Exit ${String(projection.exitCode)}`} tone="warn" />
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="field">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "active" | "info" | "muted" | "warn";
}) {
  return <span className={`status-pill status-pill-${tone}`}>{label}</span>;
}

export function formatTimestamp(value: string | undefined): string {
  if (!value) {
    return "Unknown";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleTimeString();
}
