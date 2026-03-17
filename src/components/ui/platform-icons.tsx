import { 
  Instagram, 
  Youtube, 
  Twitter, 
  Send, 
  Music2,
  Facebook,
  Twitch,
  MessageCircle,
  Disc,
  Music,
  MessageSquare,
  Globe,
  Camera,
  Linkedin,
  Image as ImageIcon,
  Star,
  type LucideIcon
} from "lucide-react";

// Platform brand colors (using Tailwind classes)
export const PLATFORM_COLORS: Record<string, string> = {
  Instagram: "from-pink-500 via-purple-500 to-orange-400",
  YouTube: "from-red-600 to-red-500",
  TikTok: "from-pink-500 via-black to-cyan-400",
  X: "from-slate-800 to-slate-600",
  Telegram: "from-blue-500 to-blue-400",
  Facebook: "from-blue-600 to-blue-500",
  Spotify: "from-green-500 to-green-400",
  Discord: "from-indigo-600 to-indigo-500",
  Twitch: "from-purple-600 to-purple-500",
  Snapchat: "from-yellow-400 to-yellow-300",
  WhatsApp: "from-green-600 to-green-500",
  Threads: "from-slate-900 to-slate-700",
  LinkedIn: "from-blue-700 to-blue-600",
  Pinterest: "from-red-600 to-red-500",
  Other: "from-slate-600 to-slate-500",
};

// Platform icons mapping
export const PLATFORM_ICONS: Record<string, LucideIcon> = {
  Instagram: Instagram,
  YouTube: Youtube,
  TikTok: Music2,
  X: Twitter,
  Telegram: Send,
  Facebook: Facebook,
  Spotify: Music,
  Discord: MessageCircle,
  Twitch: Twitch,
  Snapchat: Camera,
  WhatsApp: MessageSquare,
  Threads: Disc,
  LinkedIn: Linkedin,
  Pinterest: ImageIcon,
  Other: Globe,
  all: Star,
};

export const getPlatformIcon = (platform: string): LucideIcon => {
  return PLATFORM_ICONS[platform] || Globe;
};

export const getPlatformColor = (platform: string): string => {
  return PLATFORM_COLORS[platform] || PLATFORM_COLORS.Other;
};

interface PlatformBadgeProps {
  platform: string;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  className?: string;
}

export const PlatformBadge = ({ 
  platform, 
  size = "md", 
  showName = true,
  className = ""
}: PlatformBadgeProps) => {
  const Icon = getPlatformIcon(platform);
  const colorClass = getPlatformColor(platform);
  
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10"
  };
  
  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5"
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`${sizeClasses[size]} rounded-lg bg-gradient-to-br ${colorClass} flex items-center justify-center shadow-lg`}>
        <Icon className={`${iconSizes[size]} text-white`} />
      </div>
      {showName && (
        <span className="font-medium text-foreground">{platform}</span>
      )}
    </div>
  );
};

// Platform list for filters
export const PLATFORMS = [
  { id: "all", name: "All", icon: Star },
  { id: "Instagram", name: "Instagram", icon: Instagram },
  { id: "YouTube", name: "YouTube", icon: Youtube },
  { id: "TikTok", name: "TikTok", icon: Music2 },
  { id: "X", name: "X (Twitter)", icon: Twitter },
  { id: "Telegram", name: "Telegram", icon: Send },
  { id: "Facebook", name: "Facebook", icon: Facebook },
  { id: "Spotify", name: "Spotify", icon: Music },
  { id: "Discord", name: "Discord", icon: MessageCircle },
  { id: "Twitch", name: "Twitch", icon: Twitch },
  { id: "Snapchat", name: "Snapchat", icon: Camera },
  { id: "WhatsApp", name: "WhatsApp", icon: MessageSquare },
  { id: "Threads", name: "Threads", icon: Disc },
  { id: "LinkedIn", name: "LinkedIn", icon: Linkedin },
  { id: "Pinterest", name: "Pinterest", icon: ImageIcon },
  { id: "Other", name: "Others", icon: Globe },
];
