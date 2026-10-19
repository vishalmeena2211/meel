/*
  Ask Meel's mark: Meel's kilometre stone (white body, yellow cap) with a speech tail and a short road inside.
  At rest a glint crosses the cap. With `thinking`, the road runs and the stone bobs (styles in globals.css).
  The clip ids repeat on a page; every copy has the same shapes, so that is harmless.
*/

const STONE = "M5 22.5V10a7 7 0 0 1 14 0v6a2 2 0 0 1-2 2H9.5z";

export function AskMark({ className = "size-6", thinking = false }: { className?: string; thinking?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`ask-mark shrink-0 overflow-visible ${className}`} data-think={thinking ? "" : undefined}>
      <defs>
        <clipPath id="ask-cap">
          <path d="M5 11V10a7 7 0 0 1 14 0v1z" />
        </clipPath>
        <clipPath id="ask-body">
          <path d="M6 12h12v5H6z" />
        </clipPath>
      </defs>
      <path d={STONE} fill="var(--color-stone-body)" />
      <g clipPath="url(#ask-cap)">
        <path d="M4 11V2h16v9z" fill="var(--color-stone)" />
        <polygon className="m-glint" points="1,12 3.4,12 7.4,1 5,1" fill="#fff" opacity={0.75} />
      </g>
      <path d={`${STONE}M5 11h14`} fill="none" stroke="var(--color-stone-ink)" strokeWidth={1.8} strokeLinejoin="round" />
      <g clipPath="url(#ask-body)">
        <path className="m-road" d="M3.2 14.5h2.4M8 14.5h2.4M12.8 14.5h2.4M17.6 14.5h2.4M22.4 14.5h2.4" stroke="var(--color-stone-ink)" strokeWidth={1.8} strokeLinecap="round" />
      </g>
    </svg>
  );
}
