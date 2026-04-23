import type { MouseEventHandler } from "react";

export type TerminalLoadingOverlayProps = {
  onMouseDown: MouseEventHandler<HTMLDivElement>;
  progressPercent: number;
};

export function TerminalLoadingOverlay({
  onMouseDown,
  progressPercent,
}: TerminalLoadingOverlayProps) {
  return (
    <div
      aria-live="polite"
      className="terminal-pane-loading-overlay"
      onMouseDown={onMouseDown}
      role="status"
    >
      <strong className="terminal-pane-loading-title">
        Generating session name. Press Escape to cancel.
      </strong>
      <div aria-hidden="true" className="terminal-pane-loading-progress">
        <div
          className="terminal-pane-loading-progress-fill"
          style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
        />
      </div>
    </div>
  );
}
