import "server-only";

import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { trackOnServer } from "./analytics";
import { checkLogin, riderFromGoogle } from "./riders";


/*
  Who is logged in on this phone, kept by Auth.js in a sealed cookie.

  The cookie carries two things: the rider's id, and the session number the rider had when this phone logged in.
  Every page checks that number against the database (see currentUser in auth.ts). Raising it by one logs the
  rider out on every phone at once, which is how a changed password, a one-time password and Google taking over
  an account all work.

  Settings: AUTH_SECRET always. AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET to offer "Continue with Google"; without
  them the button is not shown. AUTH_URL where the site is hosted. See web/README.md, Settings.
*/

declare module "next-auth" {
  interface Session {
    uid?: string;
    sv?: number;
  }
  interface User {
    sv?: number;
  }
}

/** The email and password do not match, or the account has no password. Which one is never said. */
export class NoMatch extends CredentialsSignin {
  override code = "no-match";
}

/** Too many wrong tries. The code carries how many minutes are left. */
export class Resting extends CredentialsSignin {
  constructor(minutes: number) {
    super();
    this.code = `resting:${minutes}`;
  }
}

export const googleIsOn = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

/** Auth.js's name for the login cookie. On https it carries a __Secure- prefix. */
export const SESSION_COOKIE = "authjs.session-token";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 30 * 86_400 },
  // Anything that goes wrong comes back to the log-in page, which says it in Meel's words.
  pages: { signIn: "/login", error: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(input) {
        const email = typeof input.email === "string" ? input.email : "";
        const password = typeof input.password === "string" ? input.password : "";
        const result = await checkLogin(email, password);
        if (result.ok) return { id: result.userId, sv: result.sessionVersion };
        throw result.reason === "resting" ? new Resting(result.minutes) : new NoMatch();
      },
    }),
    // Google is asked for the rider's name and an email it has checked: the openid, email and profile scopes,
    // which is the provider's default. Nothing else.
    ...(googleIsOn ? [Google] : []),
  ],
  callbacks: {
    signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      return profile?.email_verified === true && typeof profile.email === "string";
    },
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "google" && typeof profile?.email === "string") {
        const rider = await riderFromGoogle({
          googleId: account.providerAccountId,
          email: profile.email,
          name: typeof profile.name === "string" ? profile.name : null,
        });
        token.uid = rider.id;
        token.sv = rider.sessionVersion;
        // A password login is counted by its own action; Google's ends here.
        await trackOnServer("Logged in", { method: "google" });
      } else if (account?.provider === "credentials" && user?.id) {
        token.uid = user.id;
        token.sv = user.sv;
      }
      // Nothing else ever sets these. In particular an update sent from a phone cannot, or a phone that was
      // logged out could set its own number back.
      return token;
    },
    session({ session, token }) {
      // The sealed cookie's contents arrive untyped. Only a string id and a number pass.
      session.uid = typeof token.uid === "string" ? token.uid : undefined;
      session.sv = typeof token.sv === "number" ? token.sv : undefined;
      return session;
    },
  },
  logger: {
    // A wrong password is not an error worth a stack trace in the server's log.
    error(error) {
      if (error instanceof CredentialsSignin) return;
      console.error(error);
    },
  },
});
