/*
  Runs once when the server starts.

  Without AUTH_SECRET, Auth.js cannot read or write a login cookie. Meel's own check then treats everyone as
  logged out (it fails closed), but a server running like that is broken. So a production server refuses to
  serve: Next.js logs "Failed to prepare server" with the words below and answers every request with an error.
  A development server says so loudly and carries on.
*/
export function register(): void {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.AUTH_SECRET) return;
  const words = "AUTH_SECRET is not set, so nobody can log in. Add it to web/.env.local. See web/README.md, Settings.";
  if (process.env.NODE_ENV === "production") throw new Error(words);
  console.error(`\n  ${words}\n`);
}
