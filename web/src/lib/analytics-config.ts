/*
  Which Mixpanel project Meel counts into, and when. Read on the server too (the About page says when counting is on),
  so it holds no browser code.

  The project is "Meel" in Vishal's own Mixpanel organisation, made on 7 October 2026 with its data
  kept in the European Union and its days in India's time. A project token is public by design: every page carries
  it, and it can only send events, never read them. NEXT_PUBLIC_MIXPANEL_TOKEN and NEXT_PUBLIC_MIXPANEL_API_HOST
  point a build at another project instead, such as a test one.
*/

export const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || "";

/** The project keeps its data in the EU, so events go to Mixpanel's EU servers. */
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
