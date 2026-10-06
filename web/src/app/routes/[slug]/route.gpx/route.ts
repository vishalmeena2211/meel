import { getIndex, getRoute } from "@/lib/content";
import { routeGpx } from "@/lib/route-file";

// The route as a file for the rider's own map app. Built with the site; a route's line changes only when it is built again.
export const dynamic = "force-static";

export async function generateStaticParams() {
  const index = await getIndex();
  return index.routes.filter((r) => r.has_line).map((r) => ({ slug: r.slug }));
}

export async function GET(_request: Request, context: RouteContext<"/routes/[slug]/route.gpx">) {
  const { slug } = await context.params;
  const route = await getRoute(slug);
  if (!route || route.line.length === 0) return new Response("No route file for this route.", { status: 404 });
  return new Response(routeGpx(route), {
    headers: {
      "Content-Type": "application/gpx+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${route.slug}.gpx"`,
    },
  });
}
