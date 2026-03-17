import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageCircle, X, Send, Bot, User, Minimize2, Sparkles,
  ShoppingCart, ExternalLink, Search, RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useNavigate } from "react-router-dom";

interface PanelService {
  id: string;
  service_id: number;
  name: string;
  platform: string;
  category: string;
  price: number;
  min_quantity: number;
  max_quantity: number;
  description: string | null;
  refill_supported: boolean | null;
  dripfeed_supported: boolean | null;
}

interface ServiceCardMessage {
  type: "service_list";
  services: PanelService[];
  query: string;
}

interface TextMessage {
  type: "text";
  content: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  payload: TextMessage | ServiceCardMessage;
  timestamp: Date;
}

const PLATFORM_ICONS: Record<string, string> = {
  Instagram: "📷", YouTube: "▶️", TikTok: "🎵", Telegram: "✈️",
  X: "✖️", Facebook: "👤", Spotify: "🎧", Discord: "💬",
  Twitch: "🟣", Snapchat: "👻", WhatsApp: "💚", Threads: "🧵",
  LinkedIn: "💼", Pinterest: "📌", Reddit: "🤖", Apple: "🍎", Other: "🌐",
};

const QUICK_QUESTIONS = [
  "What services do you offer?",
  "Price of Instagram followers",
  "YouTube views cost?",
  "Telegram members pricing",
];

export const AIChatbot = () => {
  const { t, formatPrice } = useLocalization();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [services, setServices] = useState<PanelService[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial greeting
  useEffect(() => {
    setMessages([{
      id: "welcome",
      role: "assistant",
      payload: {
        type: "text",
        content: t("Hi! Ask me about any service — I'll show you real prices, IDs, and a direct buy button. Try: 'Instagram followers' or 'YouTube views price'"),
      },
      timestamp: new Date(),
    }]);
  }, [t]);

  // Fetch ALL services (no limit)
  const fetchServices = useCallback(async () => {
    setLoadingServices(true);
    try {
      // Fetch in pages to bypass the 1000-row PostgREST limit
      const allServices: PanelService[] = [];
      let page = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("panel_services")
          .select("id, service_id, name, platform, category, price, min_quantity, max_quantity, description, refill_supported, dripfeed_supported")
          .eq("is_visible", true)
          .order("platform").order("category").order("price")
          .range(page * pageSize, (page + 1) * pageSize - 1);
        if (error || !data || data.length === 0) break;
        allServices.push(...data);
        if (data.length < pageSize) break;
        page++;
      }
      setServices(allServices);
    } catch (e) {
      console.error("Chatbot service fetch error:", e);
    } finally {
      setLoadingServices(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ── Response logic ──────────────────────────────────────────────────────
  const buildResponse = useCallback((userInput: string): Message["payload"] => {
    const q = userInput.toLowerCase().trim();

    // ── Service + price queries → return service cards ──
    const platformMap: Record<string, string> = {
      instagram: "Instagram", youtube: "YouTube", yt: "YouTube",
      tiktok: "TikTok", "tik tok": "TikTok",
      telegram: "Telegram", twitter: "X", "x ": "X",
      facebook: "Facebook", fb: "Facebook",
      spotify: "Spotify", discord: "Discord", twitch: "Twitch",
      snapchat: "Snapchat", whatsapp: "WhatsApp",
      threads: "Threads", linkedin: "LinkedIn",
      pinterest: "Pinterest", reddit: "Reddit", apple: "Apple",
    };

    const categoryKeywords: Record<string, string[]> = {
      followers: ["follower", "follow", "subscriber", "sub "],
      views: ["view", "watch", "impression", "reel view"],
      likes: ["like", "heart", "reaction"],
      comments: ["comment"],
      members: ["member", "join"],
      shares: ["share", "repost", "retweet"],
      plays: ["play", "stream", "listen"],
    };

    // Detect platform from query
    let matchedPlatform: string | null = null;
    for (const [keyword, platform] of Object.entries(platformMap)) {
      if (q.includes(keyword)) { matchedPlatform = platform; break; }
    }

    // Detect category keyword
    let matchedCategoryKeyword: string | null = null;
    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(k => q.includes(k))) { matchedCategoryKeyword = cat; break; }
    }

    const isPriceQuery = q.includes("price") || q.includes("cost") || q.includes("how much") || q.includes("rate") || q.includes("cheap");

    if (matchedPlatform || (matchedCategoryKeyword && isPriceQuery) || isPriceQuery) {
      let filtered = services;

      if (matchedPlatform) {
        filtered = filtered.filter(s => s.platform === matchedPlatform);
      }
      if (matchedCategoryKeyword) {
        const catKws = categoryKeywords[matchedCategoryKeyword];
        filtered = filtered.filter(s =>
          catKws.some(k => s.name.toLowerCase().includes(k) || s.category.toLowerCase().includes(k))
        );
      }

      if (filtered.length > 0) {
        // Sort by price ascending, limit to 20 for readability
        const sorted = [...filtered].sort((a, b) => a.price - b.price).slice(0, 20);
        return { type: "service_list", services: sorted, query: userInput };
      }

      if (matchedPlatform) {
        return {
          type: "text",
          content: `No ${matchedPlatform} services are available right now. Please check the Services page or ask about another platform.`,
        };
      }
    }

    // ── Text responses for non-price queries ──
    if (q.includes("service") || q.includes("offer") || q.includes("what do you") || q.includes("platform")) {
      const platformCounts = services.reduce((acc, s) => { acc[s.platform] = (acc[s.platform] || 0) + 1; return acc; }, {} as Record<string, number>);
      const topPlatforms = Object.entries(platformCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([p]) => `${PLATFORM_ICONS[p] || "🌐"} ${p}`).join(", ");
      return { type: "text", content: `We offer ${services.length.toLocaleString()} services across: ${topPlatforms}. Ask me about any platform to see prices!` };
    }

    if (q.includes("order") || q.includes("buy") || q.includes("purchase") || q.includes("place")) {
      return { type: "text", content: "To order: go to Dashboard → New Order → search for your service → enter your link and quantity → place order. Or click 'Buy Now' on any service card I show you!" };
    }

    if (q.includes("deliver") || q.includes("how long") || q.includes("speed") || q.includes("fast") || q.includes("time")) {
      return { type: "text", content: "Most orders start within minutes. Completion times: Followers/Members 24–72 hours, Views/Likes 1–24 hours, Comments 2–12 hours. Speed depends on the specific service." };
    }

    if (q.includes("refill") || q.includes("drop") || q.includes("guarantee")) {
      const refillCount = services.filter(s => s.refill_supported).length;
      return { type: "text", content: `${refillCount} of our services include automatic Refill Protection. If your count drops within the guarantee period, we restore it free of charge. Look for the "Refill" badge on service cards.` };
    }

    if (q.includes("payment") || q.includes("pay") || q.includes("fund") || q.includes("crypto") || q.includes("upi")) {
      return { type: "text", content: "We accept: Cryptocurrency (USDT on TRC20/ERC20/BEP20, BTC, ETH, SOL, TON, XRP) and UPI (₹ payments). Deposits are manually verified. Go to Dashboard → Add Funds to top up your wallet." };
    }

    if (q.includes("api") || q.includes("integrate") || q.includes("reseller") || q.includes("developer")) {
      return { type: "text", content: "We have a full SMM Panel API (v2 compatible). Get your API key from Dashboard → API. Use it to integrate our services into your own panel. Documentation available there." };
    }

    if (q.includes("help") || q.includes("support") || q.includes("contact") || q.includes("ticket")) {
      return { type: "text", content: "For account issues, billing, or order problems — open a Support Ticket from Dashboard → Support. For service questions, just ask me!" };
    }

    if (q.includes("balance") || q.includes("wallet") || q.includes("money")) {
      return { type: "text", content: "Your wallet balance is shown in the sidebar. To add funds: Dashboard → Add Funds. We accept crypto and UPI." };
    }

    // Show all affordable services if asking about cheap/budget
    if (q.includes("cheap") || q.includes("budget") || q.includes("affordable") || q.includes("lowest")) {
      const cheap = [...services].sort((a, b) => a.price - b.price).slice(0, 15);
      if (cheap.length > 0) return { type: "service_list", services: cheap, query: "cheapest services" };
    }

    return {
      type: "text",
      content: `I can help with service pricing, ordering, delivery, refills, and payments. Try asking: "Instagram followers price" or "TikTok views cost" to see live prices!`,
    };
  }, [services]);

  const handleSend = useCallback((text?: string) => {
    const msg = (text || input).trim();
    if (!msg) return;
    setInput("");

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      payload: { type: "text", content: msg },
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      const responsePayload = buildResponse(msg);
      setMessages(prev => [...prev, {
        id: `a-${Date.now()}`,
        role: "assistant",
        payload: responsePayload,
        timestamp: new Date(),
      }]);
      setIsTyping(false);
    }, 400 + Math.random() * 600);
  }, [input, buildResponse]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleBuyNow = (svc: PanelService) => {
    // Store selected service in sessionStorage so NewOrder can pick it up
    sessionStorage.setItem("chatbot_selected_service", JSON.stringify({ id: svc.id, name: svc.name }));
    navigate("/dashboard/order");
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-12 px-4 rounded-full shadow-lg z-50 flex items-center gap-2"
      >
        <MessageCircle className="h-5 w-5" />
        <span className="font-medium">{t("Support")}</span>
        {services.length > 0 && (
          <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{services.length.toLocaleString()}</Badge>
        )}
      </Button>
    );
  }

  return (
    <Card className={`fixed bottom-6 right-6 z-50 border-border/30 bg-card/95 backdrop-blur-xl shadow-2xl transition-all duration-300 ${
      isMinimized ? "w-72 h-14" : "w-80 sm:w-[420px] h-[560px]"
    } flex flex-col overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/30 bg-gradient-to-r from-primary/10 to-accent/10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">{t("AI Assistant")}</p>
            {!isMinimized && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                Online · {loadingServices ? "loading…" : `${services.length.toLocaleString()} services`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsMinimized(!isMinimized)}>
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  {/* Avatar */}
                  <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-1 ${
                    msg.role === "assistant" ? "bg-gradient-to-br from-primary to-accent" : "bg-secondary"
                  }`}>
                    {msg.role === "assistant" ? <Bot className="h-3 w-3 text-primary-foreground" /> : <User className="h-3 w-3 text-muted-foreground" />}
                  </div>

                  {/* Bubble */}
                  <div className={`max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                    {msg.payload.type === "text" ? (
                      <div className={`rounded-lg p-2.5 text-sm leading-relaxed ${
                        msg.role === "assistant" ? "bg-secondary/50 text-foreground" : "bg-primary text-primary-foreground"
                      }`}>
                        {msg.payload.content}
                      </div>
                    ) : (
                      /* Service cards */
                      <div className="space-y-1.5 w-full">
                        <p className="text-xs text-muted-foreground px-1">
                          Showing {msg.payload.services.length} services for "{msg.payload.query}"
                        </p>
                        {msg.payload.services.map(svc => (
                          <div
                            key={svc.id}
                            className="rounded-lg border border-border/30 bg-card p-2.5 hover:border-primary/30 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-mono text-muted-foreground/60">#{svc.service_id}</span>
                                  {svc.refill_supported && (
                                    <span className="text-[9px] text-success border border-success/30 rounded px-1">Refill</span>
                                  )}
                                </div>
                                <p className="text-xs font-medium text-foreground leading-tight mt-0.5">{svc.name}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {PLATFORM_ICONS[svc.platform] || "🌐"} {svc.platform} · {svc.category}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-bold text-primary">{formatPrice(svc.price)}/1K</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {svc.min_quantity.toLocaleString()}–{svc.max_quantity.toLocaleString()}
                                </p>
                              </div>
                            </div>
                            {/* Action buttons */}
                            <div className="flex gap-1.5 mt-2">
                              <Button
                                size="sm"
                                className="h-6 text-[11px] px-2.5 flex-1"
                                onClick={() => handleBuyNow(svc)}
                              >
                                <ShoppingCart className="h-3 w-3 mr-1" />Buy Now
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[11px] px-2 border-border/40"
                                onClick={() => navigate(`/dashboard/order?service=${svc.service_id}`)}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {msg.payload.services.length === 20 && (
                          <p className="text-[10px] text-muted-foreground text-center px-1">
                            Showing top 20 by price. Ask for a specific type to narrow results.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Bot className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-2.5">
                    <div className="flex gap-1">
                      {[0, 100, 200].map(d => (
                        <span key={d} className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Quick questions */}
          {messages.length <= 2 && (
            <div className="px-3 pb-2 shrink-0">
              <p className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />Quick questions
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_QUESTIONS.map((q, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 hover:border-primary/30 transition-colors text-xs"
                    onClick={() => handleSend(q)}
                  >
                    {q}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-border/30 shrink-0">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("Ask about any service or price…")}
                className="flex-1 bg-secondary/30 border-border/30 text-sm h-9"
              />
              <Button size="icon" className="h-9 w-9 shrink-0" onClick={() => handleSend()} disabled={!input.trim() || isTyping}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
};

export default AIChatbot;
