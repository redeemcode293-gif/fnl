import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wallet,
  Bitcoin,
  Smartphone,
  Copy,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useLocalization } from "@/contexts/LocalizationContext";
import upiQr from "@/assets/upi-qr.png";

// ─── Coin definitions ─────────────────────────────────────────────────────────
type Chain = { label: string; address: string };
type CoinOption = {
  key: string;
  symbol: string;
  name: string;
  logoUrl: string;
  chains: Chain[];
};

const coins: CoinOption[] = [
  {
    key: "usdt",
    symbol: "USDT",
    name: "Tether",
    logoUrl: "https://assets.coingecko.com/coins/images/325/small/Tether.png",
    chains: [
      { label: "TRC20 — Tron Network", address: "TMgtTUTE6qNPAsqvbBsT3HRhKKiKSgFWRG" },
      { label: "ERC20 — Ethereum Network", address: "0x9bf1e0fce442ce4b29f587b77a80b4711e0b9108" },
      { label: "BEP20 — BNB Smart Chain", address: "0x9bf1e0fce442ce4b29f587b77a80b4711e0b9108" },
      { label: "Base — Base Chain", address: "0x9bf1e0fce442ce4b29f587b77a80b4711e0b9108" },
      { label: "ARB — Arbitrum One", address: "0x9bf1e0fce442ce4b29f587b77a80b4711e0b9108" },
      { label: "SOL — Solana Network", address: "67FzTxrnNA7YpxndSTY6tqXLGwi8Z9a642dQXE2vRiLm" },
      { label: "TON — TON Network", address: "UQAsKnzp1kLJWIbIJWmr6dTCgF2_RHaPPsegj01JYnuXsuwV" },
    ],
  },
  {
    key: "btc",
    symbol: "BTC",
    name: "Bitcoin",
    logoUrl: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
    chains: [{ label: "Bitcoin Network", address: "bc1qlezvg6gsuhumgdahwkuppn3tvnceaqqee37v3q" }],
  },
  {
    key: "eth",
    symbol: "ETH",
    name: "Ethereum",
    logoUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
    chains: [{ label: "Ethereum Network — ERC20", address: "0x9bf1e0fce442ce4b29f587b77a80b4711e0b9108" }],
  },
  {
    key: "trx",
    symbol: "TRX",
    name: "TRON",
    logoUrl: "https://assets.coingecko.com/coins/images/1094/small/tron-logo.png",
    chains: [{ label: "Tron Network", address: "TMgtTUTE6qNPAsqvbBsT3HRhKKiKSgFWRG" }],
  },
  {
    key: "bnb",
    symbol: "BNB",
    name: "BNB",
    logoUrl: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
    chains: [{ label: "BNB Smart Chain — BSC", address: "0x9bf1e0fce442ce4b29f587b77a80b4711e0b9108" }],
  },
  {
    key: "xrp",
    symbol: "XRP",
    name: "XRP",
    logoUrl: "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png",
    chains: [{ label: "XRP Ledger", address: "rJWLaPxrxfwVCiv9gbcoiTBeApte6pSro" }],
  },
  {
    key: "ltc",
    symbol: "LTC",
    name: "Litecoin",
    logoUrl: "https://assets.coingecko.com/coins/images/2/small/litecoin.png",
    chains: [{ label: "Litecoin Network", address: "ltc1qpenmdhl4e8g7mv7vr06cu9p5trv94dmwnj73nv" }],
  },
  {
    key: "ton",
    symbol: "TON",
    name: "Toncoin",
    logoUrl: "https://assets.coingecko.com/coins/images/17980/small/ton_symbol.png",
    chains: [{ label: "TON Network", address: "UQAsKnzp1kLJWIbIJWmr6dTCgF2_RHaPPsegj01JYnuXsuwV" }],
  },
  {
    key: "sui",
    symbol: "SUI",
    name: "Sui",
    logoUrl: "https://assets.coingecko.com/coins/images/26375/small/sui-ocean-square.png",
    chains: [{ label: "Sui Network", address: "0x03b3e4700280ccf63f435a02f659ac10005d685ee9dcc20233c914acaa309e4f" }],
  },
];

// ─── Coin Logo component ──────────────────────────────────────────────────────
const CoinLogo = ({ coin, size = 8 }: { coin: CoinOption; size?: number }) => {
  const [err, setErr] = useState(false);
  const colorMap: Record<string, string> = {
    usdt: "#26A17B", btc: "#F7931A", eth: "#627EEA", trx: "#EF0027",
    bnb: "#F3BA2F", xrp: "#00AAE4", ltc: "#A5A5A5", ton: "#0088CC", sui: "#4DA2FF",
  };
  const bg = colorMap[coin.key] ?? "#888";
  const cls = `w-${size} h-${size} rounded-full object-contain shrink-0`;
  return err ? (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0`}
      style={{ backgroundColor: bg }}
    >
      {coin.symbol[0]}
    </div>
  ) : (
    <img src={coin.logoUrl} alt={coin.symbol} className={cls} onError={() => setErr(true)} />
  );
};

const UPI_ID = "9693779042@omni";
const INR_QUICK = [100, 250, 500, 1000, 2500, 5000];
const USD_QUICK = [5, 10, 25, 50, 100, 250];

const AddFunds = () => {
  const [amount, setAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("crypto");
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [uploadedProof, setUploadedProof] = useState<File | null>(null);
  const [upiTransactionId, setUpiTransactionId] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Crypto selector — null = nothing selected yet
  const [selectedCoinKey, setSelectedCoinKey] = useState<string | null>(null);
  const [selectedChainIdx, setSelectedChainIdx] = useState<number>(0);
  const [coinDropOpen, setCoinDropOpen] = useState(false);
  const [chainDropOpen, setChainDropOpen] = useState(false);
  const coinDropRef = useRef<HTMLDivElement>(null);
  const chainDropRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();
  const { user, wallet, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { t, formatPrice, currencySymbol } = useLocalization();

  const selectedCoin = coins.find((c) => c.key === selectedCoinKey) ?? null;
  const selectedChain = selectedCoin ? selectedCoin.chains[selectedChainIdx] ?? selectedCoin.chains[0] : null;

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (coinDropRef.current && !coinDropRef.current.contains(e.target as Node)) setCoinDropOpen(false);
      if (chainDropRef.current && !chainDropRef.current.contains(e.target as Node)) setChainDropOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelectCoin = (key: string) => {
    setSelectedCoinKey(key);
    setSelectedChainIdx(0);
    setCoinDropOpen(false);
    setChainDropOpen(false);
  };

  useEffect(() => {
    if (user) fetchTransactions();
  }, [user]);

  const fetchTransactions = async () => {
    if (!user) return;
    setLoadingTransactions(true);
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setTransactions(data);
    setLoadingTransactions(false);
  };

  const handleAddFunds = async () => {
    if (!user) {
      toast({ title: t("Not Authenticated"), description: t("Please sign in to add funds."), variant: "destructive" });
      navigate("/auth");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast({ title: t("Invalid Amount"), description: t("Please enter a valid amount."), variant: "destructive" });
      return;
    }
    if (selectedMethod === "crypto" && !selectedCoin) {
      toast({ title: t("Select a Coin"), description: t("Please select a coin before submitting."), variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    try {
      const methodLabel =
        selectedMethod === "crypto"
          ? `${selectedCoin!.symbol} — ${selectedChain!.label}`
          : "UPI";

      const { error } = await supabase.from("transactions").insert({
        user_id: user.id,
        type: "deposit",
        amount: parseFloat(amount),
        status: "pending",
        payment_method: methodLabel,
        description: `${t("Deposit via")} ${methodLabel}`,
        reference_id: upiTransactionId || null,
      });
      if (error) throw error;
      toast({
        title: t("Deposit Initiated"),
        description: t("Your deposit request is pending admin verification."),
      });
      setAmount("");
      setUploadedProof(null);
      setUpiTransactionId("");
      await fetchTransactions();
    } catch (error: any) {
      toast({ title: t("Error"), description: error.message || t("Failed to initiate deposit."), variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    toast({ title: t("Copied!"), description: t("Copied to clipboard.") });
  };

  const balance = Number(wallet?.balance || 0);
  const isUsdt = selectedCoin?.key === "usdt";

  return (
    <DashboardLayout title={t("Add Funds")} subtitle={t("Top up your wallet balance")}>
      <div className="grid lg:grid-cols-3 gap-6 animate-fade-in">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Balance Card */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t("Current Balance")}</p>
                  <p className="text-4xl font-display font-bold text-gradient-cyan">{formatPrice(balance)}</p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-8 w-8 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-display">{t("Select Payment Method")}</CardTitle>
              <CardDescription>{t("Choose your preferred payment method")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs value={selectedMethod} onValueChange={(v) => { setSelectedMethod(v); setAmount(""); }}>
                <TabsList className="grid grid-cols-2 bg-secondary/30">
                  <TabsTrigger value="crypto" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Bitcoin className="h-4 w-4 mr-2" />
                    {t("Crypto")}
                  </TabsTrigger>
                  <TabsTrigger value="upi" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Smartphone className="h-4 w-4 mr-2" />
                    UPI
                  </TabsTrigger>
                </TabsList>

                {/* ===== CRYPTO TAB ===== */}
                <TabsContent value="crypto" className="mt-6 space-y-5">
                  <p className="text-sm text-muted-foreground">
                    {t("Select the coin you want to send. USDT supports multiple chains.")}
                  </p>

                  {/* Step 1 – Choose Coin */}
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Step 1 — Select Coin
                    </Label>
                    <div className="relative" ref={coinDropRef}>
                      <button
                        onClick={() => setCoinDropOpen(!coinDropOpen)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border/40 bg-secondary/10 hover:bg-secondary/20 transition-colors"
                      >
                        {selectedCoin ? (
                          <div className="flex items-center gap-3">
                            <CoinLogo coin={selectedCoin} size={8} />
                            <div className="text-left">
                              <span className="font-semibold text-foreground text-sm">{selectedCoin.symbol}</span>
                              <span className="text-muted-foreground text-sm ml-2">— {selectedCoin.name}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Choose a coin…</span>
                        )}
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${coinDropOpen ? "rotate-180" : ""}`} />
                      </button>

                      {coinDropOpen && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl border border-border/40 bg-card shadow-2xl overflow-hidden">
                          <div className="max-h-72 overflow-y-auto divide-y divide-border/20">
                            {coins.map((coin) => (
                              <button
                                key={coin.key}
                                onClick={() => handleSelectCoin(coin.key)}
                                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors text-left ${
                                  selectedCoinKey === coin.key ? "bg-primary/10" : ""
                                }`}
                              >
                                <CoinLogo coin={coin} size={8} />
                                <div className="flex-1 min-w-0">
                                  <span className="font-semibold text-sm text-foreground">{coin.symbol}</span>
                                  <span className="text-xs text-muted-foreground ml-2">{coin.name}</span>
                                  {coin.key === "usdt" && (
                                    <span className="ml-2 text-xs text-primary/70 font-medium">7 chains</span>
                                  )}
                                </div>
                                {selectedCoinKey === coin.key && (
                                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 2 – Chain selector (USDT only — dropdown) */}
                  {selectedCoin && isUsdt && (
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                        Step 2 — Select Network / Chain
                      </Label>
                      <div className="relative" ref={chainDropRef}>
                        <button
                          onClick={() => setChainDropOpen(!chainDropOpen)}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border/40 bg-secondary/10 hover:bg-secondary/20 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                            <span className="text-sm font-medium text-foreground">
                              {selectedCoin.chains[selectedChainIdx].label}
                            </span>
                          </div>
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${chainDropOpen ? "rotate-180" : ""}`} />
                        </button>

                        {chainDropOpen && (
                          <div className="absolute z-40 top-full left-0 right-0 mt-1 rounded-xl border border-border/40 bg-card shadow-2xl overflow-hidden">
                            <div className="divide-y divide-border/20">
                              {selectedCoin.chains.map((chain, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => { setSelectedChainIdx(idx); setChainDropOpen(false); }}
                                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors text-left ${
                                    selectedChainIdx === idx ? "bg-primary/10" : ""
                                  }`}
                                >
                                  <div
                                    className={`w-2 h-2 rounded-full shrink-0 ${selectedChainIdx === idx ? "bg-primary" : "bg-muted-foreground/30"}`}
                                  />
                                  <span className="text-sm font-medium text-foreground flex-1">{chain.label}</span>
                                  {selectedChainIdx === idx && (
                                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step 2/3 – Deposit Address */}
                  {selectedCoin && selectedChain && (
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                        {isUsdt ? "Step 3" : "Step 2"} — Deposit Address
                      </Label>
                      <div className="rounded-xl border border-border/40 bg-secondary/10 p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <CoinLogo coin={selectedCoin} size={10} />
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {selectedCoin.symbol}
                            </p>
                            <p className="text-xs text-muted-foreground">{selectedChain.label}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <code className="flex-1 text-xs font-mono text-primary bg-primary/5 border border-primary/15 px-3 py-3 rounded-lg break-all leading-relaxed">
                            {selectedChain.address}
                          </code>
                          <Button
                            variant="outline"
                            size="icon"
                            className="shrink-0 h-12 w-12 border-primary/30"
                            onClick={() => handleCopy(selectedChain.address, "deposit-addr")}
                          >
                            {copiedKey === "deposit-addr" ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                              <Copy className="h-5 w-5" />
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-destructive/80 flex items-center gap-1.5">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          Only send {selectedCoin.symbol} on this network. Wrong network = lost funds.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Placeholder if nothing selected */}
                  {!selectedCoin && (
                    <div className="rounded-xl border border-dashed border-border/40 p-8 text-center text-muted-foreground text-sm">
                      Select a coin above to see the deposit address
                    </div>
                  )}
                </TabsContent>

                {/* ===== UPI TAB ===== */}
                <TabsContent value="upi" className="mt-6 space-y-4">
                  <div className="p-5 rounded-xl bg-secondary/10 border border-border/30 space-y-5">
                    <div className="text-center">
                      <h3 className="font-semibold text-foreground mb-1">{t("Pay via UPI")}</h3>
                      <p className="text-sm text-muted-foreground">{t("Scan the QR code or use the UPI ID below")}</p>
                    </div>

                    {/* QR Code — loaded eagerly via import, no lazy load delay */}
                    <div className="flex justify-center">
                      <div className="bg-white p-3 rounded-xl shadow-sm border border-border/20 inline-block">
                        <img
                          src={upiQr}
                          alt="UPI QR Code"
                          width={224}
                          height={224}
                          className="w-56 h-56 object-contain"
                          loading="eager"
                          decoding="sync"
                        />
                      </div>
                    </div>

                    {/* UPI ID */}
                    <div className="space-y-2">
                      <p className="text-sm text-center text-muted-foreground">{t("UPI ID")}</p>
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <code className="text-primary bg-primary/10 border border-primary/20 px-4 py-2 rounded-lg font-mono text-sm">
                          {UPI_ID}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => handleCopy(UPI_ID, "upi-id")}
                        >
                          {copiedKey === "upi-id" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 mr-1" />
                          ) : (
                            <Copy className="h-4 w-4 mr-1" />
                          )}
                          {copiedKey === "upi-id" ? t("Copied!") : t("Copy")}
                        </Button>
                      </div>
                    </div>

                    {/* Transaction ID input */}
                    <div className="border-t border-border/20 pt-4 space-y-2">
                      <Label>{t("UPI Transaction ID (after payment)")}</Label>
                      <Input
                        placeholder="Enter your UPI Transaction ID"
                        value={upiTransactionId}
                        onChange={(e) => setUpiTransactionId(e.target.value)}
                        className="bg-secondary/30 border-border/30"
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("Enter the reference ID from your UPI app after completing payment.")}
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* ─── Amount Section ─────────────────────────────────────────── */}
              <div className="space-y-4 pt-4 border-t border-border/30">
                <div className="space-y-2">
                  <Label>
                    {selectedMethod === "upi"
                      ? t("Amount to Add (INR ₹)")
                      : t("Amount to Add (USD $)")}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                      {selectedMethod === "upi" ? "₹" : "$"}
                    </span>
                    <Input
                      type="number"
                      placeholder={t("Enter amount")}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-8 bg-secondary/30 border-border/30 text-lg"
                      min="1"
                    />
                  </div>
                </div>

                {/* Quick amounts */}
                <div className="flex flex-wrap gap-2">
                  {(selectedMethod === "upi" ? INR_QUICK : USD_QUICK).map((amt) => (
                    <Button
                      key={amt}
                      variant="outline"
                      size="sm"
                      onClick={() => setAmount(amt.toString())}
                      className={`border-border/50 ${amount === amt.toString() ? "border-primary bg-primary/10" : ""}`}
                    >
                      {selectedMethod === "upi" ? `₹${amt}` : `$${amt}`}
                    </Button>
                  ))}
                </div>

                {/* Summary pill */}
                {selectedMethod === "crypto" && selectedCoin && selectedChain && amount && parseFloat(amount) > 0 && (
                  <div className="flex items-center gap-2 flex-wrap p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                    <CoinLogo coin={selectedCoin} size={5} />
                    <span className="text-muted-foreground">Sending</span>
                    <span className="font-semibold text-foreground">{selectedCoin.symbol}</span>
                    <span className="text-muted-foreground">via</span>
                    <span className="font-medium text-foreground">{selectedChain.label}</span>
                    <span className="ml-auto font-bold text-primary">${parseFloat(amount).toFixed(2)}</span>
                  </div>
                )}

                <Button
                  className="w-full h-12 text-base"
                  onClick={handleAddFunds}
                  disabled={isProcessing || !amount || (selectedMethod === "crypto" && !selectedCoin)}
                >
                  {isProcessing ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      {t("Processing...")}
                    </>
                  ) : (
                    <>
                      <Wallet className="h-4 w-4 mr-2" />
                      {t("Submit Deposit Request")}
                      {amount && parseFloat(amount) > 0
                        ? ` — ${selectedMethod === "upi" ? "₹" : "$"}${parseFloat(amount).toFixed(2)}`
                        : ""}
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  {t("Deposits are manually verified. Your wallet will be credited after admin confirmation.")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column – Transaction History */}
        <div className="space-y-6">
          <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-display">{t("Recent Transactions")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingTransactions ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 animate-spin" />
                  {t("Loading...")}
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>{t("No transactions yet")}</p>
                </div>
              ) : (
                transactions.map((txn) => (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/10 hover:bg-secondary/20 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          txn.type === "deposit" || txn.type === "refund"
                            ? "bg-green-500/10 text-green-500"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {txn.type === "deposit" || txn.type === "refund" ? (
                          <ArrowDownLeft className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground capitalize">{t(txn.type)}</p>
                        <p className="text-xs text-muted-foreground">{new Date(txn.created_at).toLocaleDateString()}</p>
                        {txn.payment_method && (
                          <p className="text-xs text-muted-foreground/70 truncate max-w-[120px]">{txn.payment_method}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`font-mono text-sm font-medium ${
                          txn.type === "deposit" || txn.type === "refund" ? "text-green-500" : "text-foreground"
                        }`}
                      >
                        {txn.type === "deposit" || txn.type === "refund" ? "+" : ""}
                        {formatPrice(Math.abs(txn.amount))}
                      </p>
                      <Badge
                        variant={
                          txn.status === "completed"
                            ? "default"
                            : txn.status === "pending"
                            ? "secondary"
                            : "destructive"
                        }
                        className="text-xs"
                      >
                        {t(txn.status)}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AddFunds;
