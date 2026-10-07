/*
  Which Mixpanel project Meel counts into, and when. Read on the server too (the About page says when counting is on),
  so it holds no browser code.

  The project's token comes from NEXT_PUBLIC_MIXPANEL_TOKEN, set where the site is hosted. With none set, nothing is
  counted, so a copy of Meel run by someone else never counts into this site's project. A project token is public by
  design: every page carries it, and it can only send events, never read them.
*/

export const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN ?? "";

/** Where the project keeps its data. Meel's project is in the EU; a project made in the US or India sets its own. */
export const MIXPANEL_API_HOST = process.env.NEXT_PUBLIC_MIXPANEL_API_HOST || "https://api-eu.mixpanel.com";

/**
 * Counting happens on the live site only: a production build, and on Vercel only its production deployment, so a
 * preview of a change is not counted. On this machine nothing is sent unless NEXT_PUBLIC_MIXPANEL_IN_DEVELOPMENT=1.
 */
export const ANALYTICS_ON =
  MIXPANEL_TOKEN !== "" &&
  (process.env.NEXT_PUBLIC_MIXPANEL_IN_DEVELOPMENT === "1" ||
    (process.env.NODE_ENV === "production" &&
      (process.env.NEXT_PUBLIC_VERCEL_ENV === undefined || process.env.NEXT_PUBLIC_VERCEL_ENV === "production")));
