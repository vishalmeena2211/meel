/** Only ever send a rider on to a page on this site. Anything else, such as "//elsewhere.com", becomes /account. */
export function safeNext(value: string | null | undefined): string {
  return typeof value === "string" && /^\/(?!\/)[\w\-./?=&%#]*$/.test(value) ? value : "/account";
}
