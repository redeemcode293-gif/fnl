import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Search,
  Shield
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface RefillRecord {
  id: string;
  order_id: string;
  status: string;
  created_at: string;
  orders?: {
    order_number: string;
    link: string;
    quantity: number;
    service_id: string;
  };
}

const Refills = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [requestingRefill, setRequestingRefill] = useState(false);
  const [newOrderId, setNewOrderId] = useState("");
  const [refills, setRefills] = useState<RefillRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ active: 0, completed: 0, totalRefilled: 0 });
  const { toast } = useToast();
  const { t } = useLocalization();
  const { user } = useAuth();

  useEffect(() => {
    if (user) fetchRefills();
  }, [user]);

  const fetchRefills = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('refills')
      .select('*, orders(order_number, link, quantity, service_id)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRefills(data);
      setStats({
        active: data.filter(r => r.status === 'pending' || r.status === 'processing').length,
        completed: data.filter(r => r.status === 'completed').length,
        totalRefilled: data.filter(r => r.status === 'completed').length * 100,
      });
    }
    setLoading(false);
  };

  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof CheckCircle2 }> = {
    completed: { label: t("Refilled"), variant: "default", icon: CheckCircle2 },
    processing: { label: t("Processing"), variant: "secondary", icon: Clock },
    pending: { label: t("Pending"), variant: "outline", icon: AlertCircle },
    rejected: { label: t("Rejected"), variant: "destructive", icon: XCircle },
  };

  const filteredRefills = refills.filter(refill =>
    refill.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    refill.order_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (refill.orders?.order_number || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRequestRefill = async () => {
    if (!newOrderId.trim()) {
      toast({ title: t("Order ID Required"), description: t("Please enter a valid order ID."), variant: "destructive" });
      return;
    }
    if (!user) return;

    setRequestingRefill(true);

    // Look up order by order_number
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, order_number, user_id')
      .eq('user_id', user.id)
      .or(`order_number.eq.${newOrderId.trim()},id.eq.${newOrderId.trim()}`)
      .maybeSingle();

    if (orderErr || !order) {
      toast({ title: t("Order Not Found"), description: t("No order found with that ID."), variant: "destructive" });
      setRequestingRefill(false);
      return;
    }

    const { error } = await supabase.from('refills').insert({
      order_id: order.id,
      user_id: user.id,
      status: 'pending'
    });

    if (error) {
      toast({ title: t("Error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("Refill Requested"), description: t(`Managed refill initiated for order ${order.order_number}.`) });
      setNewOrderId("");
      fetchRefills();
    }
    setRequestingRefill(false);
  };

  const statCards = [
    { label: t("Active Refills"), value: stats.active.toString(), icon: Clock, color: "text-primary" },
    { label: t("Completed"), value: stats.completed.toString(), icon: CheckCircle2, color: "text-success" },
    { label: t("Total Requests"), value: refills.length.toString(), icon: RefreshCw, color: "text-accent" },
  ];

  return (
    <DashboardLayout title={t("Refills")} subtitle={t("Managed refill protection for your orders")}>
      <div className="space-y-6 animate-fade-in">
        <Card className="border-success/20 bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-success mt-0.5" />
              <div>
                <h4 className="font-medium text-foreground mb-1">{t("Drop Protection Included")}</h4>
                <p className="text-sm text-muted-foreground">{t("Orders with managed refill are automatically protected.")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.label} className="border-border/30 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg bg-secondary/50 flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-display">{t("Request Refill")}</CardTitle>
            <CardDescription>{t("Enter an order ID or order number to request a managed refill")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder={t("Enter Order ID or Order Number (e.g., ORD-...)")}
                value={newOrderId}
                onChange={(e) => setNewOrderId(e.target.value)}
                className="bg-secondary/30 border-border/30 flex-1"
              />
              <Button onClick={handleRequestRefill} disabled={requestingRefill}>
                {requestingRefill
                  ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />{t("Requesting...")}</>
                  : <><RefreshCw className="h-4 w-4 mr-2" />{t("Request Refill")}</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg font-display">{t("Refill History")}</CardTitle>
              <CardDescription>{t("Track your refill requests")}</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("Search refills...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/30 border-border/30"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRefills.map((refill) => {
                  const status = statusConfig[refill.status] || statusConfig.pending;
                  const StatusIcon = status.icon;
                  return (
                    <div key={refill.id} className="p-4 rounded-lg bg-secondary/10 border border-border/30">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-primary">{refill.id.slice(0, 8)}...</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-mono text-sm text-muted-foreground">{refill.orders?.order_number || refill.order_id.slice(0, 8)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{new Date(refill.created_at).toLocaleString()}</p>
                          {refill.orders?.link && (
                            <p className="text-sm text-foreground truncate max-w-xs">{refill.orders.link}</p>
                          )}
                        </div>
                        <Badge variant={status.variant} className="flex items-center gap-1 shrink-0">
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                {filteredRefills.length === 0 && (
                  <div className="text-center py-8">
                    <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">{t("No refill requests found")}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Refills;
