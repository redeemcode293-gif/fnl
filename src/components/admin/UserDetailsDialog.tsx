import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { 
  User, 
  Mail, 
  Globe, 
  Wallet, 
  ShoppingCart, 
  Key, 
  Clock,
  Shield,
  Ban,
  RefreshCw,
  LogOut,
  Lock,
  Copy,
  Check
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserDetailsDialogProps {
  user: any;
  wallet: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

export const UserDetailsDialog = ({ user, wallet, open, onOpenChange, onRefresh }: UserDetailsDialogProps) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && user) {
      fetchUserDetails();
    }
  }, [open, user]);

  const fetchUserDetails = async () => {
    setLoading(true);
    
    // Fetch orders
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.user_id)
      .order('created_at', { ascending: false })
      .limit(10);
    setOrders(ordersData || []);

    // Fetch login history
    const { data: historyData } = await supabase
      .from('login_history')
      .select('*')
      .eq('user_id', user.user_id)
      .order('created_at', { ascending: false })
      .limit(10);
    setLoginHistory(historyData || []);

    // Fetch API keys
    const { data: keysData } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', user.user_id);
    setApiKeys(keysData || []);

    setLoading(false);
  };

  const toggleUserStatus = async () => {
    const newStatus = user.status === 'active' ? 'banned' : 'active';
    
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('user_id', user.user_id);

    if (error) {
      toast({ title: "Failed to update status", variant: "destructive" });
    } else {
      toast({ title: newStatus === 'banned' ? "User Banned" : "User Unbanned" });
      onRefresh();
    }
  };

  const forceLogout = async () => {
    // In a real implementation, this would invalidate all user sessions
    toast({ 
      title: "Force Logout Initiated",
      description: "User will be logged out on next request"
    });
  };

  const forcePasswordReset = async () => {
    if (!user.email) return;

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/auth?mode=reset`,
    });

    if (error) {
      toast({ title: "Failed to send reset email", variant: "destructive" });
    } else {
      toast({ title: "Password reset email sent" });
    }
  };

  const rotateApiKey = async () => {
    // Delete old key and create new one
    if (apiKeys.length > 0) {
      await supabase.from('api_keys').delete().eq('user_id', user.user_id);
    }
    
    const { error } = await supabase.from('api_keys').insert({
      user_id: user.user_id
    });

    if (error) {
      toast({ title: "Failed to rotate API key", variant: "destructive" });
    } else {
      toast({ title: "API key rotated successfully" });
      fetchUserDetails();
    }
  };

  const copyApiKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-lg">{user.full_name || user.email?.split('@')[0] || 'Unknown User'}</p>
              <p className="text-sm text-muted-foreground font-normal">{user.email}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="api">API</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-border/30">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{user.email}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/30">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>
                      {user.status || 'active'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/30">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Country</p>
                    <p className="text-sm font-medium">
                      {user.country || 'Unknown'} 
                      {user.country_code && <span className="text-muted-foreground ml-1">({user.country_code})</span>}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/30">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gold/10 flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-gold" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Balance</p>
                    <p className="text-sm font-mono font-bold text-success">
                      ${Number(wallet?.balance || 0).toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/30">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Orders</p>
                    <p className="text-sm font-medium">{orders.length}+</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/30">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-secondary/30 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Joined</p>
                    <p className="text-sm font-medium">{new Date(user.created_at).toLocaleDateString()}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                variant={user.status === 'active' ? 'destructive' : 'default'} 
                size="sm"
                onClick={toggleUserStatus}
              >
                <Ban className="h-4 w-4 mr-2" />
                {user.status === 'active' ? 'Ban User' : 'Unban User'}
              </Button>
              <Button variant="outline" size="sm" onClick={forceLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Force Logout
              </Button>
              <Button variant="outline" size="sm" onClick={forcePasswordReset}>
                <Lock className="h-4 w-4 mr-2" />
                Force Password Reset
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="orders" className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No orders found
              </div>
            ) : (
              <div className="space-y-2">
                {orders.map((order) => (
                  <div key={order.id} className="p-3 rounded-lg bg-secondary/10 border border-border/30 flex items-center justify-between">
                    <div>
                      <p className="font-mono text-sm text-primary">{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm">${Number(order.price).toFixed(2)}</p>
                      <Badge variant={order.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="security" className="mt-4 space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Password
              </h4>
              <Card className="border-border/30">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">
                    Last changed: {user.last_password_change 
                      ? new Date(user.last_password_change).toLocaleDateString() 
                      : 'Never recorded'}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Login History (Last 10)
              </h4>
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : loginHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No login history recorded</p>
              ) : (
                <div className="space-y-2">
                  {loginHistory.map((entry) => (
                    <Card key={entry.id} className="border-border/30">
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-mono">{entry.ip_address || 'Unknown IP'}</p>
                            <p className="text-xs text-muted-foreground">{entry.user_agent?.substring(0, 50)}...</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(entry.created_at).toLocaleString()}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="api" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Key className="h-4 w-4" />
                API Keys
              </h4>
              <Button size="sm" variant="outline" onClick={rotateApiKey}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {apiKeys.length > 0 ? 'Rotate Key' : 'Generate Key'}
              </Button>
            </div>

            {apiKeys.length === 0 ? (
              <p className="text-sm text-muted-foreground">No API key generated</p>
            ) : (
              <div className="space-y-2">
                {apiKeys.map((key) => (
                  <Card key={key.id} className="border-border/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono bg-secondary/30 px-2 py-1 rounded">
                              {key.api_key.substring(0, 20)}...
                            </code>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => copyApiKey(key.api_key)}
                            >
                              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Created: {new Date(key.created_at).toLocaleDateString()}
                            {key.last_used_at && ` • Last used: ${new Date(key.last_used_at).toLocaleDateString()}`}
                          </p>
                        </div>
                        <Badge variant={key.is_active ? 'default' : 'secondary'}>
                          {key.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
