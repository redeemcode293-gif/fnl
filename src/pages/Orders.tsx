import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ExternalLink,
  Copy,
  ShoppingCart,
  Zap,
  Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocalization } from "@/contexts/LocalizationContext";
import { supabase } from "@/integrations/supabase/client";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof CheckCircle2; color: string }> = {
  completed: { label: "Completed", variant: "default", icon: CheckCircle2, color: "text-success" },
  processing: { label: "Processing", variant: "secondary", icon: Clock, color: "text-primary" },
  pending: { label: "Pending", variant: "outline", icon: AlertCircle, color: "text-muted-foreground" },
  cancelled: { label: "Cancelled", variant: "destructive", icon: XCircle, color: "text-destructive" },
  partial: { label: "Partial", variant: "secondary", icon: AlertCircle, color: "text-accent" },
  in_progress: { label: "In Progress", variant: "secondary", icon: Zap, color: "text-primary" },
  refunded: { label: "Refunded", variant: "outline", icon: RefreshCw, color: "text-muted-foreground" },
};

const Orders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { t, formatPrice } = useLocalization();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchOrders();
      const channel = supabase
        .channel('orders-realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          if (payload.eventType === 'UPDATE') {
            setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o));
          } else if (payload.eventType === 'INSERT') {
            setOrders(prev => [payload.new as any, ...prev]);
          }
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: t("Error"), description: t("Failed to fetch orders"), variant: "destructive" });
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      (order.order_number || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.link || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleRefreshOrder = async (orderId: string) => {
    setRefreshingId(orderId);
    try {
      // Call edge function to poll provider for latest status
      const { data: statusData } = await supabase.functions.invoke('check-order-status', {
        body: { orderId }
      });
      if (statusData?.status) {
        setOrders(prev => prev.map(o => o.id === orderId ? {
          ...o,
          status: statusData.status,
          start_count: statusData.start_count ?? o.start_count,
          remains: statusData.remains ?? o.remains,
        } : o));
      }
    } catch {
      // Fallback: just re-fetch from DB
      const { data } = await supabase.from('orders').select('*').eq('id', orderId).single();
      if (data) setOrders(prev => prev.map(o => o.id === orderId ? data : o));
    }
    toast({ title: t("Status Refreshed") });
    setRefreshingId(null);
  };

  const handleCopyId = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: t("Copied"), description: t("Copied to clipboard.") });
  };

  const handleRequestRefill = async (orderId: string) => {
    if (!user) return;
    const { error } = await supabase.from('refills').insert({
      order_id: orderId,
      user_id: user.id,
      status: 'pending'
    });
    if (error) {
      toast({ title: t("Error"), description: t("Failed to request refill"), variant: "destructive" });
    } else {
      toast({ title: t("Refill Requested"), description: t("Your refill request has been submitted.") });
    }
  };

  const getProgress = (order: any) => {
    if (!order.start_count || order.remains == null) return null;
    const delivered = order.quantity - order.remains;
    return Math.min(100, Math.max(0, Math.round((delivered / order.quantity) * 100)));
  };

  const orderStats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing' || o.status === 'in_progress').length,
    completed: orders.filter(o => o.status === 'completed').length,
  };

  if (loading) {
    return (
      <DashboardLayout title={t("Orders")} subtitle={t("Track and manage your orders")}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
          <Skeleton className="h-12 w-full" />
          {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t("Orders")} subtitle={t("Track and manage your orders")}>
      <div className="space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: t("Total Orders"), value: orderStats.total },
            { label: t("Pending"), value: orderStats.pending },
            { label: t("Processing"), value: orderStats.processing },
            { label: t("Completed"), value: orderStats.completed },
          ].map(stat => (
            <Card key={stat.label} className="border-border/30 bg-card/60">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-display font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("Search by order # or link...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary/30 border-border/30"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-secondary/30 border-border/30">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder={t("Filter by status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All Status")}</SelectItem>
              {Object.entries(statusConfig).map(([key, val]) => (
                <SelectItem key={key} value={key}>{t(val.label)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchOrders} className="border-border/50 shrink-0">
            <RefreshCw className="h-4 w-4 mr-2" />{t("Refresh")}
          </Button>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <Card className="border-border/30 bg-card/60">
            <CardContent className="py-16 text-center">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground text-lg mb-2">{t("No orders found")}</p>
              <Button onClick={() => navigate('/dashboard/order')} className="mt-2">
                <ShoppingCart className="h-4 w-4 mr-2" />{t("Place First Order")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const sc = statusConfig[order.status] || statusConfig.pending;
              const StatusIcon = sc.icon;
              const progress = getProgress(order);
              return (
                <Card key={order.id} className="border-border/30 bg-card/60 backdrop-blur-sm hover:border-border/50 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <button
                            onClick={() => handleCopyId(order.order_number)}
                            className="font-mono text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            {order.order_number}
                            <Copy className="h-3 w-3 opacity-50" />
                          </button>
                          <Badge variant={sc.variant} className="flex items-center gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {t(sc.label)}
                          </Badge>
                        </div>
                        <a
                          href={order.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 truncate max-w-sm"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          {order.link}
                        </a>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          <span>{t("Qty")}: <span className="text-foreground font-medium">{order.quantity?.toLocaleString()}</span></span>
                          <span>{t("Price")}: <span className="text-foreground font-medium">{formatPrice(Number(order.price))}</span></span>
                          {order.start_count && <span>{t("Start")}: {order.start_count.toLocaleString()}</span>}
                          {order.remains != null && <span>{t("Remains")}: {order.remains.toLocaleString()}</span>}
                          <span>{new Date(order.created_at).toLocaleDateString()}</span>
                        </div>
                        {progress !== null && (
                          <div className="space-y-1">
                            <Progress value={progress} className="h-1.5" />
                            <p className="text-xs text-muted-foreground">{progress}% {t("delivered")}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRefreshOrder(order.id)}
                          disabled={refreshingId === order.id}
                          className="h-8 px-2"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${refreshingId === order.id ? 'animate-spin' : ''}`} />
                        </Button>
                        {order.status === 'completed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRequestRefill(order.id)}
                            className="h-8 text-xs border-border/50"
                          >
                            {t("Refill")}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        <p className="text-xs text-center text-muted-foreground">
          {t("Showing")} {filteredOrders.length} {t("of")} {orders.length} {t("orders")}
        </p>
      </div>
    </DashboardLayout>
  );
};

export default Orders;
