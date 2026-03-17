import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search,
  RefreshCw,
  Wallet,
  TrendingUp,
  TrendingDown,
  Filter
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useAuth } from "@/hooks/useAuth";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  payment_method: string | null;
  description: string | null;
  reference_id: string | null;
  created_at: string;
}

const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();
  const { t, formatPrice } = useLocalization();
  const { user } = useAuth();

  useEffect(() => {
    if (user) fetchTransactions();
  }, [user]);

  const fetchTransactions = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: t("Error"), description: t("Failed to fetch transactions"), variant: "destructive" });
    } else {
      setTransactions(data || []);
    }
    setLoading(false);
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = 
      tx.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.payment_method || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || tx.type === typeFilter;
    const matchesStatus = statusFilter === "all" || tx.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const totalDeposits = transactions
    .filter(tx => tx.type === 'deposit' && tx.status === 'completed')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const totalSpent = transactions
    .filter(tx => tx.type === 'order')
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);

  const pendingDeposits = transactions
    .filter(tx => tx.type === 'deposit' && tx.status === 'pending')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'refund':
      case 'referral_commission':
      case 'bonus':
        return <ArrowDownLeft className="h-4 w-4 text-success" />;
      default:
        return <ArrowUpRight className="h-4 w-4 text-destructive" />;
    }
  };

  const isCredit = (type: string) => 
    ['deposit', 'refund', 'referral_commission', 'bonus'].includes(type);

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'completed': return 'default';
      case 'pending': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      deposit: t("Deposit"),
      order: t("Order"),
      refund: t("Refund"),
      referral_commission: t("Referral"),
      withdrawal: t("Withdrawal"),
      bonus: t("Bonus"),
      adjustment: t("Adjustment"),
    };
    return labels[type] || type;
  };

  return (
    <DashboardLayout title={t("Transactions")} subtitle={t("Your complete payment history")}>
      <div className="space-y-6 animate-fade-in">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border/30 bg-card/60">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
                <p className="text-sm text-muted-foreground">{t("Total Deposited")}</p>
              </div>
              <p className="text-2xl font-display font-bold text-success">{formatPrice(totalDeposits)}</p>
            </CardContent>
          </Card>
          <Card className="border-border/30 bg-card/60">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                </div>
                <p className="text-sm text-muted-foreground">{t("Total Spent")}</p>
              </div>
              <p className="text-2xl font-display font-bold">{formatPrice(totalSpent)}</p>
            </CardContent>
          </Card>
          <Card className="border-border/30 bg-card/60">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">{t("Pending Deposits")}</p>
              </div>
              <p className="text-2xl font-display font-bold text-primary">{formatPrice(pendingDeposits)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {t("Transaction History")}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchTransactions} className="border-border/50">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t("Refresh")}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("Search transactions...")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-secondary/30 border-border/30"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="bg-secondary/30 border-border/30">
                  <SelectValue placeholder={t("All Types")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("All Types")}</SelectItem>
                  <SelectItem value="deposit">{t("Deposit")}</SelectItem>
                  <SelectItem value="order">{t("Order")}</SelectItem>
                  <SelectItem value="refund">{t("Refund")}</SelectItem>
                  <SelectItem value="referral_commission">{t("Referral")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-secondary/30 border-border/30">
                  <SelectValue placeholder={t("All Status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("All Status")}</SelectItem>
                  <SelectItem value="completed">{t("Completed")}</SelectItem>
                  <SelectItem value="pending">{t("Pending")}</SelectItem>
                  <SelectItem value="failed">{t("Failed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">{t("No transactions found")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary/10 hover:bg-secondary/20 transition-colors border border-border/20"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        isCredit(tx.type)
                          ? "bg-success/10"
                          : "bg-destructive/10"
                      }`}>
                        {getTypeIcon(tx.type)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{getTypeLabel(tx.type)}</p>
                        {tx.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{tx.description}</p>
                        )}
                        {tx.payment_method && (
                          <p className="text-xs text-muted-foreground/70 truncate max-w-[200px]">{tx.payment_method}</p>
                        )}
                        <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className={`font-mono text-sm font-semibold ${
                        isCredit(tx.type) ? "text-success" : "text-foreground"
                      }`}>
                        {isCredit(tx.type) ? "+" : "-"}{formatPrice(Math.abs(Number(tx.amount)))}
                      </p>
                      <Badge variant={getStatusVariant(tx.status)} className="text-xs mt-1">
                        {t(tx.status)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center pt-2">
              {t("Showing")} {filteredTransactions.length} {t("of")} {transactions.length} {t("transactions")}
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Transactions;
