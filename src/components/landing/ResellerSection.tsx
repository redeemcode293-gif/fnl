import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, Users, Wallet, Globe } from "lucide-react";

const benefits = [
  {
    icon: Building2,
    title: "Your Own Branded Panel",
    description: "Custom domain, logo, and branding. Your clients never know about us.",
  },
  {
    icon: Wallet,
    title: "Set Your Own Margins",
    description: "Full control over pricing. Keep 100% of your profits above base cost.",
  },
  {
    icon: Users,
    title: "Unlimited Sub-Resellers",
    description: "Build a network. Your resellers can have resellers. Multi-tier earnings.",
  },
  {
    icon: Globe,
    title: "Global Infrastructure",
    description: "Our API handles everything. Auto-delivery, failover, and support.",
  },
];

export const ResellerSection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/20 to-background" />
      <div className="absolute top-1/2 left-0 w-1/2 h-96 bg-accent/5 rounded-full blur-[150px]" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            <Badge variant="gold" className="mb-4">RESELLER PROGRAM</Badge>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
              <span className="text-foreground">Launch Your Own</span>
              <br />
              <span className="text-gradient-gold">SMM Empire</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Create your own fully-branded SMM panel in minutes. No technical skills needed. 
              Set your prices, build your team, and earn from every order in your network.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button variant="gold" size="lg" asChild>
                <Link to="/reseller" className="flex items-center gap-2">
                  Become a Reseller
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="glass" size="lg" asChild>
                <Link to="/api">API Documentation</Link>
              </Button>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                No monthly fees
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Instant setup
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                24/7 support
              </div>
            </div>
          </div>

          {/* Right Content - Benefits Grid */}
          <div className="grid grid-cols-2 gap-4">
            {benefits.map((benefit, index) => (
              <Card 
                key={benefit.title} 
                variant="glass" 
                className="hover:border-accent/30 transition-all duration-300"
              >
                <CardContent className="p-5">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                    <benefit.icon className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1 text-sm">{benefit.title}</h3>
                  <p className="text-xs text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
