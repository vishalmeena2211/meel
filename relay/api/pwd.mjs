// Fetches one part of Uttarakhand PWD's list of closed roads from Mumbai, for rideplanner.in, whose own servers
// the PWD's site turns away. It asks for nothing else.
const PWD = "https://mis.pwduk.in/pwd/roadClosure";
const UA = "Meel rider site (+https://rideplanner.in)";

export async function GET(request) {
  const type = new URL(request.url).searchParams.get("roadType");
  if (!["1", "2", "3"].includes(type ?? "")) {
    return new Response("Ask for roadType 1, 2 or 3.", { status: 400 });
  }
  const region = process.env.VERCEL_REGION ?? "";
  try {
    const res = await fetch(`${PWD}?roadType=${type}&department=all`, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(25_000),
    });
    const body = await res.text();
    return new Response(body, {
      status: res.ok ? 200 : 502,
      headers: {
        "content-type": "text/html; charset=utf-8",
        // The CDN keeps an answer for 15 minutes, so the PWD is asked at most a few times an hour.
        "cache-control": res.ok ? "public, s-maxage=900, stale-while-revalidate=600" : "no-store",
        "x-relay-region": region,
        "x-pwd-status": String(res.status),
      },
    });
  } catch (e) {
    return new Response(`The PWD did not answer: ${e?.name ?? "error"}`, {
      status: 504,
      headers: { "cache-control": "no-store", "x-relay-region": region },
    });
  }
}
