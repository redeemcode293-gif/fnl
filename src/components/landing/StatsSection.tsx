import { useEffect, useState } from "react";

const stats = [
  { value: 50000000, suffix: "+", label: "Orders Delivered", format: "compact" },
  { value: 180, suffix: "+", label: "Countries Served", format: "number" },
  { value: 99.9, suffix: "%", label: "Success Rate", format: "decimal" },
  { value: 24, suffix: "/7", label: "Support Available", format: "number" },
];

const formatNumber = (num: number, format: string) => {
  if (format === "compact") {
    if (num >= 1000000) return `${(num / 1000000).toFixed(0)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  }
  if (format === "decimal") return num.toFixed(1);
  return num.toString();
};

export const StatsSection = () => {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="glass-card border-primary/20 p-8 md:p-12 rounded-2xl glow-cyan">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {stats.map((stat, index) => (
              <div 
                key={stat.label} 
                className="text-center"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className={`font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-2 ${animated ? 'animate-count-up' : 'opacity-0'}`}>
                  <span className="text-gradient-cyan counter-glow">
                    {formatNumber(stat.value, stat.format)}
                  </span>
                  <span className="text-foreground">{stat.suffix}</span>
                </div>
                <p className="text-muted-foreground text-sm md:text-base">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
