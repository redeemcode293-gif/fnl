import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, Clock } from "lucide-react";

const mockOrders = [
  { id: 1, service: "Instagram Followers", quantity: "5,000", country: "US", status: "completed" },
  { id: 2, service: "YouTube Views", quantity: "10,000", country: "UK", status: "processing" },
  { id: 3, service: "Telegram Members", quantity: "2,500", country: "DE", status: "completed" },
  { id: 4, service: "TikTok Likes", quantity: "8,000", country: "BR", status: "completed" },
  { id: 5, service: "X Followers", quantity: "3,000", country: "IN", status: "processing" },
  { id: 6, service: "Instagram Likes", quantity: "15,000", country: "CA", status: "completed" },
  { id: 7, service: "YouTube Subscribers", quantity: "1,000", country: "AU", status: "processing" },
  { id: 8, service: "Facebook Page Likes", quantity: "4,000", country: "FR", status: "completed" },
];

const getCountryFlag = (code: string) => {
  const flags: Record<string, string> = {
    US: "🇺🇸", UK: "🇬🇧", DE: "🇩🇪", BR: "🇧🇷", IN: "🇮🇳", CA: "🇨🇦", AU: "🇦🇺", FR: "🇫🇷"
  };
  return flags[code] || "🌍";
};

export const LiveOrderFeed = () => {
  const [orders, setOrders] = useState(mockOrders.slice(0, 5));
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      const randomOrder = mockOrders[Math.floor(Math.random() * mockOrders.length)];
      const newOrder = {
        ...randomOrder,
        id: Date.now(),
        status: Math.random() > 0.3 ? "completed" : "processing",
      };
      
      setOrders(prev => [newOrder, ...prev.slice(0, 4)]);
      setLastUpdate(new Date());
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
            <span className="text-sm font-medium text-primary">LIVE ORDER FEED</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            <span className="text-foreground">Real-Time</span>
            <span className="text-gradient-cyan"> Global Activity</span>
          </h2>
          <p className="text-muted-foreground">Watch orders being processed from around the world</p>
        </div>

        <Card variant="glass" className="max-w-3xl mx-auto overflow-hidden">
          <CardHeader className="border-b border-border/50 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-primary" />
                Live Orders
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                Updated {lastUpdate.toLocaleTimeString()}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {orders.map((order, index) => (
                <div 
                  key={order.id} 
                  className={`flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors ${index === 0 ? 'animate-fade-in' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{getCountryFlag(order.country)}</span>
                    <div>
                      <p className="font-medium text-foreground">{order.service}</p>
                      <p className="text-sm text-muted-foreground">{order.quantity} units</p>
                    </div>
                  </div>
                  <Badge 
                    variant={order.status === "completed" ? "success" : "cyan"} 
                    className="flex items-center gap-1"
                  >
                    {order.status === "completed" ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                    {order.status === "completed" ? "Completed" : "Processing"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
