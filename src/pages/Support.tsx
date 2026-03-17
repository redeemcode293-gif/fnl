import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  HelpCircle,
  MessageSquare,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Search,
  Book,
  Headphones,
  ArrowLeft,
  User,
  Shield,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLocalization } from "@/contexts/LocalizationContext";

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

const Support = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("");
  const [orderId, setOrderId] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLocalization();

  const faqs = [
    { q: t("How long does order delivery take?"), a: t("Delivery time varies by service. Check the estimated speed shown on each service.") },
    { q: t("What happens if my order is not completed?"), a: t("If an order cannot be completed, you will receive an automatic refund to your wallet.") },
    { q: t("How do refills work?"), a: t("Services with drop-managed protection automatically restore any drops within the guarantee period.") },
    { q: t("Can I cancel an order?"), a: t("Orders can only be cancelled if they haven't started processing yet.") },
    { q: t("How do I add funds?"), a: t("Go to Add Funds page and choose from crypto, card, or UPI payment methods.") },
    { q: t("What is the API for?"), a: t("The API allows you to integrate our services into your own platform or automate orders.") },
    { q: t("How do referrals work?"), a: t("Share your referral link and earn commission on every order placed by referred users.") },
  ];

  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof CheckCircle2 }> = {
    open: { label: t("Open"), variant: "default", icon: MessageSquare },
    pending: { label: t("Pending"), variant: "secondary", icon: Clock },
    resolved: { label: t("Resolved"), variant: "outline", icon: CheckCircle2 },
    closed: { label: t("Closed"), variant: "outline", icon: CheckCircle2 },
  };

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user]);

  const fetchTickets = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTickets(data);
    }
    setLoading(false);
  };

  const fetchTicketMessages = async (ticketId: string) => {
    const { data, error } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setTicketMessages(data);
    }
  };

  const handleTicketClick = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    await fetchTicketMessages(ticket.id);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: t("Not Authenticated"),
        description: t("Please sign in to create a ticket."),
        variant: "destructive",
      });
      return;
    }

    if (!subject.trim() || !message.trim() || !priority) {
      toast({
        title: t("Missing Information"),
        description: t("Please fill all required fields."),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;
    const fullMessage = orderId ? `Order ID: ${orderId}\n\n${message}` : message;

    const { data: ticketData, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        user_id: user.id,
        ticket_number: ticketNumber,
        subject,
        message: fullMessage,
        priority,
        status: 'open'
      })
      .select()
      .single();

    if (ticketError) {
      toast({
        title: t("Error"),
        description: t("Failed to create ticket. Please try again."),
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // Add initial message to ticket_messages
    await supabase.from('ticket_messages').insert({
      ticket_id: ticketData.id,
      user_id: user.id,
      message: fullMessage,
      is_admin: false
    });

    toast({
      title: t("Ticket Created"),
      description: t(`Your ticket ${ticketNumber} has been submitted. We'll respond within 24 hours.`),
    });

    setSubject("");
    setMessage("");
    setPriority("");
    setOrderId("");
    setIsSubmitting(false);
    fetchTickets();
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyMessage.trim() || !user) return;

    setIsSendingReply(true);

    const { error } = await supabase.from('ticket_messages').insert({
      ticket_id: selectedTicket.id,
      user_id: user.id,
      message: replyMessage,
      is_admin: false
    });

    if (error) {
      toast({
        title: t("Error"),
        description: t("Failed to send message."),
        variant: "destructive",
      });
    } else {
      setReplyMessage("");
      await fetchTicketMessages(selectedTicket.id);
      toast({
        title: t("Message Sent"),
        description: t("Your reply has been sent."),
      });
    }

    setIsSendingReply(false);
  };

  const filteredFaqs = faqs.filter(faq => 
    faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Ticket detail view
  if (selectedTicket) {
    const status = statusConfig[selectedTicket.status] || statusConfig.open;
    const StatusIcon = status.icon;

    return (
      <DashboardLayout title={t("Support")} subtitle={t("Ticket Details")}>
        <div className="space-y-6 animate-fade-in">
          <Button 
            variant="ghost" 
            onClick={() => setSelectedTicket(null)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("Back to Tickets")}
          </Button>

          <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-sm text-primary">{selectedTicket.ticket_number}</span>
                    <Badge variant={status.variant} className="flex items-center gap-1 text-xs">
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </Badge>
                    {selectedTicket.priority === "high" && (
                      <Badge variant="destructive" className="text-xs">{t("High Priority")}</Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg font-display">{selectedTicket.subject}</CardTitle>
                  <CardDescription>
                    {t("Created on")} {new Date(selectedTicket.created_at).toLocaleString()}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Message Thread */}
              <ScrollArea className="h-[400px] pr-4 mb-4">
                <div className="space-y-4">
                  {ticketMessages.map((msg) => (
                    <div 
                      key={msg.id}
                      className={`p-4 rounded-lg ${
                        msg.is_admin 
                          ? 'bg-primary/10 border border-primary/20 ml-8' 
                          : 'bg-secondary/20 border border-border/30 mr-8'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {msg.is_admin ? (
                          <Shield className="h-4 w-4 text-primary" />
                        ) : (
                          <User className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium">
                          {msg.is_admin ? t('Support Team') : t('You')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Reply Box */}
              {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' && (
                <div className="border-t border-border/30 pt-4">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder={t("Type your reply...")}
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      className="flex-1 bg-secondary/30 border-border/30 min-h-[80px]"
                    />
                    <Button 
                      onClick={handleSendReply}
                      disabled={isSendingReply || !replyMessage.trim()}
                      className="self-end"
                    >
                      {isSendingReply ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t("Support")} subtitle={t("Get help with your account")}>
      <div className="space-y-6 animate-fade-in">
        <Tabs defaultValue="tickets" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-secondary/30 max-w-md">
            <TabsTrigger value="tickets" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <MessageSquare className="h-4 w-4 mr-2" />
              {t("Tickets")}
            </TabsTrigger>
            <TabsTrigger value="new" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Send className="h-4 w-4 mr-2" />
              {t("New Ticket")}
            </TabsTrigger>
            <TabsTrigger value="faq" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Book className="h-4 w-4 mr-2" />
              FAQ
            </TabsTrigger>
          </TabsList>

          {/* My Tickets */}
          <TabsContent value="tickets" className="mt-6">
            <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-display">{t("My Tickets")}</CardTitle>
                    <CardDescription>{t("View and manage your support tickets")}</CardDescription>
                  </div>
                  <Button variant="outline" size="icon" onClick={fetchTickets}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="text-center py-8">
                    <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">{t("No tickets yet")}</p>
                    <p className="text-sm text-muted-foreground mt-1">{t("Create a new ticket if you need help")}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tickets.map((ticket) => {
                      const status = statusConfig[ticket.status] || statusConfig.open;
                      const StatusIcon = status.icon;

                      return (
                        <div 
                          key={ticket.id}
                          onClick={() => handleTicketClick(ticket)}
                          className="p-4 rounded-lg bg-secondary/10 border border-border/30 hover:border-primary/30 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-mono text-sm text-primary">{ticket.ticket_number}</span>
                                <Badge variant={status.variant} className="flex items-center gap-1 text-xs">
                                  <StatusIcon className="h-3 w-3" />
                                  {status.label}
                                </Badge>
                                {ticket.priority === "high" && (
                                  <Badge variant="destructive" className="text-xs">{t("High Priority")}</Badge>
                                )}
                              </div>
                              <p className="font-medium text-foreground mb-1">{ticket.subject}</p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>{t("Created")}: {new Date(ticket.created_at).toLocaleDateString()}</span>
                                <span>{t("Updated")}: {new Date(ticket.updated_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* New Ticket */}
          <TabsContent value="new" className="mt-6">
            <Card className="border-border/30 bg-card/60 backdrop-blur-sm max-w-2xl">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Headphones className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg font-display">{t("Create New Ticket")}</CardTitle>
                </div>
                <CardDescription>{t("We typically respond within 24 hours")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("Priority")} *</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger className="bg-secondary/30 border-border/30">
                        <SelectValue placeholder={t("Select priority")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{t("Low")}</SelectItem>
                        <SelectItem value="medium">{t("Medium")}</SelectItem>
                        <SelectItem value="high">{t("High")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("Related Order ID")} ({t("optional")})</Label>
                    <Input
                      placeholder="e.g., ORD-8934"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      className="bg-secondary/30 border-border/30"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t("Subject")} *</Label>
                  <Input
                    placeholder={t("Brief description of your issue")}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="bg-secondary/30 border-border/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("Message")} *</Label>
                  <Textarea
                    placeholder={t("Describe your issue in detail...")}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-[150px] bg-secondary/30 border-border/30"
                  />
                </div>

                <Button 
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      {t("Creating...")}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {t("Submit Ticket")}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FAQ */}
          <TabsContent value="faq" className="mt-6">
            <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Book className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg font-display">{t("Frequently Asked Questions")}</CardTitle>
                </div>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("Search FAQ...")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-secondary/30 border-border/30"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {filteredFaqs.map((faq, index) => (
                  <div 
                    key={index}
                    className="p-4 rounded-lg bg-secondary/10 border border-border/30 hover:border-border/50 transition-colors"
                  >
                    <h4 className="font-medium text-foreground mb-2 flex items-start gap-2">
                      <HelpCircle className="h-4 w-4 text-primary mt-1 shrink-0" />
                      {faq.q}
                    </h4>
                    <p className="text-sm text-muted-foreground pl-6">{faq.a}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Support;