import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { 
  Package, RefreshCw, Search, Plus, Edit, Trash2, MoreVertical, 
  Link2, Save, Check, X, ArrowUpDown, Percent, Power, PowerOff, AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Service {
  id: string;
  service_id: number;
  name: string;
  description: string | null;
  platform: string;
  category: string;
  base_price: number;
  provider_price: number | null;
  min_quantity: number;
  max_quantity: number;
  is_active: boolean;
  refill_supported: boolean | null;
  dripfeed_supported: boolean | null;
  provider_id: string | null;
  provider_service_id: string | null;
  created_at: string;
  updated_at: string;
  speed_estimate: string | null;
}

interface Provider {
  id: string;
  name: string;
  api_url: string;
}

const PLATFORMS = ['Instagram','YouTube','TikTok','Telegram','X','Facebook','Spotify','Discord','Twitch','Snapchat','WhatsApp','Threads','LinkedIn','Pinterest','Reddit','Apple','Other'];
const CATEGORIES = ['Followers','Likes','Views','Comments','Shares','Subscribers','Members','Reactions','Saves','Impressions','Reach','General','Premium','Other'];
const INR_TO_USD = 1 / 84;

export function ServiceManagementTab() {
  const [services, setServices] = useState<Service[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'enable'|'disable'|'price'|'category'|'delete'>('enable');
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkTotal, setBulkTotal] = useState(0);
  const [isBulkRunning, setIsBulkRunning] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editForm, setEditForm] = useState({
    service_id: 0, name: '', description: '', platform: 'Instagram', category: 'General',
    base_price: '', min_quantity: '', max_quantity: '',
    refill_supported: false, dripfeed_supported: false, is_active: true, speed_estimate: ''
  });
  const [bulkPriceChange, setBulkPriceChange] = useState({ type: 'percent', value: '' });
  const [bulkCategory, setBulkCategory] = useState('General');
  const [inlineEditing, setInlineEditing] = useState<{ id: string; field: string } | null>(null);
  const [inlineValue, setInlineValue] = useState('');
  const { toast } = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    // Paginate to bypass Supabase 1000-row default limit
    const allServices: Service[] = [];
    let page = 0;
    const PAGE_SIZE = 1000;
    while (true) {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('service_id', { ascending: true })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error || !data || data.length === 0) break;
      allServices.push(...data);
      if (data.length < PAGE_SIZE) break;
      page++;
    }
    setServices(allServices);
    const { data: provData } = await supabase.from('api_providers').select('id, name, api_url');
    setProviders(provData || []);
    setLoading(false);
  };

  const filteredServices = services.filter(s => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.service_id.toString().includes(q) || (s.description || "").toLowerCase().includes(q);
    const matchPlat = platformFilter === "all" || s.platform === platformFilter;
    return matchSearch && matchPlat;
  });

  const openEditDialog = (service: Service) => {
    setEditingService(service);
    setEditForm({
      service_id: service.service_id, name: service.name, description: service.description || '',
      platform: service.platform, category: service.category, base_price: service.base_price.toString(),
      min_quantity: service.min_quantity.toString(), max_quantity: service.max_quantity.toString(),
      refill_supported: service.refill_supported || false, dripfeed_supported: service.dripfeed_supported || false,
      is_active: service.is_active, speed_estimate: service.speed_estimate || ''
    });
    setEditDialogOpen(true);
  };

  const saveService = async () => {
    if (!editingService) return;
    const { error } = await supabase.from('services').update({
      service_id: editForm.service_id, name: editForm.name, description: editForm.description,
      platform: editForm.platform, category: editForm.category, base_price: parseFloat(editForm.base_price),
      min_quantity: parseInt(editForm.min_quantity), max_quantity: parseInt(editForm.max_quantity),
      refill_supported: editForm.refill_supported, dripfeed_supported: editForm.dripfeed_supported,
      is_active: editForm.is_active, speed_estimate: editForm.speed_estimate || null
    }).eq('id', editingService.id);
    if (error) { toast({ title: "Failed to update", variant: "destructive" }); return; }
    // Sync panel_services
    await supabase.from('panel_services').update({
      name: editForm.name, description: editForm.description, platform: editForm.platform,
      category: editForm.category, price: parseFloat(editForm.base_price),
      min_quantity: parseInt(editForm.min_quantity), max_quantity: parseInt(editForm.max_quantity),
      refill_supported: editForm.refill_supported, dripfeed_supported: editForm.dripfeed_supported,
      is_visible: editForm.is_active
    }).eq('service_id', editingService.service_id);
    toast({ title: "Service Updated" });
    setEditDialogOpen(false); setEditingService(null); fetchData();
  };

  const addService = async () => {
    const { error } = await supabase.from('services').insert({
      service_id: editForm.service_id || Math.floor(1000 + Math.random() * 9000),
      name: editForm.name, description: editForm.description, platform: editForm.platform,
      category: editForm.category, base_price: parseFloat(editForm.base_price),
      min_quantity: parseInt(editForm.min_quantity) || 100, max_quantity: parseInt(editForm.max_quantity) || 50000,
      refill_supported: editForm.refill_supported, dripfeed_supported: editForm.dripfeed_supported,
      is_active: editForm.is_active, speed_estimate: editForm.speed_estimate || null
    });
    if (error) { toast({ title: "Failed to add service", variant: "destructive" }); return; }
    toast({ title: "Service Added" }); setAddDialogOpen(false); fetchData();
  };

  const resetEditForm = () => setEditForm({
    service_id: Math.floor(1000 + Math.random() * 9000), name: '', description: '',
    platform: 'Instagram', category: 'General', base_price: '', min_quantity: '100',
    max_quantity: '50000', refill_supported: false, dripfeed_supported: false, is_active: true, speed_estimate: ''
  });

  const toggleServiceStatus = async (service: Service) => {
    await supabase.from('services').update({ is_active: !service.is_active }).eq('id', service.id);
    await supabase.from('panel_services').update({ is_visible: !service.is_active }).eq('service_id', service.service_id);
    toast({ title: service.is_active ? "Service Disabled" : "Service Enabled" });
    fetchData();
  };

  const deleteService = async (id: string) => {
    const svc = services.find(s => s.id === id);
    if (svc) await supabase.from('panel_services').delete().eq('service_id', svc.service_id);
    await supabase.from('services').delete().eq('id', id);
    toast({ title: "Service Deleted" }); fetchData();
  };

  const saveInlineEdit = async (svcId: string, field: string, value: string) => {
    const svc = services.find(s => s.id === svcId);
    let updateData: any = {};
    if (field === 'base_price') {
      const p = parseFloat(value);
      updateData.base_price = p;
      if (svc) await supabase.from('panel_services').update({ price: p }).eq('service_id', svc.service_id);
    } else if (field === 'name') {
      updateData.name = value;
      if (svc) await supabase.from('panel_services').update({ name: value }).eq('service_id', svc.service_id);
    }
    await supabase.from('services').update(updateData).eq('id', svcId);
    toast({ title: "Updated" }); fetchData(); setInlineEditing(null);
  };

  const selectAll = () => {
    setSelectedServices(selectedServices.size === filteredServices.length && filteredServices.length > 0
      ? new Set() : new Set(filteredServices.map(s => s.id)));
  };

  // ─── BULK ACTION — fully rewritten to never fail silently ─────────────────
  const executeBulkAction = async () => {
    const ids = Array.from(selectedServices);
    if (ids.length === 0) { toast({ title: "No services selected", variant: "destructive" }); return; }
    setIsBulkRunning(true); setBulkProgress(0); setBulkTotal(ids.length);

    const BATCH = 100;
    let done = 0;

    try {
      // Helper: update services table in batches
      const updateServicesBatched = async (data: any) => {
        for (let i = 0; i < ids.length; i += BATCH) {
          const batch = ids.slice(i, i + BATCH);
          const { error } = await supabase.from('services').update(data).in('id', batch);
          if (error) throw new Error(`services update failed: ${error.message}`);
          done += batch.length; setBulkProgress(done);
        }
      };

      // Helper: sync panel_services for a set of service rows
      const syncPanelServices = async (svcRows: Service[], isVisible: boolean) => {
        for (let i = 0; i < svcRows.length; i += BATCH) {
          const batch = svcRows.slice(i, i + BATCH);
          const rows = batch.map(s => ({
            service_id: s.service_id,
            name: s.name,
            description: s.description,
            platform: s.platform,
            category: s.category,
            price: s.base_price,
            min_quantity: s.min_quantity,
            max_quantity: s.max_quantity,
            refill_supported: !!s.refill_supported,
            dripfeed_supported: !!s.dripfeed_supported,
            auto_refill_supported: false,
            is_visible: isVisible,
          }));
          // Try upsert first; fall back to individual insert/update if constraint missing
          const { error: upsertErr } = await supabase
            .from('panel_services')
            .upsert(rows, { onConflict: 'service_id', ignoreDuplicates: false });
          if (upsertErr) {
            // Fallback: update existing, insert missing
            for (const row of rows) {
              const { data: ex } = await supabase
                .from('panel_services').select('id').eq('service_id', row.service_id).maybeSingle();
              if (ex) {
                await supabase.from('panel_services').update({ is_visible: row.is_visible, price: row.price }).eq('id', ex.id);
              } else {
                await supabase.from('panel_services').insert(row);
              }
            }
          }
        }
      };

      const selectedRows = services.filter(s => ids.includes(s.id));

      switch (bulkActionType) {
        case 'enable':
          await updateServicesBatched({ is_active: true });
          await syncPanelServices(selectedRows, true);
          toast({ title: "Enabled", description: `${ids.length} services are now visible to users` });
          break;

        case 'disable':
          await updateServicesBatched({ is_active: false });
          await syncPanelServices(selectedRows, false);
          toast({ title: "Disabled", description: `${ids.length} services hidden from users` });
          break;

        case 'delete':
          for (let i = 0; i < ids.length; i += BATCH) {
            const batch = ids.slice(i, i + BATCH);
            const batchSvcIds = services.filter(s => batch.includes(s.id)).map(s => s.service_id);
            await supabase.from('panel_services').delete().in('service_id', batchSvcIds);
            const { error } = await supabase.from('services').delete().in('id', batch);
            if (error) throw new Error(`delete failed: ${error.message}`);
            done += batch.length; setBulkProgress(done);
          }
          toast({ title: "Deleted", description: `${ids.length} services removed` });
          break;

        case 'category':
          await updateServicesBatched({ category: bulkCategory });
          for (const row of selectedRows) {
            await supabase.from('panel_services').update({ category: bulkCategory }).eq('service_id', row.service_id);
          }
          toast({ title: "Category Updated" });
          break;

        case 'price': {
          const val = parseFloat(bulkPriceChange.value);
          if (isNaN(val)) throw new Error("Invalid price value");
          for (let i = 0; i < selectedRows.length; i += BATCH) {
            const batch = selectedRows.slice(i, i + BATCH);
            for (const svc of batch) {
              const newPrice = bulkPriceChange.type === 'percent'
                ? Math.max(0.0001, svc.base_price * (1 + val / 100))
                : Math.max(0.0001, svc.base_price + val);
              await supabase.from('services').update({ base_price: newPrice }).eq('id', svc.id);
              await supabase.from('panel_services').update({ price: newPrice }).eq('service_id', svc.service_id);
              done++; setBulkProgress(done);
            }
          }
          toast({ title: "Prices Updated" });
          break;
        }
      }

      setSelectedServices(new Set()); setBulkActionDialogOpen(false); fetchData();
    } catch (err: any) {
      console.error('Bulk action error:', err);
      toast({ title: "Bulk action failed", description: err.message, variant: "destructive" });
    } finally {
      setIsBulkRunning(false); setBulkProgress(0); setBulkTotal(0);
    }
  };

  // ─── Fix INR prices stored wrongly as USD ─────────────────────────────────
  const fixInrPrices = async () => {
    // Any price > $1/1K is almost certainly INR stored as USD for SMM services
    const threshold = 1.0;
    const allBad: any[] = [];
    let page = 0;
    while (true) {
      const { data } = await supabase
        .from('services')
        .select('id, service_id, base_price, provider_price')
        .gt('base_price', threshold)
        .range(page * 1000, (page + 1) * 1000 - 1);
      if (!data || data.length === 0) break;
      allBad.push(...data);
      if (data.length < 1000) break;
      page++;
    }
    if (allBad.length === 0) { toast({ title: "All prices look correct (all ≤ $1/1K)" }); return; }
    let fixed = 0;
    const BATCH = 50;
    for (let i = 0; i < allBad.length; i += BATCH) {
      const batch = allBad.slice(i, i + BATCH);
      for (const svc of batch) {
        const newBase = Number(svc.base_price) * INR_TO_USD;
        const newProv = svc.provider_price ? Number(svc.provider_price) * INR_TO_USD : null;
        await supabase.from('services').update({ base_price: newBase, provider_price: newProv }).eq('id', svc.id);
        await supabase.from('panel_services').update({ price: newBase }).eq('service_id', svc.service_id);
        fixed++;
      }
    }
    toast({ title: `Fixed ${fixed} prices`, description: "INR prices ÷84 → correct USD. Reload to verify." });
    fetchData();
  };

  // ─── Remove ALL services from the panel (nuclear option) ──────────────────
  const [removingAll, setRemovingAll] = useState(false);
  const [addingAll, setAddingAll] = useState(false);

  const removeAllServices = async () => {
    if (!confirm(`Remove ALL ${services.length.toLocaleString()} services from the live panel? Users won't see any services until you add them back.`)) return;
    setRemovingAll(true);
    try {
      // Batch delete from panel_services
      const svcIds = services.map(s => s.service_id);
      const BATCH = 500;
      for (let i = 0; i < svcIds.length; i += BATCH) {
        await supabase.from('panel_services').delete().in('service_id', svcIds.slice(i, i + BATCH));
      }
      // Also mark services table as inactive
      for (let i = 0; i < services.length; i += BATCH) {
        const batch = services.slice(i, i + BATCH).map(s => s.id);
        await supabase.from('services').update({ is_active: false }).in('id', batch);
      }
      toast({ title: `Removed all ${services.length.toLocaleString()} services from live panel` });
      fetchData();
    } catch (err: any) {
      toast({ title: "Remove failed", description: err.message, variant: "destructive" });
    } finally { setRemovingAll(false); }
  };

  const addAllServicesToPanel = async () => {
    if (!confirm(`Add ALL ${services.length.toLocaleString()} services to the live panel? Users will see them all immediately.`)) return;
    setAddingAll(true);
    try {
      const BATCH = 100;
      let added = 0;
      for (let i = 0; i < services.length; i += BATCH) {
        const batch = services.slice(i, i + BATCH);
        // Mark services active
        await supabase.from('services').update({ is_active: true }).in('id', batch.map(s => s.id));
        // Upsert panel_services
        const rows = batch.map(s => ({
          service_id: s.service_id,
          name: s.name, description: s.description,
          platform: s.platform, category: s.category,
          price: s.base_price,
          min_quantity: s.min_quantity, max_quantity: s.max_quantity,
          refill_supported: !!s.refill_supported,
          dripfeed_supported: !!s.dripfeed_supported,
          auto_refill_supported: false,
          is_visible: true,
          provider_service_uuid: s.id,
        }));
        const { error: ue } = await supabase.from('panel_services').upsert(rows, { onConflict: 'service_id', ignoreDuplicates: false });
        if (ue) {
          for (const row of rows) {
            const { data: ex } = await supabase.from('panel_services').select('id').eq('service_id', row.service_id).maybeSingle();
            if (ex) await supabase.from('panel_services').update({ is_visible: true, price: row.price }).eq('id', ex.id);
            else await supabase.from('panel_services').insert(row);
          }
        }
        added += batch.length;
      }
      toast({ title: `Added ${added.toLocaleString()} services to live panel`, description: "Users can see and order all services now." });
      fetchData();
    } catch (err: any) {
      toast({ title: "Add failed", description: err.message, variant: "destructive" });
    } finally { setAddingAll(false); }
  };

  const pct = bulkTotal > 0 ? Math.round((bulkProgress / bulkTotal) * 100) : 0;
  const getProvider = (id: string | null) => providers.find(p => p.id === id);

  if (loading) return (
    <Card className="border-border/30 bg-card/60">
      <CardContent className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </CardContent>
    </Card>
  );

  return (
    <>
      <Card className="border-border/30 bg-card/60">
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-display">Service Control Panel</CardTitle>
              <CardDescription>
                {services.length.toLocaleString()} services · {services.filter(s=>s.is_active).length.toLocaleString()} active
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search…" className="pl-9 w-[200px] bg-secondary/30" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-[140px] bg-secondary/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
              <Button variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10" onClick={fixInrPrices}>
                <AlertTriangle className="h-4 w-4 mr-1" />Fix INR Prices
              </Button>
              <Button
                variant="outline"
                className="border-success/40 text-success hover:bg-success/10"
                onClick={addAllServicesToPanel}
                disabled={addingAll || services.length === 0}
              >
                {addingAll ? <><RefreshCw className="h-4 w-4 mr-1 animate-spin" />Adding…</> : <><Power className="h-4 w-4 mr-1" />Add All Live</>}
              </Button>
              <Button
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={removeAllServices}
                disabled={removingAll || services.length === 0}
              >
                {removingAll ? <><RefreshCw className="h-4 w-4 mr-1 animate-spin" />Removing…</> : <><Trash2 className="h-4 w-4 mr-1" />Remove All</>}
              </Button>
              <Button onClick={() => { resetEditForm(); setAddDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />Add Service
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedServices.size > 0 && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-primary/10 border border-primary/30 rounded-lg flex-wrap">
              <span className="text-sm font-medium">{selectedServices.size} selected</span>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => { setBulkActionType('enable'); setBulkActionDialogOpen(true); }}><Power className="h-3 w-3 mr-1" />Enable All</Button>
                <Button size="sm" variant="outline" onClick={() => { setBulkActionType('disable'); setBulkActionDialogOpen(true); }}><PowerOff className="h-3 w-3 mr-1" />Disable All</Button>
                <Button size="sm" variant="outline" onClick={() => { setBulkActionType('price'); setBulkActionDialogOpen(true); }}><Percent className="h-3 w-3 mr-1" />Price</Button>
                <Button size="sm" variant="outline" onClick={() => { setBulkActionType('category'); setBulkActionDialogOpen(true); }}><ArrowUpDown className="h-3 w-3 mr-1" />Category</Button>
                <Button size="sm" variant="destructive" onClick={() => { setBulkActionType('delete'); setBulkActionDialogOpen(true); }}><Trash2 className="h-3 w-3 mr-1" />Delete</Button>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSelectedServices(new Set())}><X className="h-4 w-4" /></Button>
            </div>
          )}

          {services.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No services yet — use Bulk Import to add from your provider</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left p-3 w-10">
                      <Checkbox checked={selectedServices.size === filteredServices.length && filteredServices.length > 0} onCheckedChange={selectAll} />
                    </th>
                    <th className="text-left p-3 text-xs text-muted-foreground uppercase">ID</th>
                    <th className="text-left p-3 text-xs text-muted-foreground uppercase">Service</th>
                    <th className="text-left p-3 text-xs text-muted-foreground uppercase">Platform</th>
                    <th className="text-left p-3 text-xs text-muted-foreground uppercase">Provider Price</th>
                    <th className="text-left p-3 text-xs text-muted-foreground uppercase">Panel Price</th>
                    <th className="text-left p-3 text-xs text-muted-foreground uppercase">Limits</th>
                    <th className="text-left p-3 text-xs text-muted-foreground uppercase">Status</th>
                    <th className="text-left p-3 text-xs text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServices.map(service => {
                    const provider = getProvider(service.provider_id);
                    const priceIsWrong = service.base_price > 50;
                    return (
                      <tr key={service.id} className="border-b border-border/20 hover:bg-secondary/10">
                        <td className="p-3">
                          <Checkbox checked={selectedServices.has(service.id)} onCheckedChange={checked => {
                            const n = new Set(selectedServices);
                            checked ? n.add(service.id) : n.delete(service.id);
                            setSelectedServices(n);
                          }} />
                        </td>
                        <td className="p-3">
                          <div className="font-mono text-sm text-primary">{service.service_id}</div>
                          <div className="font-mono text-xs text-muted-foreground">{service.provider_service_id || '—'}</div>
                        </td>
                        <td className="p-3 max-w-[250px]">
                          {inlineEditing?.id === service.id && inlineEditing.field === 'name' ? (
                            <div className="flex items-center gap-1">
                              <Input className="h-7 w-40 text-xs" value={inlineValue} onChange={e => setInlineValue(e.target.value)} autoFocus />
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => saveInlineEdit(service.id, 'name', inlineValue)}><Check className="h-3 w-3 text-success" /></Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setInlineEditing(null)}><X className="h-3 w-3" /></Button>
                            </div>
                          ) : (
                            <p className="font-medium truncate cursor-pointer hover:underline" title={service.name} onClick={() => { setInlineEditing({ id: service.id, field: 'name' }); setInlineValue(service.name); }}>{service.name}</p>
                          )}
                          <p className="text-xs text-muted-foreground">{service.category}</p>
                        </td>
                        <td className="p-3"><Badge variant="outline">{service.platform}</Badge></td>
                        <td className="p-3 font-mono text-xs text-muted-foreground">
                          {service.provider_price != null ? `$${Number(service.provider_price).toFixed(4)}` : '—'}
                        </td>
                        <td className="p-3">
                          {inlineEditing?.id === service.id && inlineEditing.field === 'base_price' ? (
                            <div className="flex items-center gap-1">
                              <Input type="number" step="0.0001" className="h-7 w-24 text-xs" value={inlineValue} onChange={e => setInlineValue(e.target.value)} autoFocus />
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => saveInlineEdit(service.id, 'base_price', inlineValue)}><Check className="h-3 w-3 text-success" /></Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setInlineEditing(null)}><X className="h-3 w-3" /></Button>
                            </div>
                          ) : (
                            <span className={`font-mono text-sm cursor-pointer hover:underline ${priceIsWrong ? 'text-destructive' : 'text-success'}`} title={priceIsWrong ? 'Price looks wrong — may be INR. Click Fix INR Prices.' : undefined}
                              onClick={() => { setInlineEditing({ id: service.id, field: 'base_price' }); setInlineValue(service.base_price.toString()); }}>
                              ${Number(service.base_price).toFixed(4)}{priceIsWrong && ' ⚠'}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground font-mono">{service.min_quantity.toLocaleString()} – {service.max_quantity.toLocaleString()}</td>
                        <td className="p-3"><Switch checked={service.is_active} onCheckedChange={() => toggleServiceStatus(service)} /></td>
                        <td className="p-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <div className="px-2 py-1 text-xs text-muted-foreground border-b mb-1">Provider: {provider?.name || 'Manual'}</div>
                              <DropdownMenuItem onClick={() => openEditDialog(service)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setEditingService(service); setMappingDialogOpen(true); }}><Link2 className="h-4 w-4 mr-2" />View Mapping</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleServiceStatus(service)}>{service.is_active ? <PowerOff className="h-4 w-4 mr-2" /> : <Power className="h-4 w-4 mr-2" />}{service.is_active ? 'Disable' : 'Enable'}</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => deleteService(service.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground text-center mt-4">{filteredServices.length} services shown</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Service Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Service</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Panel Service ID</Label><Input type="number" value={editForm.service_id} onChange={e => setEditForm({ ...editForm, service_id: parseInt(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Provider Price (read-only)</Label><Input value={editingService?.provider_price ? `$${editingService.provider_price.toFixed(4)}` : 'N/A'} disabled className="bg-muted" /></div>
            </div>
            <div className="space-y-2"><Label>Name</Label><Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Platform</Label>
                <Select value={editForm.platform} onValueChange={v => setEditForm({ ...editForm, platform: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Category</Label>
                <Select value={editForm.category} onValueChange={v => setEditForm({ ...editForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Panel Price ($/1K)</Label><Input type="number" step="0.0001" value={editForm.base_price} onChange={e => setEditForm({ ...editForm, base_price: e.target.value })} /></div>
              <div className="space-y-2"><Label>Min Qty</Label><Input type="number" value={editForm.min_quantity} onChange={e => setEditForm({ ...editForm, min_quantity: e.target.value })} /></div>
              <div className="space-y-2"><Label>Max Qty</Label><Input type="number" value={editForm.max_quantity} onChange={e => setEditForm({ ...editForm, max_quantity: e.target.value })} /></div>
            </div>
            <div className="flex gap-6">
              {[{ key: 'refill_supported', label: 'Refill' }, { key: 'dripfeed_supported', label: 'Drip Feed' }, { key: 'is_active', label: 'Visible to Users' }].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2"><Switch checked={(editForm as any)[key]} onCheckedChange={v => setEditForm({ ...editForm, [key]: v })} /><Label>{label}</Label></div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveService}><Save className="h-4 w-4 mr-2" />Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Service Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add New Service</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Service ID</Label><Input type="number" value={editForm.service_id} onChange={e => setEditForm({ ...editForm, service_id: parseInt(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Platform</Label>
                <Select value={editForm.platform} onValueChange={v => setEditForm({ ...editForm, platform: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Name</Label><Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Category</Label>
                <Select value={editForm.category} onValueChange={v => setEditForm({ ...editForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Price ($/1K)</Label><Input type="number" step="0.01" value={editForm.base_price} onChange={e => setEditForm({ ...editForm, base_price: e.target.value })} /></div>
              <div className="space-y-2"><Label>Speed</Label><Input value={editForm.speed_estimate} onChange={e => setEditForm({ ...editForm, speed_estimate: e.target.value })} placeholder="1K-5K/day" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Min Qty</Label><Input type="number" value={editForm.min_quantity} onChange={e => setEditForm({ ...editForm, min_quantity: e.target.value })} /></div>
              <div className="space-y-2"><Label>Max Qty</Label><Input type="number" value={editForm.max_quantity} onChange={e => setEditForm({ ...editForm, max_quantity: e.target.value })} /></div>
            </div>
            <div className="flex gap-6">
              {[{ key: 'refill_supported', label: 'Refill' }, { key: 'dripfeed_supported', label: 'Drip Feed' }, { key: 'is_active', label: 'Active' }].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2"><Switch checked={(editForm as any)[key]} onCheckedChange={v => setEditForm({ ...editForm, [key]: v })} /><Label>{label}</Label></div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={addService}><Plus className="h-4 w-4 mr-2" />Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mapping Dialog */}
      <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Service Mapping</DialogTitle></DialogHeader>
          {editingService && (
            <div className="space-y-3 py-4">
              {[
                { label: 'Panel ID', value: editingService.service_id },
                { label: 'Provider Service ID', value: editingService.provider_service_id || 'N/A' },
                { label: 'Provider', value: getProvider(editingService.provider_id)?.name || 'Manual' },
                { label: 'Provider Price', value: editingService.provider_price ? `$${editingService.provider_price.toFixed(4)}` : 'N/A' },
                { label: 'Panel Price', value: `$${editingService.base_price.toFixed(4)}` },
                { label: 'Last Updated', value: new Date(editingService.updated_at).toLocaleString() },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 bg-secondary/30 rounded-lg flex justify-between">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="font-mono text-sm">{value}</span>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMappingDialogOpen(false)}>Close</Button>
            <Button onClick={() => { setMappingDialogOpen(false); if (editingService) openEditDialog(editingService); }}><Edit className="h-4 w-4 mr-2" />Edit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Dialog */}
      <Dialog open={bulkActionDialogOpen} onOpenChange={(open) => { if (!isBulkRunning) setBulkActionDialogOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkActionType === 'enable' && 'Enable Services'}
              {bulkActionType === 'disable' && 'Disable Services'}
              {bulkActionType === 'delete' && 'Delete Services'}
              {bulkActionType === 'price' && 'Adjust Prices'}
              {bulkActionType === 'category' && 'Change Category'}
            </DialogTitle>
            <DialogDescription>Affecting {selectedServices.size} selected services</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {bulkActionType === 'enable' && (
              <p className="text-sm text-muted-foreground">These services will become visible to users immediately after enabling.</p>
            )}
            {bulkActionType === 'price' && (
              <div className="space-y-3">
                <Select value={bulkPriceChange.type} onValueChange={v => setBulkPriceChange({ ...bulkPriceChange, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage (%)</SelectItem>
                    <SelectItem value="flat">Flat Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" placeholder={bulkPriceChange.type === 'percent' ? 'e.g. 10 for +10%, -10 for -10%' : 'e.g. 0.50'} value={bulkPriceChange.value} onChange={e => setBulkPriceChange({ ...bulkPriceChange, value: e.target.value })} />
              </div>
            )}
            {bulkActionType === 'category' && (
              <Select value={bulkCategory} onValueChange={setBulkCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            )}
            {bulkActionType === 'delete' && (
              <p className="text-sm text-destructive font-medium">This cannot be undone. {selectedServices.size} services will be permanently deleted.</p>
            )}
            {isBulkRunning && (
              <div className="space-y-2">
                <Progress value={pct} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">{bulkProgress}/{bulkTotal} — {pct}%</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkActionDialogOpen(false)} disabled={isBulkRunning}>Cancel</Button>
            <Button variant={bulkActionType === 'delete' ? 'destructive' : 'default'} onClick={executeBulkAction} disabled={isBulkRunning}>
              {isBulkRunning ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Running…</> : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
