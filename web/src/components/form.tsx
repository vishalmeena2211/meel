import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export interface FormState {
  ok: boolean;
  message: string;
  errors: Record<string, string>;
  /** What the rider typed, handed back so nothing is lost when something needs fixing. */
  values?: Record<string, string>;
}

export const BLANK: FormState = { ok: false, message: "", errors: {} };

interface Common {
  label: string;
  name: string;
  hint?: string;
  optional?: string;
  error?: string;
}

function Wrap({ label, name, hint, optional, error, children }: Common & { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-semibold">
        {label} {optional ? <span className="font-normal text-ink-2">{optional}</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${name}-error`} className="text-sm font-medium text-stale-fg">
          {error}
        </p>
      ) : hint ? (
        <p id={`${name}-hint`} className="hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function described(name: string, hint?: string, error?: string): string | undefined {
  if (error) return `${name}-error`;
  if (hint) return `${name}-hint`;
  return undefined;
}

export function Field({
  label,
  name,
  hint,
  optional,
  error,
  ...rest
}: Common & Omit<InputHTMLAttributes<HTMLInputElement>, "name" | "id">) {
  return (
    <Wrap label={label} name={name} hint={hint} optional={optional} error={error}>
      <input
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={described(name, hint, error)}
        className="field-input"
        {...rest}
      />
    </Wrap>
  );
}

export function Area({
  label,
  name,
  hint,
  optional,
  error,
  ...rest
}: Common & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "name" | "id">) {
  return (
    <Wrap label={label} name={name} hint={hint} optional={optional} error={error}>
      <textarea
        id={name}
        name={name}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={described(name, hint, error)}
        className="field-input"
        {...rest}
      />
    </Wrap>
  );
}

export function Select({
  label,
  name,
  hint,
  optional,
  error,
  children,
  ...rest
}: Common & Omit<SelectHTMLAttributes<HTMLSelectElement>, "name" | "id"> & { children: ReactNode }) {
  return (
    <Wrap label={label} name={name} hint={hint} optional={optional} error={error}>
      <select
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={described(name, hint, error)}
        className="field-input"
        {...rest}
      >
        {children}
      </select>
    </Wrap>
  );
}

/** Counts what needs fixing, for a rider whose keyboard hides the rest of the form. */
export function ErrorSummary({ state }: { state: FormState }) {
  const count = Object.keys(state.errors).length;
  if (state.ok || (!state.message && count === 0)) return null;
  return (
    <div role="alert" className="rounded-lg border border-stale-fg/30 bg-stale-bg px-3 py-2.5 text-sm">
      <b className="block">
        {count > 0 ? `${count} ${count === 1 ? "thing needs" : "things need"} fixing` : state.message}
      </b>
      {count > 0 ? "Each is marked below." : null}
    </div>
  );
}

export function PageTitle({ title, lede }: { title: string; lede?: string }) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="display text-[1.75rem] md:text-4xl">{title}</h1>
      {lede ? <p className="hint max-w-[60ch] text-[0.9375rem]">{lede}</p> : null}
    </header>
  );
}
