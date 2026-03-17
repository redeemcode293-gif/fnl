import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Globe, 
  Zap, 
  Shield, 
  RefreshCw, 
  Users, 
  BarChart3,
  Lock,
  Cpu
} from "lucide-react";

const features = [
  {
    icon: Globe,
    title: "Region-Optimized Pricing",
    description: "Smart geo-detection automatically applies regional pricing. Fair rates for every market.",
    badge: "SMART",
    badgeVariant: "cyan" as const,
  },
  {
    icon: Zap,
    title: "Instant Auto-Delivery",
    description: "Orders start processing within seconds. Multi-provider failover ensures 99.9% delivery.",
    badge: "FAST",
    badgeVariant: "gold" as const,
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-grade encryption, DDoS protection, and secure payment processing.",
    badge: "SECURE",
    badgeVariant: "success" as const,
  },
  {
    icon: RefreshCw,
    title: "Auto-Refill Guarantee",
    description: "Automatic refills for drops within warranty period. No manual requests needed.",
    badge: null,
    badgeVariant: "cyan" as const,
  },
  {
    icon: Users,
    title: "Reseller Infrastructure",
    description: "Create your own branded panel. Set custom margins. Build your network.",
    badge: "HOT",
    badgeVariant: "gold" as const,
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description: "Track orders, revenue, and growth metrics with live dashboard updates.",
    badge: null,
    badgeVariant: "cyan" as const,
  },
  {
    icon: Lock,
    title: "Privacy First",
    description: "No password required. We never access your accounts. Safe & anonymous.",
    badge: null,
    badgeVariant: "cyan" as const,
  },
  {
    icon: Cpu,
    title: "Powerful API",
    description: "Full REST API for automation. Integrate with your apps and workflows.",
    badge: "DEV",
    badgeVariant: "cyan" as const,
  },
];

export const FeaturesSection = () => {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="glow" className="mb-4">INFRASTRUCTURE</Badge>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            <span className="text-foreground">Built for</span>
            <span className="text-gradient-gold"> Global Scale</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Enterprise-grade infrastructure powering social growth for creators, agencies, and resellers worldwide
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <Card 
              key={feature.title} 
              variant="glass" 
              className="group hover:border-primary/30 transition-all duration-300"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-300">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  {feature.badge && (
                    <Badge variant={feature.badgeVariant} className="text-[10px]">
                      {feature.badge}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg mt-4">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
