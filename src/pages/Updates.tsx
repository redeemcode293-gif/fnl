import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Megaphone, Sparkles, AlertTriangle, Wrench, Bell, Clock } from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";
import { supabase } from "@/integrations/supabase/client";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string | null;
  is_active: boolean | null;
  created_at: string;
}

const Updates = () => {
  const { t } = useLocalization();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAnnouncements(data);
    }
    setLoading(false);
  };

  const typeConfig: Record<string, { label: string; icon: typeof Sparkles; color: string; bgColor: string }> = {
    feature:     { label: t("New Feature"),  icon: Sparkles,      color: "text-success",     bgColor: "bg-success/10" },
    maintenance: { label: t("Maintenance"),  icon: Wrench,        color: "text-warning",     bgColor: "bg-warning/10" },
    improvement: { label: t("Improvement"),  icon: Bell,          color: "text-primary",     bgColor: "bg-primary/10" },
    alert:       { label: t("Alert"),        icon: AlertTriangle, color: "text-destructive",  bgColor: "bg-destructive/10" },
    news:        { label: t("News"),         icon: Megaphone,     color: "text-accent",       bgColor: "bg-accent/10" },
  };

  const getConfig = (type: string | null) => typeConfig[type || "news"] || typeConfig.news;

  const isNew = (createdAt: string) => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    return new Date(createdAt) > threeDaysAgo;
  };

  return (
    <DashboardLayout title={t("Updates")} subtitle={t("Latest announcements and news")}>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Megaphone className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-foreground">{t("Stay Updated")}</h2>
                <p className="text-muted-foreground">{t("Latest news, features, and announcements")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full" />)}
          </div>
        ) : announcements.length === 0 ? (
          <Card className="border-border/30 bg-card/60">
            <CardContent className="py-16 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
              <p className="text-muted-foreground">{t("No announcements yet. Check back soon!")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => {
              const config = getConfig(announcement.type);
              const Icon = config.icon;
              return (
                <Card key={announcement.id} className="border-border/30 bg-card/60 backdrop-blur-sm hover:border-border/50 transition-all">
                  <CardContent className="p-5">
                    <div className="flex gap-4">
                      <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={`${config.color} border-current/30 text-xs`}>{config.label}</Badge>
                            {isNew(announcement.created_at) && (
                              <Badge className="bg-success text-success-foreground text-xs">{t("NEW")}</Badge>
                            )}
                          </div>
                          <div className="flex items-center text-xs text-muted-foreground shrink-0">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(announcement.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <h3 className="font-semibold text-foreground mb-1">{announcement.title}</h3>
                        <p className="text-sm text-muted-foreground">{announcement.content}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Updates;
