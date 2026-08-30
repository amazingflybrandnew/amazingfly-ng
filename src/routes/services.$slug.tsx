import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { ServicePage } from "@/components/ServicePage";
import { Button } from "@/components/ui/button";
import { getService, PAUSED_PUBLIC_SERVICE_SLUGS } from "@/data/services";

export const Route = createFileRoute("/services/$slug")({
  beforeLoad: ({ params }) => {
    if (PAUSED_PUBLIC_SERVICE_SLUGS.has(params.slug)) {
      throw redirect({ to: "/services/$slug", params: { slug: "visa-assistance" } });
    }
  },
  loader: ({ params }) => {
    const service = getService(params.slug);
    if (!service) throw notFound();
    return { name: service.name, shortDescription: service.shortDescription };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Service not found | Amazingfly.ng" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = `${loaderData.name} | Amazingfly.ng`;
    return {
      meta: [
        { title },
        { name: "description", content: loaderData.shortDescription },
        { property: "og:title", content: title },
        { property: "og:description", content: loaderData.shortDescription },
        { property: "og:url", content: `/services/${params.slug}` },
      ],
      links: [{ rel: "canonical", href: `/services/${params.slug}` }],
    };
  },
  notFoundComponent: ServiceNotFound,
  component: ServiceRoute,
});

function ServiceNotFound() {
  return (
    <div className="container-page section-y text-center">
      <h1 className="text-3xl font-extrabold">Service not found</h1>
      <p className="mt-3 text-muted-foreground">
        That service is not available on Amazingfly.ng. Browse our full list of travel services.
      </p>
      <Button asChild className="mt-6">
        <Link to="/services">View all services</Link>
      </Button>
    </div>
  );
}

function ServiceRoute() {
  const { slug } = Route.useParams();
  const service = getService(slug);
  if (!service) return <ServiceNotFound />;
  return <ServicePage service={service} />;
}
