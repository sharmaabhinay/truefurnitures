import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { COL, fsAdd, fsFindOne, where } from "@/lib/db/firestore";
import { useAuth } from "@/lib/auth/auth-context";
import { formatINR, estimatedDelivery } from "@/lib/format";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";

const Sofa3D = lazy(() => import("@/components/sofa-3d"));

type Sofa = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  base_price: number;
  sale_price: number | null;
  delivery_days: number | null;
  hero_image: string | null;
  model_url: string | null;
  product_options: unknown | null;
};

type SizeVariant = { label: string; price: string; dimensions: string; seating: string };
type FabricVariant = { name: string; priceAdjust: number };
type ColourOption = { label: string; hex: string };
type ProductOptions = {
  sizes?: SizeVariant[];
  fabrics?: FabricVariant[];
  colours?: ColourOption[];
};
type ConfigSize = { key: string; label: string; seats: number; mult: number; sectional: boolean };
type ConfigFabric = { key: string; label: string; up: number };
type ConfigColor = { key: string; label: string; hex: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseProductOptions(value: unknown | null | undefined): ProductOptions {
  return isRecord(value) ? (value as unknown as ProductOptions) : {};
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const sofaQuery = (slug: string) =>
  queryOptions({
    queryKey: ["configure-sofa", slug],
    queryFn: async (): Promise<Sofa | null> => {
      const data = await fsFindOne<Sofa & { is_published?: boolean }>(
        COL.sofas,
        where("slug", "==", slug),
        where("is_published", "==", true),
      );
      return data ?? null;
    },
  });

export const Route = createFileRoute("/configure/$slug")({
  loader: async ({ params, context }) => {
    const data = await context.queryClient.ensureQueryData(sofaQuery(params.slug));
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    const name = loaderData?.name ?? "Sofa";
    const title = `Customize ${name} in 3D — True Furniture's`;
    const desc = `Design your ${name} in real time. Choose fabric, color, size and add-ons — see the price update live.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: ConfigurePage,
});

const COLORS = [
  { key: "sand", label: "Sand", hex: "#d9c9a8" },
  { key: "charcoal", label: "Charcoal", hex: "#2f2f33" },
  { key: "emerald", label: "Emerald", hex: "#22574a" },
  { key: "terracotta", label: "Terracotta", hex: "#b0563a" },
  { key: "ivory", label: "Ivory", hex: "#f0eadb" },
  { key: "midnight", label: "Midnight Blue", hex: "#25384f" },
] as const;

const FABRICS = [
  { key: "boucle", label: "Bouclé", up: 0 },
  { key: "linen", label: "Linen", up: 0 },
  { key: "velvet", label: "Velvet", up: 5000 },
  { key: "leather", label: "Full-grain Leather", up: 12000 },
] as const;

const SIZES = [
  { key: "2-seater", label: "2 Seater", seats: 2, mult: 0.85, sectional: false },
  { key: "3-seater", label: "3 Seater", seats: 3, mult: 1.0, sectional: false },
  { key: "4-seater", label: "4 Seater", seats: 4, mult: 1.2, sectional: false },
  { key: "l-sectional", label: "L-Sectional", seats: 3, mult: 1.45, sectional: true },
] as const;

const ADDONS = [
  { key: "cupHolder", label: "Cup holder", price: 3000 },
  { key: "footrest", label: "Footrest ottoman", price: 5000 },
  { key: "usb", label: "USB charging", price: 2500 },
  { key: "storage", label: "Hidden storage", price: 4000 },
] as const;

type FabricKey = (typeof FABRICS)[number]["key"];
type SizeKey = (typeof SIZES)[number]["key"];
type ColorKey = (typeof COLORS)[number]["key"];
type AddonKey = (typeof ADDONS)[number]["key"];

function getColorOptions(options: ProductOptions): ConfigColor[] {
  if (Array.isArray(options.colours) && options.colours.length > 0) {
    return options.colours
      .filter((c) => typeof c.label === "string" && typeof c.hex === "string" && c.hex.trim())
      .map((c) => ({ key: slugify(c.label || c.hex), label: c.label || c.hex, hex: c.hex }));
  }
  return COLORS.map((c) => ({ ...c }));
}

function getFabricOptions(options: ProductOptions): ConfigFabric[] {
  if (Array.isArray(options.fabrics) && options.fabrics.length > 0) {
    return options.fabrics
      .filter((f) => typeof f.name === "string" && f.name.trim())
      .map((f) => ({ key: slugify(f.name), label: f.name, up: Number(f.priceAdjust) || 0 }));
  }
  return FABRICS.map((f) => ({ ...f }));
}

function getSizeOptions(options: ProductOptions, basePrice: number): ConfigSize[] {
  if (Array.isArray(options.sizes) && options.sizes.length > 0) {
    const safeBase = basePrice > 0 ? basePrice : 1;
    return options.sizes
      .filter((s) => typeof s.label === "string" && s.label.trim())
      .map((s, index) => {
        const price = Number(s.price);
        const label = s.label.trim();
        const seats = Math.max(1, Number.parseInt(s.seating, 10) || Number.parseInt(label, 10) || 3);
        return {
          key: `${slugify(label)}-${index}`,
          label,
          seats,
          mult: price > 0 ? price / safeBase : 1,
          sectional: /sectional|l-shape|chaise/i.test(label),
        };
      });
  }
  return SIZES.map((s) => ({ ...s }));
}

function ConfigurePage() {
  const { slug } = Route.useParams();
  const { data: sofa } = useQuery(sofaQuery(slug));
  const navigate = useNavigate();
  const cart = useCart();
  const { user } = useAuth();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [color, setColor] = useState<string>("sand");
  const [fabric, setFabric] = useState<string>("boucle");
  const [size, setSize] = useState<string>("3-seater");
  const [addons, setAddons] = useState<Record<AddonKey, boolean>>({
    cupHolder: false,
    footrest: false,
    usb: false,
    storage: false,
  });

  const [saveOpen, setSaveOpen] = useState(false);
  const [designName, setDesignName] = useState("");
  const [saving, setSaving] = useState(false);

  const productOptions = useMemo(() => parseProductOptions(sofa?.product_options), [sofa?.product_options]);
  const baseForOptions = Number(sofa?.sale_price ?? sofa?.base_price ?? 0);
  const colorOptions = useMemo(() => getColorOptions(productOptions), [productOptions]);
  const fabricOptions = useMemo(() => getFabricOptions(productOptions), [productOptions]);
  const sizeOptions = useMemo(() => getSizeOptions(productOptions, baseForOptions), [productOptions, baseForOptions]);

  useEffect(() => {
    if (colorOptions.length > 0 && !colorOptions.some((c) => c.key === color)) setColor(colorOptions[0].key);
  }, [color, colorOptions]);

  useEffect(() => {
    if (fabricOptions.length > 0 && !fabricOptions.some((f) => f.key === fabric)) setFabric(fabricOptions[0].key);
  }, [fabric, fabricOptions]);

  useEffect(() => {
    if (sizeOptions.length > 0 && !sizeOptions.some((s) => s.key === size)) setSize(sizeOptions[0].key);
  }, [size, sizeOptions]);

  const colorDef = colorOptions.find((c) => c.key === color) ?? colorOptions[0] ?? COLORS[0];
  const fabricDef = fabricOptions.find((f) => f.key === fabric) ?? fabricOptions[0] ?? FABRICS[0];
  const sizeDef = sizeOptions.find((s) => s.key === size) ?? sizeOptions[0] ?? SIZES[1];

  const price = useMemo(() => {
    if (!sofa) return 0;
    const base = Number(sofa.sale_price ?? sofa.base_price);
    const sized = Math.round(base * sizeDef.mult);
    const fab = fabricDef.up;
    const add = ADDONS.reduce((n, a) => n + (addons[a.key] ? a.price : 0), 0);
    return sized + fab + add;
  }, [sofa, sizeDef, fabricDef, addons]);

  const deposit = Math.round(price * 0.2);
  const eta = estimatedDelivery(sofa?.delivery_days ?? 30);

  if (!sofa) return null;

  const addonList = ADDONS.filter((a) => addons[a.key]).map((a) => a.label);

  const openSaveModal = () => {
    if (!user) {
      toast.error("Sign in to save designs");
      navigate({ to: "/auth", search: {} as never });
      return;
    }
    setDesignName(`${sofa.name} — ${sizeDef.label}`);
    setSaveOpen(true);
  };

  const saveDesign = async () => {
    const name = designName.trim() || sofa.name;
    const shareToken = crypto.randomUUID();
    setSaving(true);
    try {
      await fsAdd(COL.savedDesigns, {
        user_id: user.uid,
        sofa_id: sofa.id,
        name,
        share_token: shareToken,
        config: {
          colorHex: colorDef.hex,
          seats: sizeDef.seats,
          isSectional: sizeDef.sectional,
          fabric,
          addons,
          price,
          sizeLabel: sizeDef.label,
          colorLabel: colorDef.label,
          fabricLabel: fabricDef.label,
        },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save design");
      return;
    } finally {
      setSaving(false);
    }
    const link = `${window.location.origin}/shared-design/${shareToken}`;
    await navigator.clipboard.writeText(link).catch(() => {});
    setSaveOpen(false);
    toast.success("Design saved! Share link copied to clipboard.");
  };

  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)]">
      <SiteHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 pt-6 text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-dark)]/50">
        <Link to="/">Home</Link> <span className="mx-2">/</span>
        <Link to="/products/$slug" params={{ slug: sofa.slug }}>{sofa.name}</Link> <span className="mx-2">/</span>
        <span className="text-[color:var(--brand-dark)]">Customize</span>
      </div>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-6 md:py-10 grid gap-8 lg:grid-cols-[1.35fr_1fr]">
        {/* 3D Viewer */}
        <div className="animate-fade-up">
          <div className="relative aspect-[4/3] sm:aspect-[16/10] bg-[color:var(--brand-muted)] overflow-hidden border border-[color:var(--brand-dark)]/10">
            {mounted ? (
              <Suspense
                fallback={
                  <div className="w-full h-full flex items-center justify-center text-xs uppercase tracking-widest text-[color:var(--brand-dark)]/50">
                    Loading 3D preview…
                  </div>
                }
              >
                <Sofa3D
                  colorHex={colorDef.hex}
                  seats={sizeDef.seats}
                  isSectional={sizeDef.sectional}
                  fabric={fabric}
                  addons={addons}
                  modelUrl={sofa.model_url}
                />
              </Suspense>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs uppercase tracking-widest text-[color:var(--brand-dark)]/50">
                Preparing 3D preview…
              </div>
            )}
            <div className="absolute bottom-3 left-3 tf-chip bg-white/85 backdrop-blur">
              {sofa.model_url ? "Uploaded 3D model · Drag to rotate" : "Drag to rotate · Scroll to zoom"}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] uppercase tracking-widest text-[color:var(--brand-dark)]/60">
            <div className="bg-white border border-[color:var(--brand-dark)]/10 p-3"><div className="text-[color:var(--brand-dark)]/40">Size</div><div className="mt-1 font-bold text-[color:var(--brand-dark)]">{sizeDef.label}</div></div>
            <div className="bg-white border border-[color:var(--brand-dark)]/10 p-3"><div className="text-[color:var(--brand-dark)]/40">Fabric</div><div className="mt-1 font-bold text-[color:var(--brand-dark)]">{fabricDef.label}</div></div>
            <div className="bg-white border border-[color:var(--brand-dark)]/10 p-3"><div className="text-[color:var(--brand-dark)]/40">Color</div><div className="mt-1 font-bold text-[color:var(--brand-dark)]">{colorDef.label}</div></div>
            <div className="bg-white border border-[color:var(--brand-dark)]/10 p-3"><div className="text-[color:var(--brand-dark)]/40">Add-ons</div><div className="mt-1 font-bold text-[color:var(--brand-dark)]">{addonList.length || "None"}</div></div>
          </div>
        </div>

        {/* Controls */}
        <div className="animate-fade-up delay-100">
          <span className="tf-chip mb-4">Build Yours</span>
          <h1 className="text-3xl sm:text-4xl font-display mt-3 mb-2 text-balance">Customize the {sofa.name}</h1>
          <p className="text-sm text-[color:var(--brand-dark)]/60 mb-8">{sofa.tagline ?? "Every choice reflects instantly. The price updates as you go."}</p>

          {/* Size */}
          <div className="mb-8">
            <p className="text-[10px] font-black uppercase tracking-widest mb-3">Size</p>
            <div className="grid grid-cols-2 gap-2">
              {sizeOptions.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSize(s.key)}
                  className={`px-3 py-3 text-xs font-bold uppercase tracking-widest border transition ${size === s.key ? "border-[color:var(--brand-dark)] bg-[color:var(--brand-dark)] text-white" : "border-[color:var(--brand-dark)]/15 hover:border-[color:var(--brand-dark)]/40"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fabric */}
          <div className="mb-8">
            <p className="text-[10px] font-black uppercase tracking-widest mb-3">Fabric</p>
            <div className="grid grid-cols-2 gap-2">
              {fabricOptions.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFabric(f.key)}
                  className={`px-3 py-3 text-left border transition ${fabric === f.key ? "border-[color:var(--brand-dark)] bg-[color:var(--brand-dark)] text-white" : "border-[color:var(--brand-dark)]/15 hover:border-[color:var(--brand-dark)]/40"}`}
                >
                  <div className="text-xs font-bold uppercase tracking-widest">{f.label}</div>
                  <div className={`text-[10px] mt-1 ${fabric === f.key ? "text-white/70" : "text-[color:var(--brand-dark)]/50"}`}>{f.up ? `+ ${formatINR(f.up)}` : "Included"}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="mb-8">
            <p className="text-[10px] font-black uppercase tracking-widest mb-3">Color</p>
            <div className="flex flex-wrap gap-3">
              {colorOptions.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setColor(c.key)}
                  aria-label={c.label}
                  title={c.label}
                  className={`relative size-11 rounded-full border-2 transition-transform hover:scale-110 ${color === c.key ? "border-[color:var(--brand-dark)] scale-110" : "border-[color:var(--brand-dark)]/15"}`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
            <p className="text-xs text-[color:var(--brand-dark)]/50 mt-3">{colorDef.label}</p>
          </div>

          {/* Add-ons */}
          <div className="mb-8">
            <p className="text-[10px] font-black uppercase tracking-widest mb-3">Add-ons</p>
            <div className="space-y-2">
              {ADDONS.map((a) => (
                <label
                  key={a.key}
                  className={`flex items-center justify-between gap-3 px-4 py-3 border cursor-pointer transition ${addons[a.key] ? "border-[color:var(--brand-dark)] bg-[color:var(--brand-muted)]/40" : "border-[color:var(--brand-dark)]/15 hover:border-[color:var(--brand-dark)]/40"}`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={addons[a.key]}
                      onChange={(e) => setAddons((cur) => ({ ...cur, [a.key]: e.target.checked }))}
                      className="size-4 accent-[color:var(--brand-dark)]"
                    />
                    <span className="text-sm">{a.label}</span>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-[color:var(--brand-dark)]/60">+ {formatINR(a.price)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price summary */}
          <div className="border border-[color:var(--brand-dark)]/10 bg-white p-5 mb-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[color:var(--brand-dark)]/50">Live Total</span>
              <span className="font-display text-3xl transition-all">{formatINR(price)}</span>
            </div>
            <div className="flex justify-between text-xs mt-3 text-[color:var(--brand-dark)]/60">
              <span>Deposit today (20%)</span>
              <span className="font-bold text-[color:var(--brand-dark)]">{formatINR(deposit)}</span>
            </div>
            <div className="flex justify-between text-xs mt-1 text-[color:var(--brand-dark)]/60">
              <span>Balance on delivery</span>
              <span>{formatINR(price - deposit)}</span>
            </div>
            <div className="flex justify-between text-xs mt-1 text-[color:var(--brand-dark)]/60">
              <span>Expected delivery</span>
              <span>By {eta}</span>
            </div>
          </div>

          <button
            onClick={() => {
              cart.add({
                sofaId: sofa.id,
                slug: sofa.slug,
                name: sofa.name,
                image: sofa.hero_image ?? "",
                unitPrice: price,
                fabric,
                size: sizeDef.label,
                color: colorDef.label,
                colorHex: colorDef.hex,
                addons: addonList,
              });
              toast.success(`${sofa.name} (${sizeDef.label}, ${colorDef.label}) added to cart`);
              navigate({ to: "/cart" });
            }}
            className="w-full px-6 py-4 bg-[color:var(--brand-dark)] text-white text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors"
          >
            Add Configuration to Cart · Deposit {formatINR(deposit)}
          </button>
          <button
            onClick={saveDesign}
            className="mt-3 w-full px-6 py-3 border border-[color:var(--brand-dark)] text-[color:var(--brand-dark)] text-[10px] font-bold uppercase tracking-widest hover:bg-[color:var(--brand-dark)] hover:text-white transition-colors"
          >
            Save &amp; Share Design
          </button>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}