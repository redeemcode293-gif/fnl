import { useState, useEffect } from "react";
import { Bell, Check, Info, AlertTriangle, Package, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Notification {
  id: string;
  type: 'order' | 'deposit' | 'info' | 'warning';
  title: string;
  message: string;
  time: Date;
  read: boolean;
}

export const NotificationPopover = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    // Fetch recent orders as notifications
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_number, status, created_at, quantity')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    // Fetch recent transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id, type, amount, status, created_at')
      .eq('user_id', user.id)
      .eq('type', 'deposit')
      .order('created_at', { ascending: false })
      .limit(3);

    const newNotifications: Notification[] = [];

    // Convert orders to notifications
    orders?.forEach(order => {
      newNotifications.push({
        id: order.id,
        type: 'order',
        title: order.status === 'completed' ? 'Order Completed' : 
               order.status === 'processing' ? 'Order Processing' : 'Order Pending',
        message: `Order ${order.order_number} • ${order.quantity.toLocaleString()} units`,
        time: new Date(order.created_at),
        read: order.status === 'completed'
      });
    });

    // Convert deposits to notifications
    transactions?.forEach(tx => {
      newNotifications.push({
        id: tx.id,
        type: 'deposit',
        title: tx.status === 'completed' ? 'Deposit Completed' : 'Deposit Pending',
        message: `$${Number(tx.amount).toFixed(2)} ${tx.status === 'completed' ? 'added to wallet' : 'awaiting approval'}`,
        time: new Date(tx.created_at),
        read: tx.status === 'completed'
      });
    });

    // Sort by time
    newNotifications.sort((a, b) => b.time.getTime() - a.time.getTime());
    
    setNotifications(newNotifications.slice(0, 8));
    setUnreadCount(newNotifications.filter(n => !n.read).length);
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'order': return <Package className="h-4 w-4 text-primary" />;
      case 'deposit': return <Wallet className="h-4 w-4 text-success" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-warning" />;
      default: return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] flex items-center justify-center text-destructive-foreground font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <h4 className="font-display font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={markAllRead}>
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[320px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center">
              <Bell className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground/70">Activity will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-border/20">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`px-4 py-3 hover:bg-secondary/30 transition-colors ${!notification.read ? 'bg-primary/5' : ''}`}
                >
                  <div className="flex gap-3">
                    <div className="mt-0.5">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{notification.title}</p>
                        {!notification.read && (
                          <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{notification.message}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">{formatTime(notification.time)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="px-4 py-2 border-t border-border/30 bg-secondary/20">
          <p className="text-[10px] text-center text-muted-foreground">Showing recent activity</p>
        </div>
      </PopoverContent>
    </Popover>
  );
};
