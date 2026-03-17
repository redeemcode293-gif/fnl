import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Globe,
  Users,
  DollarSign,
  Settings,
  Plus,
  ExternalLink,
  Copy,
  TrendingUp,
  ShoppingCart,
  Crown,
  Sparkles,
  Check,
  Save
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const PANEL_DOMAIN = import.meta.env.VITE_PANEL_DOMAIN || "smmdaddy.com";
import { useToast } from "@/hooks/use-toast";
import { useLocalization } from "@/contexts/LocalizationContext";

const ResellerPanel = () => {
  const [hasPanel, setHasPanel] = useState(false);
  const [panelData, setPanelData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { t, formatPrice } = useLocalization();
  const { user } = useAuth();

  // Form states for creation
  const [panelName, setPanelName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [pricingMargin, setPricingMargin] = useState("20");

  // Form states for settings
  const [editPanelName, setEditPanelName] = useState("");
  const [editPricingMargin, setEditPricingMargin] = useState("");
  const [editCustomDomain, setEditCustomDomain] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");

  useEffect(() => {
    checkPanel();
  }, []);

  useEffect(() => {
    if (panelData) {
      setEditPanelName(panelData.panel_name || "");
      setEditPricingMargin(panelData.pricing_margin?.toString() || "20");
      setEditCustomDomain(panelData.custom_domain || "");
      setEditLogoUrl(panelData.logo_url || "");
    }
  }, [panelData]);

  const checkPanel = async () => {
    if (user) {
      const { data, error } = await supabase
        .from('reseller_panels')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setHasPanel(true);
        setPanelData(data);
      }
    }
    setLoading(false);
  };

  const createPanel = async () => {
    if (!panelName || !subdomain) {
      toast({
        title: t("Missing Information"),
        description: t("Please fill in panel name and subdomain"),
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    if (user) {
      const { data, error } = await supabase
        .from('reseller_panels')
        .insert({
          user_id: user.id,
          panel_name: panelName,
          subdomain: subdomain.toLowerCase().replace(/[^a-z0-9]/g, ''),
          custom_domain: customDomain || null,
          pricing_margin: parseFloat(pricingMargin),
        })
        .select()
        .single();

      if (error) {
        toast({
          title: t("Error"),
          description: error.message,
          variant: "destructive",
        });
      } else {
        setHasPanel(true);
        setPanelData(data);
        toast({
          title: t("Panel Created!"),
          description: t("Your reseller panel is now active"),
        });
      }
    }
    setCreating(false);
  };

  const saveSettings = async () => {
    if (!panelData?.id) return;
    
    setSaving(true);
    const { error } = await supabase
      .from('reseller_panels')
      .update({
        panel_name: editPanelName,
        pricing_margin: parseFloat(editPricingMargin),
        custom_domain: editCustomDomain || null,
        logo_url: editLogoUrl || null,
      })
      .eq('id', panelData.id);

    if (error) {
      toast({
        title: t("Error"),
        description: error.message,
        variant: "destructive",
      });
    } else {
      setPanelData({
        ...panelData,
        panel_name: editPanelName,
        pricing_margin: parseFloat(editPricingMargin),
        custom_domain: editCustomDomain || null,
        logo_url: editLogoUrl || null,
      });
      toast({
        title: t("Settings Saved"),
        description: t("Your panel settings have been updated"),
      });
    }
    setSaving(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: t("Copied!"),
      description: t("Link copied to clipboard"),
    });
  };

  if (loading) {
    return (
      <DashboardLayout title={t("Reseller Panel")} subtitle={t("Create and manage your white-label SMM panel")}>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!hasPanel) {
    return (
      <DashboardLayout title={t("Reseller Panel")} subtitle={t("Create your own branded SMM panel")}>
        <div className="space-y-4 md:space-y-6 animate-fade-in">
          {/* Hero Section */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 overflow-hidden relative">
            <div className="absolute inset-0 bg-hero-glow opacity-30" />
            <CardContent className="p-4 md:p-8 relative">
              <div className="flex flex-col lg:flex-row items-center gap-6 md:gap-8">
                <div className="flex-1 text-center lg:text-left">
                  <Badge variant="gold" className="mb-4">
                    <Crown className="h-3 w-3 mr-1" />
                    {t("PRO Feature")}
                  </Badge>
                  <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-4">
                    {t("Launch Your Own")} <span className="text-gradient-cyan">{t("SMM Panel")}</span>
                  </h2>
                  <p className="text-sm md:text-base text-muted-foreground max-w-xl mb-6">
                    {t("Create a fully white-labeled SMM panel with your branding. Set your own prices, manage your customers, and earn profit on every order.")}
                  </p>
                  <div className="flex flex-wrap gap-3 md:gap-4 justify-center lg:justify-start">
                    <div className="flex items-center gap-2 text-xs md:text-sm">
                      <Check className="h-4 w-4 text-success" />
                      <span>{t("Custom Branding")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs md:text-sm">
                      <Check className="h-4 w-4 text-success" />
                      <span>{t("Set Your Margins")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs md:text-sm">
                      <Check className="h-4 w-4 text-success" />
                      <span>{t("Custom Domain")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs md:text-sm">
                      <Check className="h-4 w-4 text-success" />
                      <span>{t("24/7 Support")}</span>
                    </div>
                  </div>
                </div>
                <div className="w-32 h-32 md:w-48 md:h-48 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                  <Globe className="h-16 w-16 md:h-24 md:w-24 text-primary animate-pulse" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Create Panel Form */}
          <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg md:text-xl font-display flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {t("Create Your Panel")}
              </CardTitle>
              <CardDescription>{t("Fill in the details to launch your reseller panel")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6">
              <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="panelName">{t("Panel Name")} *</Label>
                  <Input
                    id="panelName"
                    placeholder={t("My SMM Panel")}
                    value={panelName}
                    onChange={(e) => setPanelName(e.target.value)}
                    className="bg-secondary/30 border-border/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subdomain">{t("Subdomain")} *</Label>
                  <div className="flex">
                    <Input
                      id="subdomain"
                      placeholder="mysmmpanel"
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                      className="bg-secondary/30 border-border/30 rounded-r-none"
                    />
                    <div className="px-3 md:px-4 flex items-center bg-secondary/50 border border-l-0 border-border/30 rounded-r-lg text-xs md:text-sm text-muted-foreground whitespace-nowrap">
                      .{YOUR_DOMAIN}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customDomain">{t("Custom Domain")} ({t("Optional")})</Label>
                  <Input
                    id="customDomain"
                    placeholder="panel.yourdomain.com"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    className="bg-secondary/30 border-border/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="margin">{t("Pricing Margin")} (%)</Label>
                  <Input
                    id="margin"
                    type="number"
                    min="5"
                    max="100"
                    placeholder="20"
                    value={pricingMargin}
                    onChange={(e) => setPricingMargin(e.target.value)}
                    className="bg-secondary/30 border-border/30"
                  />
                  <p className="text-xs text-muted-foreground">{t("Your profit percentage on each sale")}</p>
                </div>
              </div>
              
              <Button 
                onClick={createPanel} 
                disabled={creating}
                className="w-full sm:w-auto"
              >
                {creating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                    {t("Creating...")}
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("Create Panel")}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Panel exists - show dashboard
  return (
    <DashboardLayout title={t("Reseller Panel")} subtitle={t("Manage your white-label SMM panel")}>
      <div className="space-y-4 md:space-y-6 animate-fade-in">
        {/* Panel Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Globe className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-muted-foreground">{t("Panel Status")}</p>
                  <Badge variant={panelData?.is_active ? "success" : "secondary"} className="mt-1">
                    {panelData?.is_active ? t("Active") : t("Inactive")}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5 md:h-6 md:w-6 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-muted-foreground">{t("Total Users")}</p>
                  <p className="text-lg md:text-2xl font-display font-bold text-foreground">0</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
                  <ShoppingCart className="h-5 w-5 md:h-6 md:w-6 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-muted-foreground">{t("Total Orders")}</p>
                  <p className="text-lg md:text-2xl font-display font-bold text-foreground">0</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-gold" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-muted-foreground">{t("Total Earnings")}</p>
                  <p className="text-lg md:text-2xl font-display font-bold text-foreground">{formatPrice(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel Details */}
        <Tabs defaultValue="overview" className="space-y-4 md:space-y-6">
          <TabsList className="bg-secondary/30 w-full sm:w-auto flex">
            <TabsTrigger value="overview" className="flex-1 sm:flex-none">{t("Overview")}</TabsTrigger>
            <TabsTrigger value="settings" className="flex-1 sm:flex-none">{t("Settings")}</TabsTrigger>
            <TabsTrigger value="services" className="flex-1 sm:flex-none">{t("Services")}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base md:text-lg font-display">{t("Panel Information")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3 md:gap-4">
                  <div className="p-3 md:p-4 rounded-lg bg-secondary/20">
                    <p className="text-xs md:text-sm text-muted-foreground mb-1">{t("Panel Name")}</p>
                    <p className="font-medium text-foreground">{panelData?.panel_name}</p>
                  </div>
                  <div className="p-3 md:p-4 rounded-lg bg-secondary/20">
                    <p className="text-xs md:text-sm text-muted-foreground mb-1">{t("Pricing Margin")}</p>
                    <p className="font-medium text-foreground">{panelData?.pricing_margin}%</p>
                  </div>
                  <div className="p-3 md:p-4 rounded-lg bg-secondary/20">
                    <p className="text-xs md:text-sm text-muted-foreground mb-1">{t("Panel URL")}</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-xs md:text-sm text-primary truncate">{panelData?.subdomain}.{YOUR_DOMAIN}</p>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 flex-shrink-0"
                        onClick={() => copyToClipboard(`https://${panelData?.subdomain}.${PANEL_DOMAIN}`)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {panelData?.custom_domain && (
                    <div className="p-3 md:p-4 rounded-lg bg-secondary/20">
                      <p className="text-xs md:text-sm text-muted-foreground mb-1">{t("Custom Domain")}</p>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-xs md:text-sm text-primary truncate">{panelData?.custom_domain}</p>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 flex-shrink-0"
                          onClick={() => copyToClipboard(`https://${panelData?.custom_domain}`)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 pt-4">
                  <Button className="w-full sm:w-auto">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t("Visit Panel")}
                  </Button>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Settings className="h-4 w-4 mr-2" />
                    {t("Manage Panel")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base md:text-lg font-display">{t("Panel Settings")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 md:space-y-6">
                <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="editPanelName">{t("Panel Name")}</Label>
                    <Input
                      id="editPanelName"
                      value={editPanelName}
                      onChange={(e) => setEditPanelName(e.target.value)}
                      className="bg-secondary/30 border-border/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editMargin">{t("Pricing Margin")} (%)</Label>
                    <Input
                      id="editMargin"
                      type="number"
                      min="5"
                      max="100"
                      value={editPricingMargin}
                      onChange={(e) => setEditPricingMargin(e.target.value)}
                      className="bg-secondary/30 border-border/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editDomain">{t("Custom Domain")}</Label>
                    <Input
                      id="editDomain"
                      value={editCustomDomain}
                      onChange={(e) => setEditCustomDomain(e.target.value)}
                      placeholder="panel.yourdomain.com"
                      className="bg-secondary/30 border-border/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editLogo">{t("Logo URL")}</Label>
                    <Input
                      id="editLogo"
                      value={editLogoUrl}
                      onChange={(e) => setEditLogoUrl(e.target.value)}
                      placeholder="https://..."
                      className="bg-secondary/30 border-border/30"
                    />
                  </div>
                </div>
                
                <Button onClick={saveSettings} disabled={saving} className="w-full sm:w-auto">
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                      {t("Saving...")}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {t("Save Settings")}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services">
            <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base md:text-lg font-display">{t("Available Services")}</CardTitle>
                <CardDescription>
                  {t("All services from SMM Daddy are automatically available on your panel")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 md:py-12">
                  <TrendingUp className="h-10 w-10 md:h-12 md:w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">{t("Services are automatically synced")}</p>
                  <p className="text-xs md:text-sm text-muted-foreground/70 mt-1">
                    {t("Your customers will see all available services with your custom pricing margin applied")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ResellerPanel;
