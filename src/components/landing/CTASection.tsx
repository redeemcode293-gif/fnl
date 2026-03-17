import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

export const CTASection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 mb-6 p-2 px-4 rounded-full bg-secondary/50 border border-border/50">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-foreground">Start your growth journey today</span>
          </div>
          
          <h2 className="font-display text-4xl md:text-6xl font-bold mb-6">
            <span className="text-foreground">Ready to</span>
            <br />
            <span className="text-gradient-cyan">Dominate Social?</span>
          </h2>
          
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            Join 50,000+ creators, agencies, and brands using SMM Daddy to scale their 
            social presence across the globe.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="xl" asChild>
              <Link to="/register" className="flex items-center gap-2">
                Create Free Account
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="glass" size="xl" asChild>
              <Link to="/services">Browse Services</Link>
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mt-6">
            No credit card required • Regional pricing applied automatically
          </p>
        </div>
      </div>
    </section>
  );
};
