import { Card, CardContent } from "@/components/ui/card";
import { getPlatformIcon, getPlatformColor } from "@/components/ui/platform-icons";

const platforms = [
  { name: "Instagram", services: "15+ Services" },
  { name: "YouTube", services: "12+ Services" },
  { name: "TikTok", services: "10+ Services" },
  { name: "X", displayName: "X (Twitter)", services: "8+ Services" },
  { name: "Telegram", services: "6+ Services" },
  { name: "Facebook", services: "7+ Services" },
  { name: "Spotify", services: "5+ Services" },
  { name: "Discord", services: "4+ Services" },
  { name: "Twitch", services: "4+ Services" },
  { name: "LinkedIn", services: "5+ Services" },
  { name: "Snapchat", services: "3+ Services" },
  { name: "Pinterest", services: "3+ Services" },
];

export const PlatformsSection = () => {
  return (
    <section className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/20 to-background" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            <span className="text-foreground">Every Platform.</span>
            <span className="text-gradient-cyan"> One Hub.</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Dominate across all major social platforms with our comprehensive service network
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6 max-w-6xl mx-auto">
          {platforms.map((platform, index) => {
            const Icon = getPlatformIcon(platform.name);
            const colorClass = getPlatformColor(platform.name);
            
            return (
              <Card 
                key={platform.name} 
                variant="glass" 
                className="group cursor-pointer hover:scale-105 transition-all duration-300 hover:border-primary/50"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-4 md:p-6 text-center">
                  <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center mx-auto mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <Icon className="h-6 w-6 md:h-7 md:w-7 text-white" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1 text-sm md:text-base">
                    {platform.displayName || platform.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">{platform.services}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
