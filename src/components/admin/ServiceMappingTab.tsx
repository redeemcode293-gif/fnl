import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Link2, 
  RefreshCw,
  Package,
  ArrowRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PanelService {
  id: string;
  service_id: number;
  name: string;
  description: string | null;
  platform: string;
  category: string;
  min_quantity: number;
  max_quantity: number;
  price: number;
  refill_supported: boolean;
  dripfeed_supported: boolean;
  auto_refill_supported: boolean;
  is_visible: boolean;
  provider_service_uuid: string | null;
}

interface ProviderService {
  id: string;
  name: string;
  platform: string;
  provider_id: string | null;
  provider_service_id: string | null;
  provider_price: number | null;
  min_quantity: number;
  max_quantity: number;
  refill_supported: boolean | null;
}

interface Provider {
  id: string;
  name: string;
}

const platforms = [
  "Instagram", "YouTube", "TikTok", "Telegram", "X", 
  "Facebook", "Spotify", "Discord", "Twitch", "Snapchat", 
  "WhatsApp", "Threads", "LinkedIn", "Pinterest", "Other"
];

export const ServiceMappingTab = () => {
  const [panelServices, setPanelServices] = useState<PanelService[]>([]);
  const [providerServices, setProviderServices] = useState<ProviderService[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedService, setSelectedService] = useState<PanelService | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    platform: "Instagram",
    category: "General",
    min_quantity: "100",
    max_quantity: "50000",
    price: "",
    refill_supported: false,
    dripfeed_supported: false,
    auto_refill_supported: false,
    is_visible: true,
    provider_service_uuid: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch panel services, provider services, and providers in parallel
    const [panelRes, providerRes, providersRes] = await Promise.all([
      supabase.from('panel_services').select('*').order('service_id'),
      supabase.from('services').select('id, name, platform, provider_id, provider_service_id, provider_price, min_quantity, max_quantity, refill_supported'),
      supabase.from('api_providers').select('id, name')
    ]);

    if (panelRes.data) setPanelServices(panelRes.data);
    if (providerRes.data) setProviderServices(providerRes.data);
    if (providersRes.data) setProviders(providersRes.data);
    
    setLoading(false);
  };

  const generateServiceId = () => {
    // Generate 3-4 digit numeric ID
    return Math.floor(100 + Math.random() * 9900);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      platform: "Instagram",
      category: "General",
      min_quantity: "100",
      max_quantity: "50000",
      price: "",
      refill_supported: false,
      dripfeed_supported: false,
      auto_refill_supported: false,
      is_visible: true,
      provider_service_uuid: ""
    });
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.price) {
      toast({ title: "Missing fields", description: "Name and price are required", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from('panel_services').insert({
      service_id: generateServiceId(),
      name: formData.name,
      description: formData.description || null,
      platform: formData.platform,
      category: formData.category,
      min_quantity: parseInt(formData.min_quantity),
      max_quantity: parseInt(formData.max_quantity),
      price: parseFloat(formData.price),
      refill_supported: formData.refill_supported,
      dripfeed_supported: formData.dripfeed_supported,
      auto_refill_supported: formData.auto_refill_supported,
      is_visible: formData.is_visible,
      provider_service_uuid: formData.provider_service_uuid || null
    });

    if (error) {
      toast({ title: "Failed to create service", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Panel service created" });
      setShowCreateDialog(false);
      resetForm();
      fetchData();
    }
  };

  const handleUpdate = async () => {
    if (!selectedService) return;

    const { error } = await supabase
      .from('panel_services')
      .update({
        name: formData.name,
        description: formData.description || null,
        platform: formData.platform,
        category: formData.category,
        min_quantity: parseInt(formData.min_quantity),
        max_quantity: parseInt(formData.max_quantity),
        price: parseFloat(formData.price),
        refill_supported: formData.refill_supported,
        dripfeed_supported: formData.dripfeed_supported,
        auto_refill_supported: formData.auto_refill_supported,
        is_visible: formData.is_visible,
        provider_service_uuid: formData.provider_service_uuid || null
      })
      .eq('id', selectedService.id);

    if (error) {
      toast({ title: "Failed to update service", variant: "destructive" });
    } else {
      toast({ title: "Panel service updated" });
      setShowEditDialog(false);
      setSelectedService(null);
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('panel_services').delete().eq('id', id);
    if (error) {
      toast({ title: "Failed to delete", variant: "destructive" });
    } else {
      toast({ title: "Service deleted" });
      fetchData();
    }
  };

  const toggleVisibility = async (service: PanelService) => {
    const { error } = await supabase
      .from('panel_services')
      .update({ is_visible: !service.is_visible })
      .eq('id', service.id);

    if (!error) {
      fetchData();
    }
  };

  const openEditDialog = (service: PanelService) => {
    setSelectedService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      platform: service.platform,
      category: service.category,
      min_quantity: service.min_quantity.toString(),
      max_quantity: service.max_quantity.toString(),
      price: service.price.toString(),
      refill_supported: service.refill_supported,
      dripfeed_supported: service.dripfeed_supported,
      auto_refill_supported: service.auto_refill_supported,
      is_visible: service.is_visible,
      provider_service_uuid: service.provider_service_uuid || ""
    });
    setShowEditDialog(true);
  };

  const getProviderInfo = (providerServiceUuid: string | null) => {
    if (!providerServiceUuid) return null;
    const provService = providerServices.find(s => s.id === providerServiceUuid);
    if (!provService) return null;
    const provider = providers.find(p => p.id === provService.provider_id);
    return { service: provService, provider };
  };

  const filteredServices = panelServices.filter(s => 
    searchQuery === "" ||
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.service_id.toString().includes(searchQuery) ||
    s.platform.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ServiceFormFields = () => (
    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
      <div className="space-y-2">
        <Label>Service Name *</Label>
        <Input 
          placeholder="e.g., Instagram Followers – Authority" 
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">Include keyword + qualifier (e.g., "Instagram Followers – Pro")</p>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea 
          placeholder="Service description..." 
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Platform</Label>
          <Select value={formData.platform} onValueChange={(v) => setFormData({ ...formData, platform: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {platforms.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Input 
            placeholder="e.g., Followers, Views, Likes" 
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Min Quantity</Label>
          <Input 
            type="number"
            value={formData.min_quantity}
            onChange={(e) => setFormData({ ...formData, min_quantity: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Max Quantity</Label>
          <Input 
            type="number"
            value={formData.max_quantity}
            onChange={(e) => setFormData({ ...formData, max_quantity: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Price (per 1K) *</Label>
          <Input 
            type="number"
            step="0.01"
            placeholder="0.50"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Link to Provider Service</Label>
        <Select 
          value={formData.provider_service_uuid || "none"} 
          onValueChange={(v) => setFormData({ ...formData, provider_service_uuid: v === "none" ? "" : v })}
        >
          <SelectTrigger><SelectValue placeholder="Select provider service..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No mapping (manual)</SelectItem>
            {providerServices.map(ps => {
              const provider = providers.find(p => p.id === ps.provider_id);
              return (
                <SelectItem key={ps.id} value={ps.id}>
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground">[{provider?.name || 'Unknown'}]</span>
                    <span className="truncate max-w-[300px]">{ps.name}</span>
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
          <Label className="cursor-pointer">Refill Supported</Label>
          <Switch checked={formData.refill_supported} onCheckedChange={(v) => setFormData({ ...formData, refill_supported: v })} />
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
          <Label className="cursor-pointer">Drip-Feed</Label>
          <Switch checked={formData.dripfeed_supported} onCheckedChange={(v) => setFormData({ ...formData, dripfeed_supported: v })} />
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
          <Label className="cursor-pointer">Auto-Refill</Label>
          <Switch checked={formData.auto_refill_supported} onCheckedChange={(v) => setFormData({ ...formData, auto_refill_supported: v })} />
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
          <Label className="cursor-pointer">Visible to Users</Label>
          <Switch checked={formData.is_visible} onCheckedChange={(v) => setFormData({ ...formData, is_visible: v })} />
        </div>
      </div>
    </div>
  );

  return (
    <Card className="border-border/30 bg-card/60">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-display">Service Mapping</CardTitle>
            <CardDescription>Map panel services to provider services. Provider data is hidden from users.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name, ID, platform..." 
                className="pl-9 w-64 bg-secondary/30 border-border/30"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}><Plus className="h-4 w-4 mr-2" />Add Panel Service</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Create Panel Service</DialogTitle></DialogHeader>
                <ServiceFormFields />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                  <Button onClick={handleCreate}>Create Service</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : panelServices.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No panel services configured</p>
            <p className="text-sm text-muted-foreground mt-1">Create panel services and map them to provider services</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Panel ID</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Service Name</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Provider</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Provider ID</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Price</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.map((service) => {
                  const providerInfo = getProviderInfo(service.provider_service_uuid);
                  return (
                    <tr key={service.id} className="border-b border-border/20 hover:bg-secondary/10">
                      <td className="p-3 font-mono text-sm text-primary">{service.service_id}</td>
                      <td className="p-3">
                        <div>
                          <p className="font-medium text-foreground text-sm">{service.name}</p>
                          <p className="text-xs text-muted-foreground">{service.platform} • {service.category}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        {providerInfo ? (
                          <Badge variant="outline" className="text-xs">
                            {providerInfo.provider?.name || 'Unknown'}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Manual</span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">
                        {providerInfo?.service?.provider_service_id || '-'}
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-sm">${Number(service.price).toFixed(2)}</span>
                        {providerInfo?.service?.provider_price && (
                          <span className="text-xs text-muted-foreground ml-1">
                            (cost: ${Number(providerInfo.service.provider_price).toFixed(4)})
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge 
                          variant={service.is_visible ? "success" : "secondary"}
                          className="cursor-pointer"
                          onClick={() => toggleVisibility(service)}
                        >
                          {service.is_visible ? "Visible" : "Hidden"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => openEditDialog(service)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => toggleVisibility(service)}
                          >
                            {service.is_visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDelete(service.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit Panel Service</DialogTitle></DialogHeader>
          <ServiceFormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
