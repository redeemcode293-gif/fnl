import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Globe, Plus, Edit, Trash2, RefreshCw, Save, Users
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Region {
  id: string;
  region_code: string;
  region_name: string;
  multiplier: number;
  countries: string[];
  created_at: string;
  updated_at: string;
}

// Comprehensive country list with codes
const ALL_COUNTRIES = [
  // High Multiplier (Premium)
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "QA", name: "Qatar", flag: "🇶🇦" },
  { code: "KW", name: "Kuwait", flag: "🇰🇼" },
  { code: "BH", name: "Bahrain", flag: "🇧🇭" },
  { code: "OM", name: "Oman", flag: "🇴🇲" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
  // Western Europe
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "BE", name: "Belgium", flag: "🇧🇪" },
  { code: "AT", name: "Austria", flag: "🇦🇹" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭" },
  { code: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "NO", name: "Norway", flag: "🇳🇴" },
  { code: "DK", name: "Denmark", flag: "🇩🇰" },
  { code: "FI", name: "Finland", flag: "🇫🇮" },
  { code: "IE", name: "Ireland", flag: "🇮🇪" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "GR", name: "Greece", flag: "🇬🇷" },
  // Moderate
  { code: "TR", name: "Turkey", flag: "🇹🇷" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "PE", name: "Peru", flag: "🇵🇪" },
  { code: "PL", name: "Poland", flag: "🇵🇱" },
  { code: "CZ", name: "Czech Republic", flag: "🇨🇿" },
  { code: "HU", name: "Hungary", flag: "🇭🇺" },
  { code: "RO", name: "Romania", flag: "🇷🇴" },
  { code: "RU", name: "Russia", flag: "🇷🇺" },
  { code: "UA", name: "Ukraine", flag: "🇺🇦" },
  // MENA
  { code: "EG", name: "Egypt", flag: "🇪🇬" },
  { code: "MA", name: "Morocco", flag: "🇲🇦" },
  { code: "DZ", name: "Algeria", flag: "🇩🇿" },
  { code: "TN", name: "Tunisia", flag: "🇹🇳" },
  { code: "JO", name: "Jordan", flag: "🇯🇴" },
  { code: "LB", name: "Lebanon", flag: "🇱🇧" },
  { code: "IQ", name: "Iraq", flag: "🇮🇶" },
  { code: "IR", name: "Iran", flag: "🇮🇷" },
  // South/Southeast Asia
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩" },
  { code: "LK", name: "Sri Lanka", flag: "🇱🇰" },
  { code: "NP", name: "Nepal", flag: "🇳🇵" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "TH", name: "Thailand", flag: "🇹🇭" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳" },
  { code: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  // East Asia
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "CN", name: "China", flag: "🇨🇳" },
  { code: "TW", name: "Taiwan", flag: "🇹🇼" },
  { code: "HK", name: "Hong Kong", flag: "🇭🇰" },
  // Africa
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "GH", name: "Ghana", flag: "🇬🇭" },
  { code: "ET", name: "Ethiopia", flag: "🇪🇹" },
  { code: "TZ", name: "Tanzania", flag: "🇹🇿" },
  { code: "UG", name: "Uganda", flag: "🇺🇬" },
];

// Default region groups - Updated per requirements
const DEFAULT_REGIONS = [
  { region_code: "GCC_UAE", region_name: "UAE Premium", multiplier: 2.25, countries: ["AE"] },
  { region_code: "GCC_SA", region_name: "Saudi Arabia", multiplier: 2.10, countries: ["SA"] },
  { region_code: "GCC_QA", region_name: "Qatar", multiplier: 2.20, countries: ["QA"] },
  { region_code: "GCC_KW", region_name: "Kuwait/Bahrain/Oman", multiplier: 2.10, countries: ["KW", "BH", "OM"] },
  { region_code: "USA", region_name: "United States", multiplier: 1.90, countries: ["US"] },
  { region_code: "UK", region_name: "United Kingdom", multiplier: 1.85, countries: ["GB"] },
  { region_code: "CA", region_name: "Canada", multiplier: 1.80, countries: ["CA"] },
  { region_code: "AU", region_name: "Australia/New Zealand", multiplier: 1.85, countries: ["AU", "NZ"] },
  { region_code: "EU_PREMIUM", region_name: "Western Europe Premium", multiplier: 1.75, countries: ["DE", "FR", "NL", "CH", "AT", "BE"] },
  { region_code: "EU_MID", region_name: "Western Europe Mid", multiplier: 1.65, countries: ["IT", "ES", "PT", "SE", "NO", "DK", "FI", "IE", "GR"] },
  { region_code: "TURKEY", region_name: "Turkey", multiplier: 1.45, countries: ["TR"] },
  { region_code: "MALAYSIA", region_name: "Malaysia/Singapore", multiplier: 1.40, countries: ["MY", "SG"] },
  { region_code: "INDONESIA", region_name: "Indonesia", multiplier: 1.35, countries: ["ID"] },
  { region_code: "PHILIPPINES", region_name: "Southeast Asia Mid", multiplier: 1.30, countries: ["PH", "TH", "VN"] },
  { region_code: "BRAZIL", region_name: "Brazil", multiplier: 1.30, countries: ["BR"] },
  { region_code: "MEXICO", region_name: "Mexico/LATAM", multiplier: 1.25, countries: ["MX", "AR", "CL", "CO", "PE"] },
  { region_code: "SOUTH_AFRICA", region_name: "South Africa", multiplier: 1.25, countries: ["ZA"] },
  { region_code: "AFRICA_MID", region_name: "Africa Mid-Tier", multiplier: 1.05, countries: ["NG", "EG", "KE", "GH", "MA", "TN", "DZ"] },
  { region_code: "CIS", region_name: "CIS/Eastern Europe", multiplier: 1.35, countries: ["RU", "UA", "KZ", "BY", "GE", "AZ", "PL", "CZ", "HU", "RO"] },
  { region_code: "EAST_ASIA", region_name: "East Asia", multiplier: 1.60, countries: ["JP", "KR", "CN", "TW", "HK"] },
  { region_code: "SOUTH_ASIA", region_name: "India/South Asia (Base)", multiplier: 1.00, countries: ["IN", "PK", "BD", "NP", "LK"] }
];

// Default fallback multiplier for unlisted countries
const DEFAULT_FALLBACK_MULTIPLIER = 1.40;

export function RegionalPricingTab() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  
  const [form, setForm] = useState({
    region_code: "",
    region_name: "",
    multiplier: "",
    countries: [] as string[]
  });
  
  const { toast } = useToast();

  useEffect(() => {
    fetchRegions();
  }, []);

  const fetchRegions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('regional_pricing')
      .select('*')
      .order('multiplier', { ascending: false });
    
    if (data) {
      setRegions(data);
      // Count users per region
      const { data: profiles } = await supabase.from('profiles').select('country_code');
      if (profiles) {
        const counts: Record<string, number> = {};
        data.forEach(region => {
          counts[region.id] = profiles.filter(p => 
            region.countries?.includes(p.country_code || '')
          ).length;
        });
        setUserCounts(counts);
      }
    }
    setLoading(false);
  };

  const openEditDialog = (region?: Region) => {
    if (region) {
      setEditingRegion(region);
      setForm({
        region_code: region.region_code,
        region_name: region.region_name,
        multiplier: region.multiplier.toString(),
        countries: region.countries || []
      });
    } else {
      setEditingRegion(null);
      setForm({
        region_code: "",
        region_name: "",
        multiplier: "1.0",
        countries: []
      });
    }
    setEditDialogOpen(true);
  };

  const saveRegion = async () => {
    if (!form.region_code || !form.region_name || !form.multiplier) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const regionData = {
      region_code: form.region_code,
      region_name: form.region_name,
      multiplier: parseFloat(form.multiplier),
      countries: form.countries
    };

    let error;
    if (editingRegion) {
      ({ error } = await supabase.from('regional_pricing').update(regionData).eq('id', editingRegion.id));
    } else {
      ({ error } = await supabase.from('regional_pricing').insert(regionData));
    }

    if (error) {
      toast({ title: "Failed to save region", variant: "destructive" });
    } else {
      toast({ title: editingRegion ? "Region Updated" : "Region Created" });
      setEditDialogOpen(false);
      fetchRegions();
    }
  };

  const deleteRegion = async (id: string) => {
    const { error } = await supabase.from('regional_pricing').delete().eq('id', id);
    if (error) {
      toast({ title: "Failed to delete", variant: "destructive" });
    } else {
      toast({ title: "Region Deleted" });
      fetchRegions();
    }
  };

  const initializeDefaults = async () => {
    for (const region of DEFAULT_REGIONS) {
      await supabase.from('regional_pricing').insert(region);
    }
    toast({ title: "Default regions initialized" });
    fetchRegions();
  };

  const toggleCountry = (code: string) => {
    setForm(prev => ({
      ...prev,
      countries: prev.countries.includes(code)
        ? prev.countries.filter(c => c !== code)
        : [...prev.countries, code]
    }));
  };

  const getCountryInfo = (code: string) => {
    return ALL_COUNTRIES.find(c => c.code === code);
  };

  if (loading) {
    return (
      <Card className="border-border/30 bg-card/60">
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/30 bg-card/60">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Regional Pricing Multipliers
              </CardTitle>
              <CardDescription>Define pricing multipliers by country groups (admin-only view)</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="icon" onClick={fetchRegions}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              {regions.length === 0 && (
                <Button variant="outline" onClick={initializeDefaults}>
                  Initialize Defaults
                </Button>
              )}
              <Button onClick={() => openEditDialog()}>
                <Plus className="h-4 w-4 mr-2" />Add Region
              </Button>
            </div>
          </div>
          {/* Default Fallback Info */}
          <div className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/30">
            <p className="text-sm text-warning-foreground">
              <strong>Default Fallback:</strong> Countries not listed in any region will use <span className="font-mono font-bold">{DEFAULT_FALLBACK_MULTIPLIER}x</span> multiplier.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {regions.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No regional pricing configured</p>
              <p className="text-sm text-muted-foreground mt-1">Click "Initialize Defaults" to set up recommended regions</p>
            </div>
          ) : (
            <div className="space-y-4">
              {regions.map((region) => (
                <div key={region.id} className="p-4 rounded-lg bg-secondary/10 border border-border/30">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline" className="font-mono">{region.region_code}</Badge>
                        <h3 className="font-medium text-foreground">{region.region_name}</h3>
                        <Badge className="bg-primary/20 text-primary border-primary/30">
                          {region.multiplier}x
                        </Badge>
                        <Badge variant="secondary" className="gap-1">
                          <Users className="h-3 w-3" />
                          {userCounts[region.id] || 0} users
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {region.countries?.slice(0, 12).map(code => {
                          const country = getCountryInfo(code);
                          return (
                            <Badge key={code} variant="secondary" className="text-xs gap-1">
                              {country?.flag} {code}
                            </Badge>
                          );
                        })}
                        {(region.countries?.length || 0) > 12 && (
                          <Badge variant="outline" className="text-xs">
                            +{(region.countries?.length || 0) - 12} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(region)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => deleteRegion(region.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingRegion ? "Edit Region" : "Add New Region"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Region Code</Label>
                <Input 
                  placeholder="e.g., GCC"
                  value={form.region_code}
                  onChange={(e) => setForm({ ...form, region_code: e.target.value.toUpperCase() })}
                  className="bg-secondary/30"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Region Name</Label>
                <Input 
                  placeholder="e.g., GCC / Gulf Premium"
                  value={form.region_name}
                  onChange={(e) => setForm({ ...form, region_name: e.target.value })}
                  className="bg-secondary/30"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Price Multiplier</Label>
              <div className="flex items-center gap-4">
                <Input 
                  type="number"
                  step="0.05"
                  min="1"
                  max="5"
                  value={form.multiplier}
                  onChange={(e) => setForm({ ...form, multiplier: e.target.value })}
                  className="bg-secondary/30 w-32"
                />
                <span className="text-sm text-muted-foreground">
                  Base price × {form.multiplier || "1.0"} = Final user price
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Assign Countries ({form.countries.length} selected)</Label>
              <ScrollArea className="h-[240px] border border-border/30 rounded-lg p-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {ALL_COUNTRIES.map((country) => (
                    <div
                      key={country.code}
                      className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                        form.countries.includes(country.code)
                          ? "bg-primary/20 border border-primary/40"
                          : "hover:bg-secondary/50"
                      }`}
                      onClick={() => toggleCountry(country.code)}
                    >
                      <Checkbox 
                        checked={form.countries.includes(country.code)}
                        onCheckedChange={() => toggleCountry(country.code)}
                      />
                      <span className="text-lg">{country.flag}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{country.name}</p>
                        <p className="text-xs text-muted-foreground">{country.code}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveRegion}>
              <Save className="h-4 w-4 mr-2" />
              {editingRegion ? "Update Region" : "Create Region"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
