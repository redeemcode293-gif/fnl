import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, RefreshCw, Eye, EyeOff, Lock, Terminal, Zap, Book, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocalization } from "@/contexts/LocalizationContext";
import { supabase } from "@/integrations/supabase/client";

const generateApiKey = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(40)))
    .map(b => chars[b % chars.length])
    .join('');
};

const ApiDocs = () => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLocalization();

  const API_BASE = `${typeof window !== "undefined" ? window.location.origin : ""}/api/v2`;
  const displayKey = apiKey || "YOUR_API_KEY";

  const endpoints = [
    { name: t("Get Balance"), method: "GET", endpoint: "/api/v2", action: "balance",
      description: t("Returns your current wallet balance"), params: [],
      response: `{\n  "balance": "0.00",\n  "currency": "USD"\n}` },
    { name: t("List Services"), method: "GET", endpoint: "/api/v2", action: "services",
      description: t("Returns list of all available services with pricing and limits"), params: [],
      response: `{\n  "services": [\n    {\n      "service": 1,\n      "name": "Instagram Followers",\n      "category": "Instagram",\n      "rate": "2.50",\n      "min": 100,\n      "max": 50000,\n      "refill": true,\n      "dripfeed": true\n    }\n  ]\n}` },
    { name: t("Add Order"), method: "POST", endpoint: "/api/v2", action: "add",
      description: t("Place a new order for any service"),
      params: [
        { name: "service", type: "integer", required: true, desc: t("Service ID") },
        { name: "link", type: "string", required: true, desc: t("Target URL/username") },
        { name: "quantity", type: "integer", required: true, desc: t("Order quantity") },
        { name: "runs", type: "integer", required: false, desc: t("Drip-feed runs (optional)") },
        { name: "interval", type: "integer", required: false, desc: t("Drip-feed interval in minutes") },
      ],
      response: `{\n  "order": 12345\n}` },
    { name: t("Order Status"), method: "POST", endpoint: "/api/v2", action: "status",
      description: t("Check the status of an order"),
      params: [{ name: "order", type: "integer", required: true, desc: t("Order ID") }],
      response: `{\n  "charge": "2.50",\n  "start_count": "1000",\n  "status": "Completed",\n  "remains": "0",\n  "currency": "USD"\n}` },
    { name: t("Request Refill"), method: "POST", endpoint: "/api/v2", action: "refill",
      description: t("Request a refill for eligible orders"),
      params: [{ name: "order", type: "integer", required: true, desc: t("Order ID to refill") }],
      response: `{\n  "refill": 67890,\n  "status": "Pending"\n}` },
    { name: t("Cancel Order"), method: "POST", endpoint: "/api/v2", action: "cancel",
      description: t("Cancel a pending order"),
      params: [{ name: "order", type: "integer", required: true, desc: t("Order ID to cancel") }],
      response: `{\n  "order": 12345,\n  "status": "Cancelled"\n}` },
  ];

  useEffect(() => {
    if (!authLoading) fetchOrCreateApiKey();
  }, [user, authLoading]);

  const fetchOrCreateApiKey = async () => {
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const { data: existing } = await supabase
        .from('api_keys')
        .select('api_key')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (existing?.api_key) {
        setApiKey(existing.api_key);
      } else {
        // Generate client-side key since DB trigger may not exist
        const newKeyValue = generateApiKey();
        const { data: created, error } = await supabase
          .from('api_keys')
          .insert({ user_id: user.id, api_key: newKeyValue, is_active: true })
          .select('api_key')
          .single();
        if (!error && created) setApiKey(created.api_key);
        else if (error?.code === '23505') {
          // Duplicate — fetch again
          const { data: retry } = await supabase.from('api_keys').select('api_key').eq('user_id', user.id).eq('is_active', true).maybeSingle();
          if (retry) setApiKey(retry.api_key);
        }
      }
    } catch (err) {
      console.error('API key error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyKey = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    toast({ title: t("API Key Copied"), description: t("Your API key has been copied to clipboard.") });
  };

  const handleRegenerate = async () => {
    if (!user) return;
    setIsRegenerating(true);
    try {
      await supabase.from('api_keys').update({ is_active: false }).eq('user_id', user.id);
      const newKeyValue = generateApiKey();
      const { data: newKey, error } = await supabase
        .from('api_keys')
        .insert({ user_id: user.id, api_key: newKeyValue, is_active: true })
        .select('api_key')
        .single();
      if (error) throw error;
      setApiKey(newKey.api_key);
      setShowKey(true);
      toast({ title: t("API Key Regenerated"), description: t("Your new API key is ready. Update all integrations.") });
    } catch (err: any) {
      toast({ title: t("Error"), description: err.message || t("Failed to regenerate key."), variant: "destructive" });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopySnippet = (code: string, lang: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(lang);
    setTimeout(() => setCopiedSnippet(null), 2000);
    toast({ title: t("Copied"), description: `${lang} ${t("snippet copied.")}` });
  };

  const curlCode = `curl -X POST ${API_BASE} \\
  -H "Content-Type: application/json" \\
  -d '{
    "key": "${displayKey}",
    "action": "add",
    "service": 1,
    "link": "https://instagram.com/username",
    "quantity": 1000
  }'`;

  const pythonCode = `import requests

response = requests.post(
    "${API_BASE}",
    json={
        "key": "${displayKey}",
        "action": "add",
        "service": 1,
        "link": "https://instagram.com/username",
        "quantity": 1000
    }
)
print(response.json())`;

  const phpCode = `<?php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "${API_BASE}");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    "key"      => "${displayKey}",
    "action"   => "add",
    "service"  => 1,
    "link"     => "https://instagram.com/username",
    "quantity" => 1000
]));
$response = curl_exec($ch);
curl_close($ch);
echo $response;`;

  const nodeCode = `const response = await fetch("${API_BASE}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    key: "${displayKey}",
    action: "add",
    service: 1,
    link: "https://instagram.com/username",
    quantity: 1000
  })
});
const data = await response.json();
console.log(data);`;

  if (authLoading || isLoading) {
    return (
      <DashboardLayout title={t("API Documentation")} subtitle={t("Integrate with our powerful API")}>
        <div className="space-y-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t("API Documentation")} subtitle={t("Integrate with our powerful API")}>
      <div className="space-y-6 animate-fade-in">

        {/* API Key Card */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg font-display">{t("Your API Key")}</CardTitle>
            </div>
            <CardDescription>{t("Use this key to authenticate all API requests")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Input
                  value={apiKey ? (showKey ? apiKey : "•".repeat(Math.min(apiKey.length, 44))) : ""}
                  readOnly
                  placeholder={t("Loading...")}
                  className="font-mono text-sm bg-secondary/30 border-border/30 pr-20"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowKey(!showKey)} disabled={!apiKey}>
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopyKey} disabled={!apiKey}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button variant="outline" onClick={handleRegenerate} disabled={isRegenerating || !user} className="border-border/50">
                {isRegenerating
                  ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />{t("Regenerating...")}</>
                  : <><RefreshCw className="h-4 w-4 mr-2" />{t("Regenerate")}</>}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-warning" />
              {t("Keep your API key secret. Never expose it in client-side code or commit it to version control.")}
            </p>
          </CardContent>
        </Card>

        {/* Quick Start */}
        <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg font-display">{t("Quick Start")}</CardTitle>
            </div>
            <CardDescription>{t("Get started with our API in minutes")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="curl">
              <TabsList className="bg-secondary/30 w-full grid grid-cols-4">
                {["curl", "python", "php", "node"].map(lang => (
                  <TabsTrigger key={lang} value={lang} className="text-xs capitalize">{lang === "node" ? "Node.js" : lang.charAt(0).toUpperCase() + lang.slice(1)}</TabsTrigger>
                ))}
              </TabsList>
              {[
                { value: "curl",   code: curlCode,   lang: "cURL" },
                { value: "python", code: pythonCode, lang: "Python" },
                { value: "php",    code: phpCode,    lang: "PHP" },
                { value: "node",   code: nodeCode,   lang: "Node.js" },
              ].map(({ value, code, lang }) => (
                <TabsContent key={value} value={value} className="mt-4">
                  <div className="relative">
                    <pre className="p-4 rounded-lg bg-[#0d1117] text-[#e6edf3] text-xs overflow-x-auto font-mono leading-relaxed">
                      {code}
                    </pre>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 hover:bg-white/10 text-[#e6edf3]"
                      onClick={() => handleCopySnippet(code, lang)}
                    >
                      {copiedSnippet === lang
                        ? <CheckCircle2 className="h-4 w-4 text-green-400" />
                        : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Endpoints */}
        <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Book className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg font-display">{t("API Endpoints")}</CardTitle>
            </div>
            <CardDescription>{t("All endpoints use POST with JSON body containing your key + action + params")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {endpoints.map((ep, i) => (
              <div key={i} className="p-4 rounded-lg bg-secondary/10 border border-border/30 space-y-3 hover:border-primary/20 transition-colors">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={ep.method === "GET" ? "secondary" : "default"} className="font-mono text-xs">{ep.method}</Badge>
                  <code className="text-xs text-primary font-mono">{ep.endpoint}</code>
                  <Badge variant="outline" className="font-mono text-xs">action="{ep.action}"</Badge>
                </div>
                <div>
                  <p className="text-sm font-semibold">{ep.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{ep.description}</p>
                </div>
                {ep.params.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs uppercase text-muted-foreground font-medium tracking-wider">{t("Parameters")}</p>
                    {ep.params.map((p, pi) => (
                      <div key={pi} className="flex flex-wrap items-center gap-2 text-xs">
                        <code className="text-primary font-mono">{p.name}</code>
                        <Badge variant="outline" className="text-xs">{p.type}</Badge>
                        <Badge variant={p.required ? "destructive" : "secondary"} className="text-xs">{p.required ? t("required") : t("optional")}</Badge>
                        <span className="text-muted-foreground">{p.desc}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-xs uppercase text-muted-foreground font-medium tracking-wider">{t("Response")}</p>
                  <pre className="p-3 rounded bg-[#0d1117] text-[#e6edf3] text-xs overflow-x-auto font-mono">{ep.response}</pre>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Error Codes */}
        <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-display">{t("Error Codes")}</CardTitle>
            <CardDescription>{t("Common error responses and their meanings")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">{t("Code")}</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">{t("Message")}</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">{t("Fix")}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { code: "invalid_key",        msg: t("Invalid API key"),        fix: t("Check your API key in settings") },
                    { code: "insufficient_funds",  msg: t("Insufficient balance"),   fix: t("Add funds to your wallet") },
                    { code: "invalid_service",     msg: t("Invalid service ID"),     fix: t("Use IDs from /services endpoint") },
                    { code: "invalid_quantity",    msg: t("Invalid quantity"),       fix: t("Check service min/max limits") },
                    { code: "invalid_link",        msg: t("Invalid link"),           fix: t("Provide a valid URL") },
                    { code: "order_not_found",     msg: t("Order not found"),        fix: t("Verify the order ID") },
                    { code: "refill_unavailable",  msg: t("Refill not available"),   fix: t("Service doesn't support refills") },
                  ].map((e, i) => (
                    <tr key={i} className="border-b border-border/20 hover:bg-secondary/5">
                      <td className="p-3 font-mono text-xs text-destructive">{e.code}</td>
                      <td className="p-3 text-sm">{e.msg}</td>
                      <td className="p-3 text-sm text-muted-foreground hidden sm:table-cell">{e.fix}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ApiDocs;
