import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Wallet, 
  ShoppingCart, 
  TrendingUp, 
  Plus,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  ArrowUpRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useLocalization } from "@/contexts/LocalizationContext";

const Dashboard = () => {
  const { user, profile, wallet, loading } = useAuth();
  const { t, formatPrice } = useLocalization();
  const navigate = useNavigate();
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    spentThisMonth: 0,
    pendingOrders: 0,
    completedOrders: 0
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    // Fetch recent orders
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (orders) {
      setRecentOrders(orders.map(order => ({
        id: `#${order.order_number}`,
        service: order.link.substring(0, 35) + (order.link.length > 35 ? '...' : ''),
        quantity: order.quantity.toLocaleString(),
        status: order.status,
        price: Number(order.price),
        date: new Date(order.created_at).toLocaleDateString()
      })));
    }

    // Fetch stats
    const { count: ordersCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { count: pendingCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'pending');

    const { count: completedCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'completed');

    // Get this month's spending
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: monthlyOrders } = await supabase
      .from('orders')
      .select('price')
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString());

    const spentThisMonth = monthlyOrders?.reduce((sum, order) => sum + Number(order.price), 0) || 0;

    setStats({
      totalOrders: ordersCount || 0,
      spentThisMonth,
      pendingOrders: pendingCount || 0,
      completedOrders: completedCount || 0
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const balance = wallet?.balance || 0;
  const displayName = profile?.full_name || user.email?.split('@')[0] || 'User';

  return (
    <DashboardLayout title={t("Dashboard")} subtitle={`${t("Welcome back")}, ${displayName.split(' ')[0]}`}>
      <div className="space-y-6 animate-fade-in">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-card hover:from-primary/15 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <Link to="/dashboard/funds">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                    <Plus className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <p className="text-xs text-muted-foreground mb-0.5">{t("Balance")}</p>
              <p className="text-2xl font-display font-bold text-gradient-cyan">{formatPrice(balance)}</p>
            </CardContent>
          </Card>

          <Card className="border-border/30 bg-card/60 hover:bg-card/80 transition-colors">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                <ShoppingCart className="h-5 w-5 text-accent" />
              </div>
              <p className="text-xs text-muted-foreground mb-0.5">{t("Total Orders")}</p>
              <p className="text-2xl font-display font-bold text-foreground">{stats.totalOrders}</p>
            </CardContent>
          </Card>

          <Card className="border-border/30 bg-card/60 hover:bg-card/80 transition-colors">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center mb-3">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <p className="text-xs text-muted-foreground mb-0.5">{t("This Month")}</p>
              <p className="text-2xl font-display font-bold text-foreground">{formatPrice(stats.spentThisMonth)}</p>
            </CardContent>
          </Card>

          <Card className="border-border/30 bg-card/60 hover:bg-card/80 transition-colors">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center mb-3">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <p className="text-xs text-muted-foreground mb-0.5">{t("Pending")}</p>
              <p className="text-2xl font-display font-bold text-foreground">{stats.pendingOrders}</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Recent Orders */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card className="border-border/30 bg-card/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-display">{t("Quick Actions")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/dashboard/order" className="block">
                <Button variant="default" className="w-full justify-between h-11">
                  <span className="flex items-center">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {t("New Order")}
                  </span>
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/dashboard/funds" className="block">
                <Button variant="outline" className="w-full justify-between h-11">
                  <span className="flex items-center">
                    <Wallet className="h-4 w-4 mr-2" />
                    {t("Add Funds")}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/services" className="block">
                <Button variant="ghost" className="w-full justify-between h-11">
                  <span className="flex items-center">
                    <Package className="h-4 w-4 mr-2" />
                    {t("View Services")}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Orders */}
          <Card className="border-border/30 bg-card/60 lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between pb-4">
              <CardTitle className="text-base font-display">{t("Recent Orders")}</CardTitle>
              <Link to="/dashboard/orders">
                <Button variant="ghost" size="sm" className="text-primary text-xs">
                  {t("View All")}
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentOrders.length === 0 ? (
                <div className="text-center py-10">
                  <ShoppingCart className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">{t("No orders yet")}</p>
                  <Link to="/dashboard/order">
                    <Button size="sm">{t("Place Your First Order")}</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          order.status === 'completed' ? 'bg-success/10' :
                          order.status === 'processing' ? 'bg-primary/10' : 'bg-warning/10'
                        }`}>
                          {order.status === 'completed' ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : order.status === 'processing' ? (
                            <Clock className="h-4 w-4 text-primary" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-warning" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{order.service}</p>
                          <p className="text-xs text-muted-foreground">{order.id} • {order.quantity}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <Badge 
                          variant={
                            order.status === 'completed' ? 'success' :
                            order.status === 'processing' ? 'cyan' : 'secondary'
                          }
                          className="text-[10px]"
                        >
                          {t(order.status)}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{formatPrice(order.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;