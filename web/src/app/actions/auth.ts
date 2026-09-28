"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { FormState } from "@/components/form";
import {
  changePassword,
  checkPassword,
  currentUser,
  deleteAccount,
  endSession,
  logIn,
  mayNotSignUp,
  signUp,
  updateProfile,
} from "@/server/auth";

function errorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

function text(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
}

/** Only ever send a rider to a page on this site. */
function safeNext(value: string): string {
  return /^\/(?!\/)[\w\-./?=&%#]*$/.test(value) ? value : "/account";
}

const name = z
  .string()
  .trim()
  .min(2, "Type your name, as you would like riders to know you.")
  .max(60, "That name is too long. 60 letters at most.");
const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(120)
  .regex(
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
    "This does not look like an email address. It needs a part after the dot, such as .com or .in.",
  );
const city = z.string().trim().min(2, "Type the city you ride from.").max(60);
const bike = z.string().trim().max(80).optional();

const signUpForm = z.object({
  name,
  email,
  password: z.string().max(200, "That password is too long. 200 characters at most."),
  home_city: city,
  bike,
  agreed: z.literal("yes", { message: "Tick this box to go ahead." }),
});

export async function signUpAction(_previous: FormState, form: FormData): Promise<FormState> {
  const values = {
    name: text(form, "name"),
    email: text(form, "email"),
    home_city: text(form, "home_city"),
    bike: text(form, "bike"),
  };
  const password = text(form, "password");
  const parsed = signUpForm.safeParse({ ...values, password, bike: values.bike || undefined, agreed: text(form, "agreed") });
  const errors = parsed.success ? {} : errorsOf(parsed.error);
  if (password.length < 10) {
    errors.password = `${password.length} ${password.length === 1 ? "character" : "characters"}. It needs at least 10.`;
  }
  if (!parsed.success || Object.keys(errors).length > 0) {
    return { ok: false, message: "Something needs fixing.", errors, values };
  }

  if (mayNotSignUp(parsed.data.email)) {
    // The same words as for an email already taken, so that nothing is given away.
    return {
      ok: false,
      message: "Something needs fixing.",
      errors: { email: "An account with this email already exists." },
      values,
    };
  }

  const result = await signUp({
    name: parsed.data.name,
    email: parsed.data.email,
    password,
    homeCity: parsed.data.home_city,
    bike: parsed.data.bike ?? null,
  });
  if (!result.ok) {
    return {
      ok: false,
      message: "Something needs fixing.",
      errors: { email: "An account with this email already exists." },
      values,
    };
  }
  redirect(safeNext(text(form, "next")));
}

export async function logInAction(_previous: FormState, form: FormData): Promise<FormState> {
  const typed = text(form, "email");
  const password = text(form, "password");
  const values = { email: typed };
  if (!typed.trim() || !password) {
    return {
      ok: false,
      message: "Type your email and your password.",
      errors: {
        ...(typed.trim() ? {} : { email: "Type the email you signed up with." }),
        ...(password ? {} : { password: "Type your password." }),
      },
      values,
    };
  }
  const result = await logIn(typed, password);
  if (!result.ok) {
    // The message does not say which of the two was wrong. That would tell a stranger which emails have accounts.
    return {
      ok: false,
      errors: {},
      values,
      message:
        result.reason === "resting"
          ? `Too many tries. This account rests for ${result.minutes} more ${result.minutes === 1 ? "minute" : "minutes"}.`
          : "That email and password do not match. Check both and try again. After 5 tries the account rests for 15 minutes.",
    };
  }
  // A one-time password is changed before anything else.
  if (result.mustChangePassword) redirect("/account#password");
  redirect(safeNext(text(form, "next")));
}

export async function logOutAction(): Promise<void> {
  await endSession();
  redirect("/");
}

const profileForm = z.object({ name, home_city: city, bike });

export async function updateProfileAction(_previous: FormState, form: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) redirect("/login?next=/account");
  const values = { name: text(form, "name"), home_city: text(form, "home_city"), bike: text(form, "bike") };
  const parsed = profileForm.safeParse({ ...values, bike: values.bike || undefined });
  if (!parsed.success) {
    return { ok: false, message: "Something needs fixing.", errors: errorsOf(parsed.error), values };
  }
  updateProfile(user.id, { name: parsed.data.name, homeCity: parsed.data.home_city, bike: parsed.data.bike ?? null });
  return { ok: true, message: "Saved.", errors: {}, values };
}

export async function changePasswordAction(_previous: FormState, form: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) redirect("/login?next=/account");
  const present = text(form, "present");
  const next = text(form, "next_password");
  const errors: Record<string, string> = {};
  if (!present) errors.present = user.must_change_password ? "Type the one-time password." : "Type your password as it is now.";
  if (next.length < 10) {
    errors.next_password = `${next.length} ${next.length === 1 ? "character" : "characters"}. It needs at least 10.`;
  } else if (next.length > 200) {
    errors.next_password = "That password is too long. 200 characters at most.";
  } else if (next === present) {
    errors.next_password = "That is the same as the one you have. Choose a different one.";
  }
  if (Object.keys(errors).length > 0) return { ok: false, message: "Something needs fixing.", errors };

  if (!(await changePassword(user.id, present, next))) {
    return {
      ok: false,
      message: "Something needs fixing.",
      errors: { present: "That is not your password as it is now. Nothing was changed." },
    };
  }
  revalidatePath("/account");
  return { ok: true, message: "Changed. Your other phones are logged out.", errors: {} };
}

export async function deleteAccountAction(_previous: FormState, form: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) redirect("/login?next=/account");
  const password = text(form, "password");
  if (!password) {
    return { ok: false, message: "", errors: { password: "Type your password to go ahead." } };
  }
  if (!(await checkPassword(user.id, password))) {
    return { ok: false, message: "", errors: { password: "That is not your password. Nothing was deleted." } };
  }
  const handTo: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (key.startsWith("hand:") && typeof value === "string" && value !== "withdraw") handTo[key.slice(5)] = value;
  }
  await deleteAccount(user.id, handTo);
  redirect("/?gone=1");
}
