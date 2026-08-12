import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { WelcomeModal } from "@/components/welcome-modal";
import { VisitorTrackerBoot } from "@/components/visitor-tracker-boot";
import { CartProvider } from "@/lib/cart";
import { AuthProvider } from "@/lib/auth/auth-context";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "True Furniture's — Fully Customizable Furniture | Indore & Ujjain" },
      { name: "description", content: "Fully customizable sofas designed in 3D. Choose fabric, colour, size and finish — hand-tailored in Indore & Ujjain." },
      { name: "author", content: "True Furniture's" },
      { property: "og:title", content: "True Furniture's — Fully Customizable Furniture | Indore & Ujjain" },
      { property: "og:description", content: "Fully customizable sofas designed in 3D. Choose fabric, colour, size and finish — hand-tailored in Indore & Ujjain." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "True Furniture's" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "True Furniture's — Fully Customizable Furniture | Indore & Ujjain" },
      { name: "twitter:description", content: "Fully customizable sofas designed in 3D. Choose fabric, colour, size and finish — hand-tailored in Indore & Ujjain." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/7d119877-9591-40df-ad3e-2a1e79310fe5" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/7d119877-9591-40df-ad3e-2a1e79310fe5" },
    ],
      links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      // Prefer a modern PNG favicon if present (place your image at public/media/favicon.png)
      { rel: "icon", href: "/media/favicon.png", type: "image/png" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FurnitureStore",
          name: "True Furniture's",
          slogan: "Fully Customizable Furniture",
          description:
            "True Furniture's — fully customizable sofas designed in 3D. Hand-tailored in Indore & Ujjain.",
          telephone: "+91 77738 96496",
          email: "hello@truefurnitures.in",
          areaServed: ["Indore", "Ujjain"],
          address: {
            "@type": "PostalAddress",
            streetAddress: "Vijay Nagar",
            addressLocality: "Indore",
            addressRegion: "Madhya Pradesh",
            postalCode: "452010",
            addressCountry: "IN",
          },
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
       <CartProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
            <VisitorTrackerBoot />
            <WelcomeModal />
        <Toaster position="top-center" richColors />
       </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
