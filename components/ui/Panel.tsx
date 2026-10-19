import { HTMLAttributes } from "react";

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  noPadding?: boolean;
}

/**
 * A console block: hard square edges, a left accent keel, and a flat fill. No radius anywhere in
 * this project — the whole surface is meant to read as fixed-width terminal output.
 */
export default function Panel({
  elevated,
  noPadding,
  children,
  className = "",
  style,
  ...props
}: PanelProps) {
  return (
    <div
      className={[noPadding ? "" : "p-5", className].join(" ")}
      style={{
        background: elevated ? "var(--bg-elevated)" : "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderLeft: "2px solid var(--border-strong)",
        borderRadius: 0,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
