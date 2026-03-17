import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw, Search, Download, CheckSquare, Square,
  AlertCircle, ChevronDown, ChevronRight, Zap, Globe, Info, AlertTriangle,
} from "lucide-react";

interface ProviderService {
  service: number | string;
  name: string;
  category: string;
  rate: string | number;
  min: string | number;
  max: string | number;
  refill?: boolean | string | number;
  dripfeed?: boolean | string | number;
  description?: string;
  type?: string;
}

const PLATFORMS = ["Instagram","YouTube","TikTok","Telegram","X","Facebook","Spotify","Discord","Twitch","Snapchat","WhatsApp","Threads","LinkedIn","Pinterest","Reddit","Apple","Other"];

// ── Price helpers ─────────────────────────────────────────────────────────────
const INR_TO_USD = 1 / 84;

/** Parse a price string/number, stripping all currency symbols and commas */
function parseNum(raw: string | number): number {
  if (typeof raw === "number") return isNaN(raw) ? 0 : raw;
  if (!raw) return 0;
  let cleaned = String(raw).replace(/[^0-9,.-]/g, "").trim();
  if (!cleaned) return 0;
  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  if (hasComma && hasDot) {
    if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (hasComma && !hasDot) {
    cleaned = cleaned.replace(",", ".");
  }
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

/** Convert a provider price to USD, handling INR and auto-detection */
function toUSD(raw: string | number, currency: string): number {
  const v = parseNum(raw);
  if (v === 0) return 0;
  const c = (currency || "USD").toUpperCase();
  const normalized = c === "INR" && v > 100000 ? v / 1000 : v;
  if (c === "INR" || c === "₹" || c === "RS") return normalized * INR_TO_USD;
  // Auto-detect: legitimate USD SMM prices are always < $50/1000 units
  if (c === "USD" && normalized > 50) return normalized * INR_TO_USD;
  return normalized;
}

function detectPlatform(cat: string, name: string): string {
  const t = ((cat || "") + " " + (name || "")).toLowerCase();
  if (t.includes("instagram")) return "Instagram";
  if (t.includes("youtube") || /\byt\b/.test(t)) return "YouTube";
  if (t.includes("tiktok") || t.includes("tik tok")) return "TikTok";
  if (t.includes("telegram")) return "Telegram";
  if (t.includes("twitter") || t.includes("tweet") || / x /.test(t)) return "X";
  if (t.includes("facebook") || /\bfb\b/.test(t)) return "Facebook";
  if (t.includes("spotify")) return "Spotify";
  if (t.includes("discord")) return "Discord";
  if (t.includes("twitch")) return "Twitch";
  if (t.includes("snapchat")) return "Snapchat";
  if (t.includes("whatsapp")) return "WhatsApp";
  if (t.includes("threads")) return "Threads";
  if (t.includes("linkedin")) return "LinkedIn";
  if (t.includes("pinterest")) return "Pinterest";
  if (t.includes("reddit")) return "Reddit";
  if (t.includes("apple") || t.includes("itunes") || t.includes("ios")) return "Apple";
  return "Other";
}

export const BulkServiceImport = () => {
  const { toast } = useToast();
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [providerName, setProviderName] = useState("");
  const [providerCurrency, setProviderCurrency] = useState("USD");
  const [services, setServices] = useState<ProviderService[]>([]);
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importStatus, setImportStatus] = useState("");
  const [importStats, setImportStats] = useState({ added: 0, updated: 0, errors: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [marginPercent, setMarginPercent] = useState("30");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // ── Fetch provider services via edge function (avoids CORS) ──────────────
  const fetchServices = async () => {
    if (!apiUrl.trim() || !apiKey.trim()) {
      toast({ title: "Enter API URL and Key first", variant: "destructive" });
      return;
    }
    setLoading(true);
    setServices([]);
    setSelected(new Set());
    setImportStats({ added: 0, updated: 0, errors: 0 });

    try {
      const { data, error } = await supabase.functions.invoke("sync-provider", {
        body: {
          action: "fetch-preview",
          apiUrl: apiUrl.trim().replace(/\/$/, ""),
          apiKey: apiKey.trim(),
        },
      });

      if (error) throw new Error(error.message || "Edge function error");
      if (!Array.isArray(data?.services)) {
        throw new Error(data?.error || `Expected array of services, got: ${typeof data?.services}`);
      }

      const fetched: ProviderService[] = data.services;
      setServices(fetched);

      // Auto-detect INR currency
      if (fetched.length > 0) {
        const sampleRates = fetched.slice(0, 10).map(s => parseNum(s.rate)).filter(v => v > 0);
        const avgRate = sampleRates.reduce((a, b) => a + b, 0) / (sampleRates.length || 1);
        if (avgRate > 50) {
          setProviderCurrency("INR");
          toast({
            title: `Fetched ${fetched.length.toLocaleString()} services`,
            description: "INR pricing detected — prices will be divided by 84 to convert to USD.",
          });
        } else {
          toast({ title: `Fetched ${fetched.length.toLocaleString()} services` });
        }
      }
    } catch (err: any) {
      toast({ title: "Fetch failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ── Filtering + grouping ──────────────────────────────────────────────────
  const filteredServices = services.filter(s => {
    const plat = detectPlatform(s.category, s.name);
    const matchPlat = platformFilter === "all" || plat === platformFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch = !q ||
      (s.name || "").toLowerCase().includes(q) ||
      (s.category || "").toLowerCase().includes(q) ||
      String(s.service).includes(q);
    return matchPlat && matchSearch;
  });

  const grouped = filteredServices.reduce((acc, s) => {
    const cat = s.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {} as Record<string, ProviderService[]>);

  // ── Selection helpers ─────────────────────────────────────────────────────
  const toggleSelectAll = () => {
    setSelected(selected.size === filteredServices.length && filteredServices.length > 0
      ? new Set()
      : new Set(filteredServices.map(s => s.service)));
  };
  const toggleSvc = (id: string | number) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };
  const toggleCat = (cat: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const svcs = grouped[cat] || [];
    const allSel = svcs.every(s => selected.has(s.service));
    const n = new Set(selected);
    allSel ? svcs.forEach(s => n.delete(s.service)) : svcs.forEach(s => n.add(s.service));
    setSelected(n);
  };
  const toggleExpand = (cat: string) => {
    const n = new Set(expandedCategories);
    n.has(cat) ? n.delete(cat) : n.add(cat);
    setExpandedCategories(n);
  };

  // ── Safe panel_services upsert with fallback ──────────────────────────────
  const safePanelUpsert = async (rows: any[]) => {
    if (!rows.length) return;
    // Attempt batch upsert first
    const { error } = await supabase
      .from("panel_services")
      .upsert(rows, { onConflict: "service_id", ignoreDuplicates: false });
    if (!error) return;

    // Fallback: individual check + insert/update
    for (const row of rows) {
      const { data: ex } = await supabase
        .from("panel_services")
        .select("id")
        .eq("service_id", row.service_id)
        .maybeSingle();

      if (ex) {
        // Update existing — exclude id from update payload
        const { id: _id, ...updatePayload } = row;
        await supabase.from("panel_services").update(updatePayload).eq("id", ex.id);
      } else {
        // Insert new — exclude any id field to let DB generate it
        const { id: _id, ...insertPayload } = row;
        await supabase.from("panel_services").insert(insertPayload);
      }
    }
  };

  // ── Main import ────────────────────────────────────────────────────────────
  const importSelected = async () => {
    if (selected.size === 0) {
      toast({ title: "No services selected", variant: "destructive" });
      return;
    }

    setImporting(true);
    setImportProgress(0);
    setImportStats({ added: 0, updated: 0, errors: 0 });

    const toImport = services.filter(s => selected.has(s.service));
    setImportTotal(toImport.length);
    const margin = (parseFloat(marginPercent) || 30) / 100;

    try {
      // ── 1. Upsert provider record ──
      setImportStatus("Saving provider…");
      let providerId: string | null = null;
      const { data: exProv } = await supabase
        .from("api_providers")
        .select("id")
        .eq("api_url", apiUrl.trim())
        .maybeSingle();

      if (exProv) {
        providerId = exProv.id;
        await supabase
          .from("api_providers")
          .update({ api_key: apiKey.trim(), currency: providerCurrency, status: "active" })
          .eq("id", providerId);
      } else {
        let host = apiUrl.trim();
        try { host = new URL(apiUrl.trim()).hostname; } catch {}
        const { data: cr, error: ce } = await supabase
          .from("api_providers")
          .insert({
            name: providerName.trim() || host,
            api_url: apiUrl.trim(),
            api_key: apiKey.trim(),
            currency: providerCurrency,
            status: "active",
          })
          .select("id")
          .single();
        if (ce) throw new Error("Provider save failed: " + ce.message);
        providerId = cr.id;
      }

      // ── 2. Import in batches of 100 ──
      const BATCH = 250;
      let added = 0, updated = 0, errors = 0;

      for (let i = 0; i < toImport.length; i += BATCH) {
        const batch = toImport.slice(i, i + BATCH);
        setImportStatus(`${i + 1}–${Math.min(i + BATCH, toImport.length)} of ${toImport.length}`);

        // Find already-imported services in this batch
        const batchPids = batch.map(s => String(s.service));
        const { data: existing } = providerId
          ? await supabase
              .from("services")
              .select("id, service_id, provider_service_id")
              .eq("provider_id", providerId)
              .in("provider_service_id", batchPids)
          : { data: [] };
        const exMap = new Map((existing || []).map((r: any) => [r.provider_service_id, r]));

        const toIns: any[] = [];
        const toUpd: any[] = [];

        for (const svc of batch) {
          const pid = String(svc.service);
          const platform = detectPlatform(svc.category, svc.name);
          const provUsd = toUSD(svc.rate, providerCurrency);
          const panelUsd = provUsd * (1 + margin);

          const row = {
            name: String(svc.name || "").trim(),
            description: String(svc.description || svc.name || "").trim(),
            platform,
            category: String(svc.category || "General").trim(),
            provider_id: providerId,
            provider_service_id: pid,
            provider_price: provUsd,
            base_price: panelUsd,
            min_quantity: Math.max(1, parseInt(String(svc.min)) || 100),
            max_quantity: Math.max(100, parseInt(String(svc.max)) || 50000),
            refill_supported: svc.refill === true || svc.refill === "true" || svc.refill === 1,
            dripfeed_supported: svc.dripfeed === true || svc.dripfeed === "true" || svc.dripfeed === 1,
            is_active: true,
          };

          if (exMap.has(pid)) {
            const ex = exMap.get(pid)!;
            toUpd.push({ id: ex.id, service_id: ex.service_id, ...row });
          } else {
            const numPid = parseInt(pid);
            const svcId = !isNaN(numPid) && numPid > 0 ? numPid : Math.floor(10000 + Math.random() * 89999);
            toIns.push({ ...row, service_id: svcId });
          }
        }

        // ── Insert new services ──
        if (toIns.length > 0) {
          const { data: ins, error: ie } = await supabase
            .from("services")
            .insert(toIns)
            .select("id, service_id");

          if (!ie && ins) {
            added += ins.length;
            const panelRows = ins.map((r: any, idx: number) => ({
              service_id: r.service_id,
              name: toIns[idx].name,
              description: toIns[idx].description,
              platform: toIns[idx].platform,
              category: toIns[idx].category,
              price: toIns[idx].base_price,
              min_quantity: toIns[idx].min_quantity,
              max_quantity: toIns[idx].max_quantity,
              refill_supported: toIns[idx].refill_supported,
              dripfeed_supported: toIns[idx].dripfeed_supported,
              auto_refill_supported: false,
              is_visible: true,
              provider_service_uuid: r.id,
            }));
            await safePanelUpsert(panelRows);
          } else {
            // One-by-one fallback for batch insert failure (e.g. duplicate service_id)
            for (const s of toIns) {
              const fallbackId = Math.floor(10000 + Math.random() * 89999);
              const { data: r2, error: se } = await supabase
                .from("services")
                .insert({ ...s, service_id: fallbackId })
                .select("id, service_id")
                .single();
              if (!se && r2) {
                added++;
                await safePanelUpsert([{
                  service_id: r2.service_id,
                  name: s.name, description: s.description,
                  platform: s.platform, category: s.category,
                  price: s.base_price,
                  min_quantity: s.min_quantity, max_quantity: s.max_quantity,
                  refill_supported: s.refill_supported,
                  dripfeed_supported: s.dripfeed_supported,
                  auto_refill_supported: false,
                  is_visible: true,
                  provider_service_uuid: r2.id,
                }]);
              } else {
                errors++;
              }
            }
          }
        }

        // ── Update existing services ──
        const updateTasks = toUpd.map(async (s: any) => {
          const { id, service_id, ...updateData } = s;
          await supabase
            .from("services")
            .update({
              provider_price: updateData.provider_price,
              base_price: updateData.base_price,
              min_quantity: updateData.min_quantity,
              max_quantity: updateData.max_quantity,
              refill_supported: updateData.refill_supported,
              dripfeed_supported: updateData.dripfeed_supported,
              category: updateData.category,
              platform: updateData.platform,
              name: updateData.name,
              description: updateData.description,
              is_active: true,
            })
            .eq("id", id);
          await safePanelUpsert([{
            service_id,
            name: updateData.name, description: updateData.description,
            platform: updateData.platform, category: updateData.category,
            price: updateData.base_price,
            min_quantity: updateData.min_quantity, max_quantity: updateData.max_quantity,
            refill_supported: updateData.refill_supported,
            dripfeed_supported: updateData.dripfeed_supported,
            auto_refill_supported: false,
            is_visible: true,
            provider_service_uuid: id,
          }]);
        });
        await Promise.all(updateTasks);
        updated += toUpd.length;

        setImportProgress(Math.min(i + BATCH, toImport.length));
        setImportStats({ added, updated, errors });
      }

      if (providerId) {
        await supabase
          .from("api_providers")
          .update({ last_sync_at: new Date().toISOString() })
          .eq("id", providerId);
      }

      setImportStatus("Done!");
      toast({
        title: "Import Complete ✓",
        description: `Added: ${added} · Updated: ${updated}${errors ? ` · Errors: ${errors}` : ""} — services are live now.`,
      });
      setSelected(new Set());
    } catch (err: any) {
      toast({ title: "Import Failed", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
      setImportStatus("");
    }
  };

  const allFilSel = filteredServices.length > 0 && filteredServices.every(s => selected.has(s.service));
  const pct = importTotal > 0 ? Math.round((importProgress / importTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* ── Provider credentials ── */}
      <Card className="border-border/30 bg-card/60">
        <CardHeader>
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />Bulk Service Import
          </CardTitle>
          <CardDescription>
            Fetch from your provider → select → import. Services are live instantly. INR prices auto-convert to USD.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Provider Name</Label>
              <Input placeholder="e.g., SMM Panel Pro" value={providerName} onChange={e => setProviderName(e.target.value)} className="bg-secondary/30 border-border/30" />
            </div>
            <div className="space-y-2">
              <Label>API URL</Label>
              <Input placeholder="https://provider.com/api/v2" value={apiUrl} onChange={e => setApiUrl(e.target.value)} className="bg-secondary/30 border-border/30" />
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input type="password" placeholder="Your API key" value={apiKey} onChange={e => setApiKey(e.target.value)} className="bg-secondary/30 border-border/30" />
            </div>
            <div className="space-y-2">
              <Label>Provider Currency</Label>
              <Select value={providerCurrency} onValueChange={setProviderCurrency}>
                <SelectTrigger className="bg-secondary/30 border-border/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="INR">INR (₹) — auto ÷84 to USD</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {providerCurrency === "INR" && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-700 dark:text-amber-400 flex gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                <strong>INR mode active.</strong> Example: ₹15,650 provider price → <strong>$186.31 USD</strong> (÷84).
                With 30% margin → <strong>$242.20/1K USD</strong>.
              </span>
            </div>
          )}

          <div className="flex gap-3 items-center">
            <Button onClick={fetchServices} disabled={loading} className="w-full md:w-auto">
              {loading ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Fetching…</> : <><RefreshCw className="h-4 w-4 mr-2" />Fetch Provider Services</>}
            </Button>
            {services.length > 0 && (
              <p className="text-sm text-muted-foreground">{services.length.toLocaleString()} services loaded</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Service selection ── */}
      {services.length > 0 && (
        <Card className="border-border/30 bg-card/60">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  Select Services
                  <Badge variant="outline" className="font-mono">{services.length.toLocaleString()}</Badge>
                </CardTitle>
                <CardDescription>
                  {selected.size.toLocaleString()} selected · Grouped by provider category · Live on import
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="space-y-1">
                  <Label className="text-xs">Margin %</Label>
                  <Input
                    type="number" min="0" max="500"
                    value={marginPercent} onChange={e => setMarginPercent(e.target.value)}
                    className="w-20 h-8 bg-secondary/30 border-border/30 text-sm"
                  />
                </div>
                <Button
                  onClick={importSelected}
                  disabled={importing || selected.size === 0}
                  className="self-end" size="lg"
                >
                  {importing
                    ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />{importProgress}/{importTotal}</>
                    : <><Download className="h-4 w-4 mr-2" />Import {selected.size.toLocaleString()}</>}
                </Button>
              </div>
            </div>

            {/* Import progress */}
            {importing && (
              <div className="space-y-1.5 pt-2">
                <Progress value={pct} className="h-2.5" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{importStatus}</span>
                  <span>{pct}% · ✓{importStats.added} +{importStats.updated} {importStats.errors > 0 && `✗${importStats.errors}`}</span>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3 pt-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search services…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 bg-secondary/30 border-border/30"
                />
              </div>
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-44 bg-secondary/30 border-border/30">
                  <Globe className="h-4 w-4 mr-2" /><SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={toggleSelectAll} className="gap-2 self-center">
                {allFilSel
                  ? <><CheckSquare className="h-4 w-4" />Deselect All</>
                  : <><Square className="h-4 w-4" />Select All ({filteredServices.length.toLocaleString()})</>}
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {filteredServices.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No services match filters</p>
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cat, catSvcs]) => {
                  const catSel = catSvcs.filter(s => selected.has(s.service)).length;
                  const allCat = catSel === catSvcs.length && catSvcs.length > 0;
                  const isExp = expandedCategories.has(cat);

                  return (
                    <div key={cat} className="border border-border/20 rounded-lg overflow-hidden">
                      {/* Category header */}
                      <div
                        className="flex items-center gap-3 p-3 bg-secondary/20 cursor-pointer hover:bg-secondary/30 transition-colors"
                        onClick={() => toggleExpand(cat)}
                      >
                        {isExp ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                        <div onClick={e => toggleCat(cat, e)} className="shrink-0">
                          <Checkbox checked={allCat} onCheckedChange={() => {}} />
                        </div>
                        <span className="font-medium text-sm flex-1">{cat}</span>
                        <Badge variant="outline" className="text-xs font-mono">{catSel}/{catSvcs.length}</Badge>
                      </div>

                      {/* Service rows */}
                      {isExp && (
                        <div className="divide-y divide-border/10">
                          {catSvcs.map(svc => {
                            const rawRate = parseNum(svc.rate);
                            const usdRate = toUSD(svc.rate, providerCurrency);
                            const panelRate = usdRate * (1 + (parseFloat(marginPercent) || 30) / 100);
                            const isSel = selected.has(svc.service);
                            const rateIsWrong = providerCurrency === "USD" && rawRate > 50;

                            return (
                              <div
                                key={svc.service}
                                className={`flex items-center gap-3 p-3 hover:bg-secondary/10 cursor-pointer transition-colors ${isSel ? "bg-primary/5" : ""}`}
                                onClick={() => toggleSvc(svc.service)}
                              >
                                <Checkbox
                                  checked={isSel}
                                  onCheckedChange={() => toggleSvc(svc.service)}
                                  onClick={e => e.stopPropagation()}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{svc.name}</p>
                                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    <span className="text-xs text-muted-foreground font-mono">ID:{svc.service}</span>
                                    {(svc.refill === true || svc.refill === "true" || svc.refill === 1) && (
                                      <Badge variant="outline" className="text-xs h-4 px-1 text-success border-success/30">Refill</Badge>
                                    )}
                                    {rateIsWrong && (
                                      <span className="text-xs text-amber-600 flex items-center gap-0.5">
                                        <AlertTriangle className="h-3 w-3" />INR auto-detected
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right shrink-0 space-y-0.5 text-xs">
                                  <p className="text-muted-foreground">
                                    {providerCurrency === "INR" ? `₹${rawRate.toFixed(2)}` : `$${rawRate.toFixed(4)}`}/1K
                                  </p>
                                  <p className="font-semibold text-primary">${panelRate.toFixed(4)}/1K</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
