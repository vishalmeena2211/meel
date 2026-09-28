import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

import { DayPicker, ListPicker, MonthPicker, type ChoiceGroup } from "./pickers";
import { BackHead, TopHead } from "./shell";

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
  /** Only needed when two boxes on one page share a name. */
  id?: string;
  hint?: string;
  optional?: string;
  error?: string;
}

function Wrap({ label, name, id = name, hint, optional, error, children }: Common & { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} id={`${id}-label`} className="text-sm font-semibold">
        {label} {optional ? <span className="font-normal text-ink-2">{optional}</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm font-medium text-stale-fg">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function described(id: string, hint?: string, error?: string): string | undefined {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

export function Field({
  label,
  name,
  id = name,
  hint,
  optional,
  error,
  ...rest
}: Common & Omit<InputHTMLAttributes<HTMLInputElement>, "name" | "id">) {
  return (
    <Wrap label={label} name={name} id={id} hint={hint} optional={optional} error={error}>
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={described(id, hint, error)}
        className="field-input"
        {...rest}
      />
    </Wrap>
  );
}

export function Area({
  label,
  name,
  id = name,
  hint,
  optional,
  error,
  ...rest
}: Common & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "name" | "id">) {
  return (
    <Wrap label={label} name={name} id={id} hint={hint} optional={optional} error={error}>
      <textarea
        id={id}
        name={name}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={described(id, hint, error)}
        className="field-input"
        {...rest}
      />
    </Wrap>
  );
}

/** A list to pick one from, drawn by Meel rather than the browser. */
export function ListField({
  label,
  name,
  id = name,
  hint,
  optional,
  error,
  groups,
  defaultValue,
  onValueChange,
  placeholder,
}: Common & { groups: ChoiceGroup[]; defaultValue?: string; onValueChange?: (value: string) => void; placeholder: string }) {
  return (
    <Wrap label={label} name={name} id={id} hint={hint} optional={optional} error={error}>
      <ListPicker
        id={id}
        labelId={`${id}-label`}
        title={label}
        name={name}
        groups={groups}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        placeholder={placeholder}
        invalid={!!error}
        describedBy={described(id, hint, error)}
      />
    </Wrap>
  );
}

/** A day, picked from Meel's own calendar. Sent as "2027-06-19". */
export function DayField({
  label,
  name,
  id = name,
  hint,
  optional,
  error,
  defaultValue,
  onValueChange,
  min,
  max,
}: Common & { defaultValue?: string; onValueChange?: (value: string) => void; min?: string; max?: string }) {
  return (
    <Wrap label={label} name={name} id={id} hint={hint} optional={optional} error={error}>
      <DayPicker
        id={id}
        labelId={`${id}-label`}
        title={label}
        name={name}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        min={min}
        max={max}
        invalid={!!error}
        describedBy={described(id, hint, error)}
      />
    </Wrap>
  );
}

/** A month, picked from Meel's own grid of months. Sent as "2027-06". */
export function MonthField({
  label,
  name,
  id = name,
  hint,
  optional,
  error,
  defaultValue,
  onValueChange,
  min,
  max,
  title,
}: Common & { defaultValue?: string; onValueChange?: (value: string) => void; min?: string; max?: string; title?: string }) {
  return (
    <Wrap label={label} name={name} id={id} hint={hint} optional={optional} error={error}>
      <MonthPicker
        id={id}
        labelId={`${id}-label`}
        title={title ?? label}
        name={name}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        min={min}
        max={max}
        invalid={!!error}
        describedBy={described(id, hint, error)}
      />
    </Wrap>
  );
}

/** Routes grouped by region, in the order they came, for a list of routes. */
export function routeGroups(routes: ReadonlyArray<{ slug: string; name: string; region_name: string }>): ChoiceGroup[] {
  const regions = [...new Set(routes.map((r) => r.region_name))];
  return regions.map((region) => ({
    label: region,
    choices: routes.filter((r) => r.region_name === region).map((r) => ({ value: r.slug, label: r.name })),
  }));
}

export { ErrorSummary } from "./error-summary";

/**
 * The name of a page. On a wider screen it is a heading.
 * On a phone it is the screen's own header: with a way back, or, on the four top-level screens, with the mark.
 */
export function PageTitle({
  title,
  lede,
  phone,
}: {
  title: string;
  lede?: string;
  phone?: { title?: string; sub?: string; back?: string; right?: ReactNode };
}) {
  return (
    <>
      {phone ? (
        phone.back ? (
          <BackHead title={phone.title ?? title} sub={phone.sub} back={phone.back} right={phone.right} />
        ) : (
          <TopHead title={phone.title ?? title} sub={phone.sub} />
        )
      ) : null}
      <header className={phone ? "hidden flex-col gap-1 md:flex" : "flex flex-col gap-1"}>
        {phone ? (
          <p role="heading" aria-level={1} className="display text-4xl">
            {title}
          </p>
        ) : (
          <h1 className="display text-[1.75rem] md:text-4xl">{title}</h1>
        )}
        {lede ? <p className="hint max-w-[60ch] text-[0.9375rem]">{lede}</p> : null}
      </header>
    </>
  );
}
