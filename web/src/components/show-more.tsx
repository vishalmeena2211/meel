import { Children, type ReactNode } from "react";

/**
 * Shows the first few of a long list, and folds the rest away.
 * A link to a folded fact still lands on it: the browser opens the fold by itself.
 */
export function ShowMore({
  first = 6,
  noun,
  className,
  children,
}: {
  first?: number;
  noun: string;
  className: string;
  children: ReactNode;
}) {
  const all = Children.toArray(children);
  if (all.length <= first + 1) return <div className={className}>{all}</div>;
  return (
    <div className="flex flex-col gap-2">
      <div className={className}>{all.slice(0, first)}</div>
      <details className="flex flex-col gap-2">
        <summary className="btn btn-outline cursor-pointer list-none self-start [&::-webkit-details-marker]:hidden">
          Show {all.length - first} more {noun}
        </summary>
        <div className={`${className} mt-2`}>{all.slice(first)}</div>
      </details>
    </div>
  );
}
