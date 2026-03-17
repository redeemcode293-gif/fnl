import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search, Zap, RefreshCw, ShoppingCart, Loader2,
  Globe, Crown, TrendingUp, ChevronDown, ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PLATFORMS, getPlatformIcon, getPlatformColor } from "@/components/ui/platform-icons";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useRegionalPricing } from "@/hooks/useRegionalPricing";

interface ServiceDisplay {
  id: string;
  service_id: number;
  name: string;
  description: string | null;
  platform: string;
  category: string;
  price: number;
  min_quantity: number;
  max_quantity: number;
  refill_supported: boolean | null;
  dripfeed_supported: boolean | null;
}

const extractRefillDays = (name: string): number | null => {
  const m = name.match(/(\d+)\s*(?:days?|d)\s*refill/i);
  return m ? parseInt(m[1]) : null;
};

const getServiceTier = (s: ServiceDisplay): "budget" | "standard" | "premium" | "monetization" => {
  const n = s.name.toLowerCase();
  if (n.includes("monetization") || n.includes("monetizable")) return "monetization";
  if (n.includes("premium") || n.includes("authority") || n.includes("high quality")) return "premium";
  if (n.includes("starter") || n.includes("cheap") || n.includes("budget")) return "budget";
  return "standard";
};

const Services = () => {
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [services, setServices] = useState<ServiceDisplay[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { t, formatPrice } = useLocalization();
  const { multiplier: priceMultiplier, loading: loadingPricing } = useRegionalPricing();

  useEffect(() => { fetchServices(); }, []);

  const fetchServices = async () => {
    try {
      const allData: ServiceDisplay[] = [];
      let page = 0;
      while (true) {
        const { data, error } = await supabase
          .from("panel_services")
          .select("*")
          .eq("is_visible", true)
          .order("platform").order("category").order("price", { ascending: true })
          .range(page * 1000, (page + 1) * 1000 - 1);
        if (error || !data || data.length === 0) break;
        allData.push(...data);
        if (data.length < 1000) break;
        page++;
      }

      if (allData.length > 0) {
        setServices(allData);
        setLoadingServices(false);
        return;
      }

      // Fallback: services table
      const allSvc: ServiceDisplay[] = [];
      let p2 = 0;
      while (true) {
        const { data, error } = await supabase
          .from("services")
          .select("id, service_id, name, description, platform, category, base_price, min_quantity, max_quantity, refill_supported, dripfeed_supported")
          .eq("is_active", true)
          .order("platform").order("category").order("base_price", { ascending: true })
          .range(p2 * 1000, (p2 + 1) * 1000 - 1);
        if (error || !data || data.length === 0) break;
        allSvc.push(...data.map(s => ({ ...s, price: s.base_price })));
        if (data.length < 1000) break;
        p2++;
      }
      setServices(allSvc);
    } catch (e) {
      console.error("Services fetch error:", e);
    } finally {
      setLoadingServices(false);
    }
  };

  const filtered = services.filter(s => {
    const matchPlat = selectedPlatform === "all" || s.platform === selectedPlatform;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      s.name.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.service_id.toString().includes(q) ||
      (s.description || "").toLowerCase().includes(q);
    return matchPlat && matchSearch;
  });

  // Group: platform → category → services
  const grouped = filtered.reduce((acc, s) => {
    if (!acc[s.platform]) acc[s.platform] = {};
    if (!acc[s.platform][s.category]) acc[s.platform][s.category] = [];
    acc[s.platform][s.category].push(s);
    return acc;
  }, {} as Record<string, Record<string, ServiceDisplay[]>>);

  const availablePlatforms = [...new Set(services.map(s => s.platform))];
  const displayPlatforms = PLATFORMS.filter(p => p.id === "all" || availablePlatforms.includes(p.id));
  const isLoading = loadingServices || loadingPricing;

  const toggleCategory = (key: string) => {
    const n = new Set(expandedCategories);
    n.has(key) ? n.delete(key) : n.add(key);
    setExpandedCategories(n);
  };

  const ServiceCard = ({ service }: { service: ServiceDisplay }) => {
    const pricePerK = Number(service.price) * priceMultiplier;
    const refillDays = extractRefillDays(service.name);
    const tier = getServiceTier(service);
    const Icon = getPlatformIcon(service.platform);
    const colorClass = getPlatformColor(service.platform);

    return (
      <Card className="group hover:border-primary/30 transition-all duration-200 relative overflow-hidden bg-card/60 backdrop-blur-sm border-border/30">
        {tier === "monetization" && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-xs gap-1">
              <Crown className="h-2.5 w-2.5" />{t("Monetization")}
            </Badge>
          </div>
        )}
        {tier === "premium" && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs gap-1">
              <TrendingUp className="h-2.5 w-2.5" />{t("Premium")}
            </Badge>
          </div>
        )}
        <CardHeader className="pb-2 pt-4">
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${colorClass} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0 pr-12">
              <CardTitle className="text-sm font-medium line-clamp-2 leading-tight">{service.name}</CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">ID: {service.service_id}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-primary" />{t("Fast delivery")}</span>
            {(service.refill_supported || refillDays) && (
              <span className="flex items-center gap-1 text-emerald-500">
                <RefreshCw className="h-3 w-3" />{refillDays ? `${refillDays}d` : t("Refill")}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-border/30 pt-2">
            <div>
              <p className="text-lg font-bold text-primary leading-tight">
                {formatPrice(pricePerK)}<span className="text-[11px] text-muted-foreground font-normal">/1K</span>
              </p>
              <p className="text-[10px] text-muted-foreground">
                {service.min_quantity.toLocaleString()}–{service.max_quantity.toLocaleString()}
              </p>
            </div>
            <Button
              size="sm"
              className="h-7 text-xs px-3"
              onClick={() => navigate("/dashboard/order")}
            >
              <ShoppingCart className="h-3.5 w-3.5 mr-1" />{t("Order")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-10">
            <Badge variant="glow" className="mb-4">{t("SERVICES CATALOG")}</Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              <span className="text-foreground">{t("Premium")}</span>
              <span className="text-gradient-cyan"> {t("Growth Services")}</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("Discover our comprehensive range of social media growth solutions")}
            </p>
          </div>

          {/* Search + platform filter */}
          <div className="flex flex-col gap-4 mb-8 max-w-4xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("Search by name, ID, or category…")}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/30 border-border/40"
              />
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {displayPlatforms.map(platform => {
                const Icon = platform.icon;
                const isActive = selectedPlatform === platform.id;
                return (
                  <Button
                    key={platform.id}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPlatform(platform.id)}
                    className={`flex items-center gap-1.5 text-xs border-border/40 ${isActive ? "" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center ${platform.id !== "all" ? `bg-gradient-to-br ${getPlatformColor(platform.id)}` : ""}`}>
                      <Icon className={`h-2.5 w-2.5 ${platform.id !== "all" ? "text-white" : ""}`} />
                    </div>
                    {t(platform.name)}
                    {platform.id !== "all" && availablePlatforms.includes(platform.id) && (
                      <span className="text-[10px] opacity-60">
                        ({services.filter(s => s.platform === platform.id).length})
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
              <span className="text-muted-foreground">{t("Loading services…")}</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
              <p className="text-muted-foreground text-lg">
                {services.length === 0
                  ? t("No services available yet. Check back soon.")
                  : t("No services match your search.")}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([platform, categories]) => {
                const PlatIcon = getPlatformIcon(platform);
                const platColor = getPlatformColor(platform);
                const totalCount = Object.values(categories).flat().length;

                return (
                  <div key={platform}>
                    {/* Platform header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${platColor} flex items-center justify-center shadow-md`}>
                        <PlatIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-display font-bold text-foreground">{platform}</h2>
                        <p className="text-xs text-muted-foreground">{totalCount} {t("services")}</p>
                      </div>
                    </div>

                    {/* Categories within platform */}
                    <div className="space-y-4 ml-0 md:ml-2">
                      {Object.entries(categories).sort(([a], [b]) => a.localeCompare(b)).map(([category, svcs]) => {
                        const catKey = `${platform}::${category}`;
                        const isExpanded = expandedCategories.has(catKey);

                        return (
                          <div key={catKey} className="border border-border/20 rounded-xl overflow-hidden">
                            {/* Category header — clickable */}
                            <button
                              type="button"
                              className="w-full flex items-center gap-3 px-4 py-3 bg-secondary/20 hover:bg-secondary/30 transition-colors text-left"
                              onClick={() => toggleCategory(catKey)}
                            >
                              {isExpanded
                                ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                              <span className="font-medium text-sm flex-1">{category}</span>
                              <Badge variant="outline" className="text-xs font-mono shrink-0">{svcs.length}</Badge>
                              <span className="text-xs text-muted-foreground ml-2">
                                from {formatPrice(Math.min(...svcs.map(s => s.price)) * priceMultiplier)}/1K
                              </span>
                            </button>

                            {/* Services grid — shown when expanded */}
                            {isExpanded && (
                              <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 bg-card/20">
                                {svcs.map(svc => (
                                  <ServiceCard key={svc.id} service={svc} />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Stats footer */}
          {!isLoading && filtered.length > 0 && (
            <p className="text-center text-xs text-muted-foreground mt-8">
              {filtered.length.toLocaleString()} {t("services across")} {Object.keys(grouped).length} {t("platforms")}
            </p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Services;
