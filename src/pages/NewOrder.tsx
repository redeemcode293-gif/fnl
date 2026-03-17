import { useState, useEffect, useRef, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ShoppingCart, Link as LinkIcon, Hash, Zap, RefreshCw,
  Clock, FileText, Search, Wallet, Loader2, ChevronRight, ChevronDown, X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useRegionalPricing } from "@/hooks/useRegionalPricing";

const PLATFORM_ICONS: Record<string, string> = {
  Instagram: "📷", YouTube: "▶️", TikTok: "🎵", Telegram: "✈️",
  X: "✖️", Facebook: "👤", Spotify: "🎧", Discord: "💬",
  Twitch: "🟣", Snapchat: "👻", WhatsApp: "💚", Threads: "🧵",
  LinkedIn: "💼", Pinterest: "📌", Reddit: "🤖", Apple: "🍎", Other: "🌐"
};

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
  provider_service_uuid?: string | null;
}

const NewOrder = () => {
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [selectedService, setSelectedService] = useState<ServiceDisplay | null>(null);
  const [services, setServices] = useState<ServiceDisplay[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [link, setLink] = useState("");
  const [quantity, setQuantity] = useState("");
  const [dripFeed, setDripFeed] = useState(false);
  const [dripFeedInterval, setDripFeedInterval] = useState("");
  const [autoRefill, setAutoRefill] = useState(false);
  const [massOrderText, setMassOrderText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);
  const [dropOpen, setDropOpen] = useState(false);
  const [expandedPlatforms, setExpandedPlatforms] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const { user, profile, wallet, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { t, formatPrice } = useLocalization();
  const { multiplier: priceMultiplier, loading: loadingPricing, countryCode } = useRegionalPricing();

  // Close dropdown on outside click — but NOT when clicking inside the container
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { fetchServices(); }, []);

  // Pre-select service from chatbot "Buy Now" click
  useEffect(() => {
    if (services.length === 0) return;
    const stored = sessionStorage.getItem("chatbot_selected_service");
    if (stored) {
      try {
        const { id } = JSON.parse(stored);
        const svc = services.find(s => s.id === id);
        if (svc) {
          setSelectedService(svc);
          setDropOpen(false);
        }
      } catch {}
      sessionStorage.removeItem("chatbot_selected_service");
    }
  }, [services]);

  // Auto-open drop and expand all when searching
  useEffect(() => {
    if (searchQuery.trim()) {
      setDropOpen(true);
    }
  }, [searchQuery]);

  const fetchServices = async () => {
    setLoadingServices(true);
    try {
      // Paginate to get ALL services (bypass Supabase 1000-row default)
      const allData: ServiceDisplay[] = [];
      let page = 0;
      while (true) {
        const { data, error } = await supabase
          .from("panel_services")
          .select("*")
          .eq("is_visible", true)
          .order("platform").order("category").order("name")
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

      // Fallback to services table
      const allSvc: ServiceDisplay[] = [];
      let svcPage = 0;
      while (true) {
        const { data, error } = await supabase
          .from("services")
          .select("id, service_id, name, description, platform, category, base_price, min_quantity, max_quantity, refill_supported, dripfeed_supported")
          .eq("is_active", true)
          .order("platform").order("category").order("name")
          .range(svcPage * 1000, (svcPage + 1) * 1000 - 1);
        if (error || !data || data.length === 0) break;
        allSvc.push(...data.map(s => ({
          id: s.id, service_id: s.service_id, name: s.name, description: s.description,
          platform: s.platform, category: s.category, price: s.base_price,
          min_quantity: s.min_quantity, max_quantity: s.max_quantity,
          refill_supported: s.refill_supported, dripfeed_supported: s.dripfeed_supported,
          provider_service_uuid: null,
        })));
        if (data.length < 1000) break;
        svcPage++;
      }
      setServices(allSvc);
    } finally {
      setLoadingServices(false);
    }
  };

  const isLoading = loadingServices || loadingPricing;

  // Filter by platform + search query
  const filteredServices = services.filter(s => {
    const matchPlat = selectedPlatform === "all" || s.platform === selectedPlatform;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch = !q ||
      s.name.toLowerCase().includes(q) ||
      s.service_id.toString().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.platform.toLowerCase().includes(q) ||
      (s.description || "").toLowerCase().includes(q);
    return matchPlat && matchSearch;
  });

  // Group: platform → category → services
  const grouped = filteredServices.reduce((acc, s) => {
    if (!acc[s.platform]) acc[s.platform] = {};
    if (!acc[s.platform][s.category]) acc[s.platform][s.category] = [];
    acc[s.platform][s.category].push(s);
    return acc;
  }, {} as Record<string, Record<string, ServiceDisplay[]>>);

  // Platform stats (from ALL services, not filtered)
  const platformCounts = services.reduce((acc, s) => {
    acc[s.platform] = (acc[s.platform] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const activePlatforms = Object.keys(platformCounts).sort();

  const togglePlatformExpand = (p: string) => {
    const n = new Set(expandedPlatforms);
    n.has(p) ? n.delete(p) : n.add(p);
    setExpandedPlatforms(n);
  };
  const toggleCategoryExpand = (key: string) => {
    const n = new Set(expandedCategories);
    n.has(key) ? n.delete(key) : n.add(key);
    setExpandedCategories(n);
  };

  const calcDisplayPrice = (base: number) => Number(base) * priceMultiplier;
  const calcTotal = () => {
    if (!selectedService || !quantity) return 0;
    return (calcDisplayPrice(selectedService.price) * (parseInt(quantity) || 0)) / 1000;
  };

  const deductWallet = async (userId: string, amount: number) => {
    const { error } = await supabase
      .from("wallets")
      .update({ balance: Number(wallet?.balance || 0) - amount })
      .eq("user_id", userId);
    return error;
  };

  const handleOrder = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!selectedService || !link.trim() || !quantity) {
      toast({ title: t("Missing Information"), description: t("Select a service, enter link and quantity."), variant: "destructive" });
      return;
    }
    const qty = parseInt(quantity) || 0;
    if (qty < selectedService.min_quantity || qty > selectedService.max_quantity) {
      toast({ title: t("Invalid Quantity"), description: `Min: ${selectedService.min_quantity.toLocaleString()} · Max: ${selectedService.max_quantity.toLocaleString()}`, variant: "destructive" });
      return;
    }
    const total = calcTotal();
    if (total > Number(wallet?.balance || 0)) {
      toast({ title: t("Insufficient Balance"), description: `Need ${formatPrice(total)}, have ${formatPrice(Number(wallet?.balance || 0))}`, variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const orderNum = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const { data: order, error } = await supabase.from("orders").insert({
        user_id: user.id,
        service_id: selectedService.provider_service_uuid || selectedService.id,
        link: link.trim(), quantity: qty, price: total, status: "pending",
        order_number: orderNum,
        dripfeed: dripFeed,
        dripfeed_interval: dripFeed ? parseInt(dripFeedInterval) || 60 : null,
        auto_refill: autoRefill,
        applied_multiplier: priceMultiplier,
        user_country_code: countryCode || profile?.country_code || null,
      }).select().single();
      if (error) throw error;

      await deductWallet(user.id, total);
      await supabase.from("transactions").insert({
        user_id: user.id, type: "order", amount: -total, status: "completed",
        description: `Order #${order.order_number} – ${selectedService.name}`,
        reference_id: order.id,
      });

      // Submit to provider in background
      supabase.functions.invoke("process-order", { body: { orderId: order.id } }).catch(() => {});

      await refreshProfile();
      toast({ title: t("Order Placed!"), description: `#${order.order_number} submitted.` });
      setLink(""); setQuantity(""); setSelectedService(null); setDripFeed(false); setAutoRefill(false);
      navigate("/dashboard/orders");
    } catch (err: any) {
      toast({ title: t("Order Failed"), description: err.message, variant: "destructive" });
    } finally { setIsSubmitting(false); }
  };

  const handleMassOrder = async () => {
    if (!massOrderText.trim()) { toast({ title: t("No Orders"), variant: "destructive" }); return; }
    if (!user) { navigate("/auth"); return; }
    setIsSubmitting(true);

    const lines = massOrderText.trim().split("\n").filter(l => l.trim());
    const parsed: { service: ServiceDisplay; link: string; qty: number; price: number }[] = [];
    let totalCost = 0;

    for (const line of lines) {
      const parts = line.split("|").map(p => p.trim());
      if (parts.length < 3) continue;
      const svc = services.find(s => s.service_id.toString() === parts[0]);
      if (svc) {
        const qty = parseInt(parts[2]);
        const price = (calcDisplayPrice(svc.price) * qty) / 1000;
        totalCost += price;
        parsed.push({ service: svc, link: parts[1], qty, price });
      }
    }

    if (totalCost > Number(wallet?.balance || 0)) {
      toast({ title: t("Insufficient Balance"), description: `Total: ${formatPrice(totalCost)}`, variant: "destructive" });
      setIsSubmitting(false); return;
    }

    let success = 0, failed = 0;
    for (const { service, link: ol, qty, price } of parsed) {
      try {
        const { data: order } = await supabase.from("orders").insert({
          user_id: user.id,
          service_id: service.provider_service_uuid || service.id,
          link: ol, quantity: qty, price, status: "pending",
          order_number: `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          applied_multiplier: priceMultiplier,
          user_country_code: countryCode || profile?.country_code || null,
        }).select().single();
        if (order) {
          await deductWallet(user.id, price);
          supabase.functions.invoke("process-order", { body: { orderId: order.id } }).catch(() => {});
          success++;
        } else failed++;
      } catch { failed++; }
    }

    await refreshProfile();
    toast({ title: t("Mass Order Done"), description: `${success} placed${failed > 0 ? `, ${failed} failed` : ""}` });
    setMassOrderText(""); setIsSubmitting(false);
  };

  const selectService = (svc: ServiceDisplay) => {
    setSelectedService(svc);
    setDropOpen(false);
    setSearchQuery("");
  };

  return (
    <DashboardLayout title={t("New Order")} subtitle={t("Place single or bulk orders")}>
      <div className="grid lg:grid-cols-3 gap-6 animate-fade-in">
        {/* ── Left: order form ── */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="single" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-secondary/30 p-1 h-11">
              <TabsTrigger value="single" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-9">
                <ShoppingCart className="h-4 w-4 mr-2" />{t("Single Order")}
              </TabsTrigger>
              <TabsTrigger value="mass" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-9">
                <FileText className="h-4 w-4 mr-2" />{t("Mass Order")}
              </TabsTrigger>
            </TabsList>

            {/* ── Single Order ── */}
            <TabsContent value="single" className="mt-6">
              <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-display">{t("Select Service")}</CardTitle>
                  <CardDescription>{t("Search by name, ID, or category")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">

                  {/* Platform filter pills — only platforms that have services */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedPlatform("all")}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedPlatform === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border/40 text-muted-foreground hover:border-primary/40"}`}
                    >
                      🌐 All ({services.length})
                    </button>
                    {activePlatforms.map(p => (
                      <button
                        key={p}
                        onClick={() => setSelectedPlatform(p)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedPlatform === p ? "bg-primary text-primary-foreground border-primary" : "border-border/40 text-muted-foreground hover:border-primary/40"}`}
                      >
                        {PLATFORM_ICONS[p] || "🌐"} {p} ({platformCounts[p]})
                      </button>
                    ))}
                  </div>

                  {/* Search + dropdown — all inside one ref div so outside-click works correctly */}
                  <div ref={containerRef} className="relative space-y-2">
                    <Label>{t("Service")}</Label>

                    {/* Search input */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        ref={searchRef}
                        placeholder={t("Search by name, ID, category…")}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        onFocus={() => setDropOpen(true)}
                        className="pl-10 pr-10 bg-secondary/30 border-border/30"
                      />
                      {searchQuery && (
                        <button
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => { setSearchQuery(""); searchRef.current?.focus(); }}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Selected service chip */}
                    {selectedService && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/30 bg-primary/5">
                        <span className="font-mono text-xs text-muted-foreground">[{selectedService.service_id}]</span>
                        <span className="text-sm font-medium flex-1 truncate">{selectedService.name}</span>
                        <span className="text-xs text-primary font-mono shrink-0">{formatPrice(calcDisplayPrice(selectedService.price))}/1K</span>
                        <button onClick={() => setSelectedService(null)} className="text-muted-foreground hover:text-destructive ml-1">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Dropdown */}
                    {dropOpen && !isLoading && (
                      <div className="absolute left-0 right-0 z-50 border border-border/40 rounded-xl bg-card shadow-2xl overflow-hidden">
                        <ScrollArea className="h-[380px]">
                          {filteredServices.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground text-sm">
                              <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                              {services.length === 0 ? t("No services available yet. Ask admin to import services.") : t("No services match your search.")}
                            </div>
                          ) : (
                            Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([platform, categories]) => {
                              const platExpanded = expandedPlatforms.has(platform) || !!searchQuery.trim();
                              const platCount = Object.values(categories).flat().length;
                              return (
                                <div key={platform}>
                                  {/* Platform header */}
                                  <button
                                    type="button"
                                    className="w-full flex items-center gap-2 px-3 py-2.5 bg-secondary/50 hover:bg-secondary/70 transition-colors text-left sticky top-0 z-10 border-b border-border/20"
                                    onClick={() => togglePlatformExpand(platform)}
                                  >
                                    <span>{PLATFORM_ICONS[platform] || "🌐"}</span>
                                    <span className="text-sm font-semibold flex-1">{platform}</span>
                                    <Badge variant="outline" className="text-xs font-mono">{platCount}</Badge>
                                    {platExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                                  </button>

                                  {platExpanded && Object.entries(categories).sort(([a], [b]) => a.localeCompare(b)).map(([category, svcs]) => {
                                    const catKey = `${platform}::${category}`;
                                    const catExpanded = expandedCategories.has(catKey) || !!searchQuery.trim();
                                    return (
                                      <div key={catKey}>
                                        {/* Category sub-header */}
                                        <button
                                          type="button"
                                          className="w-full flex items-center gap-2 px-5 py-2 bg-secondary/20 hover:bg-secondary/30 transition-colors text-left border-b border-border/10"
                                          onClick={() => toggleCategoryExpand(catKey)}
                                        >
                                          <span className="text-xs font-medium text-foreground flex-1">{category}</span>
                                          <span className="text-xs text-muted-foreground font-mono">{svcs.length}</span>
                                          {catExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground/60" /> : <ChevronRight className="h-3 w-3 text-muted-foreground/60" />}
                                        </button>

                                        {catExpanded && svcs.map(svc => (
                                          <button
                                            key={svc.id}
                                            type="button"
                                            className={`w-full flex items-center gap-3 px-7 py-2.5 hover:bg-primary/5 transition-colors text-left border-b border-border/10 last:border-0 ${selectedService?.id === svc.id ? "bg-primary/10" : ""}`}
                                            onClick={() => selectService(svc)}
                                          >
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-1.5">
                                                <span className="font-mono text-[11px] text-muted-foreground/60">[{svc.service_id}]</span>
                                                <span className="text-sm truncate">{svc.name}</span>
                                              </div>
                                              <div className="flex items-center gap-1.5 mt-0.5">
                                                {svc.refill_supported && <span className="text-[10px] text-success border border-success/30 rounded px-1">Refill</span>}
                                                {svc.dripfeed_supported && <span className="text-[10px] text-primary border border-primary/30 rounded px-1">Drip-feed</span>}
                                                <span className="text-[10px] text-muted-foreground">{svc.min_quantity.toLocaleString()}–{svc.max_quantity.toLocaleString()}</span>
                                              </div>
                                            </div>
                                            <span className="text-sm font-medium text-primary font-mono shrink-0">
                                              {formatPrice(calcDisplayPrice(svc.price))}/1K
                                            </span>
                                          </button>
                                        ))}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })
                          )}
                        </ScrollArea>
                        <div className="px-3 py-2 border-t border-border/20 bg-secondary/10 flex justify-between text-xs text-muted-foreground">
                          <span>{filteredServices.length} services</span>
                          <button onClick={() => setDropOpen(false)} className="hover:text-foreground">Close</button>
                        </div>
                      </div>
                    )}

                    {isLoading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground px-3 py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />{t("Loading services…")}
                      </div>
                    )}
                  </div>

                  {/* Selected service info */}
                  {selectedService && (
                    <div className="p-4 rounded-lg bg-secondary/20 border border-border/30 space-y-2 animate-fade-in">
                      {selectedService.description && (
                        <p className="text-sm text-muted-foreground">{selectedService.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="gap-1"><Zap className="h-3 w-3 text-primary" />{t("Fast Delivery")}</Badge>
                        <Badge variant="outline" className="gap-1">
                          <Hash className="h-3 w-3" />
                          {t("Min")}: {selectedService.min_quantity.toLocaleString()} · {t("Max")}: {selectedService.max_quantity.toLocaleString()}
                        </Badge>
                        {selectedService.refill_supported && (
                          <Badge variant="outline" className="gap-1 text-success border-success/30">
                            <RefreshCw className="h-3 w-3" />{t("Refill Protected")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Link */}
                  <div className="space-y-2">
                    <Label htmlFor="link">{t("Link / URL")}</Label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="link" placeholder="https://instagram.com/username" value={link} onChange={e => setLink(e.target.value)} className="pl-10 bg-secondary/30 border-border/30" />
                    </div>
                  </div>

                  {/* Quantity */}
                  <div className="space-y-2">
                    <Label htmlFor="qty">{t("Quantity")}</Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="qty" type="number" placeholder={t("Enter quantity")}
                        value={quantity} onChange={e => setQuantity(e.target.value)}
                        className="pl-10 bg-secondary/30 border-border/30"
                        min={selectedService?.min_quantity || 1}
                        max={selectedService?.max_quantity || 999999}
                      />
                    </div>
                    {selectedService && (
                      <p className="text-xs text-muted-foreground">
                        {t("Min")}: {selectedService.min_quantity.toLocaleString()} · {t("Max")}: {selectedService.max_quantity.toLocaleString()}
                      </p>
                    )}
                  </div>

                  {/* Drip feed */}
                  {selectedService?.dripfeed_supported && (
                    <div className="space-y-3 p-4 rounded-lg bg-secondary/10 border border-border/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>{t("Drip-Feed")}</Label>
                          <p className="text-xs text-muted-foreground">{t("Deliver gradually over time")}</p>
                        </div>
                        <Switch checked={dripFeed} onCheckedChange={setDripFeed} />
                      </div>
                      {dripFeed && (
                        <div className="space-y-2">
                          <Label>{t("Interval (minutes)")}</Label>
                          <Input type="number" placeholder="60" value={dripFeedInterval} onChange={e => setDripFeedInterval(e.target.value)} className="bg-secondary/30 border-border/30" min="1" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Auto-refill */}
                  {selectedService?.refill_supported && (
                    <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/10 border border-border/30">
                      <div>
                        <Label className="flex items-center gap-2"><RefreshCw className="h-4 w-4 text-success" />{t("Auto-Refill")}</Label>
                        <p className="text-xs text-muted-foreground">{t("Automatically refill drops")}</p>
                      </div>
                      <Switch checked={autoRefill} onCheckedChange={setAutoRefill} />
                    </div>
                  )}

                  {/* Submit */}
                  <Button
                    className="w-full h-12 text-base"
                    onClick={handleOrder}
                    disabled={isSubmitting || !selectedService || !link.trim() || !quantity || isLoading}
                  >
                    {isSubmitting
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("Processing…")}</>
                      : <><ShoppingCart className="h-4 w-4 mr-2" />{t("Place Order")} — {formatPrice(calcTotal())}</>}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Mass Order ── */}
            <TabsContent value="mass" className="mt-6">
              <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-display">{t("Mass Order")}</CardTitle>
                  <CardDescription>{t("One order per line: service_id|link|quantity")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder={`service_id|link|quantity\n\nExample:\n123|https://instagram.com/user|1000\n456|https://tiktok.com/@user|500`}
                    value={massOrderText}
                    onChange={e => setMassOrderText(e.target.value)}
                    className="min-h-[200px] bg-secondary/30 border-border/30 font-mono text-sm"
                  />
                  <Button className="w-full" onClick={handleMassOrder} disabled={isSubmitting || !massOrderText.trim()}>
                    {isSubmitting
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("Processing…")}</>
                      : <><FileText className="h-4 w-4 mr-2" />{t("Submit Mass Order")}</>}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* ── Right: summary ── */}
        <div className="space-y-6">
          <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{t("AVAILABLE BALANCE")}</p>
              <p className="text-4xl font-display font-bold text-gradient-cyan">
                {formatPrice(Number(wallet?.balance || 0))}
              </p>
              <Button variant="outline" className="mt-4 border-border/50" onClick={() => navigate("/dashboard/funds")}>
                <Wallet className="h-4 w-4 mr-2" />{t("Add Funds")}
              </Button>
            </CardContent>
          </Card>

          {selectedService && (
            <Card className="border-border/30 bg-card/60 backdrop-blur-sm animate-fade-in">
              <CardContent className="p-5 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground font-mono">#{selectedService.service_id} · {selectedService.platform}</p>
                  <p className="font-semibold text-foreground mt-1 leading-tight">{selectedService.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-lg bg-secondary/20 text-center">
                    <p className="text-xs text-muted-foreground">{t("Min")}</p>
                    <p className="font-medium">{selectedService.min_quantity.toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/20 text-center">
                    <p className="text-xs text-muted-foreground">{t("Max")}</p>
                    <p className="font-medium">{selectedService.max_quantity.toLocaleString()}</p>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{t("Price per 1,000")}</p>
                  <p className="text-3xl font-display font-bold text-primary">
                    {formatPrice(calcDisplayPrice(selectedService.price))}
                  </p>
                </div>
                {quantity && parseInt(quantity) > 0 && (
                  <div className="p-3 rounded-lg bg-secondary/10 border border-border/20 text-center">
                    <p className="text-xs text-muted-foreground">{t("Order Total")}</p>
                    <p className="text-xl font-display font-bold">{formatPrice(calcTotal())}</p>
                    <p className="text-xs text-muted-foreground">{parseInt(quantity).toLocaleString()} units</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("Available Services")}</span>
              <Badge variant="secondary" className="font-mono">
                {isLoading ? "…" : filteredServices.length.toLocaleString()}
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NewOrder;
