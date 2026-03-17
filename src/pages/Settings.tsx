import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  User,
  Lock,
  Bell,
  Eye,
  EyeOff,
  Save,
  Key,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Shield
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocalization } from "@/contexts/LocalizationContext";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  
  const { user, profile, refreshProfile } = useAuth();
  const { t } = useLocalization();
  
  // Profile
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  
  // Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Notifications
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [marketing, setMarketing] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    if (user) setEmail(user.email || "");
    if (profile) setName(profile.full_name || "");
  }, [user, profile]);

  const getUserInitials = () => {
    if (name) {
      const parts = name.trim().split(' ');
      return parts.map(p => p[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) return email.substring(0, 2).toUpperCase();
    return "U";
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!name.trim()) {
      toast({ title: t("Name Required"), description: t("Please enter your full name."), variant: "destructive" });
      return;
    }
    setIsSavingProfile(true);

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: name.trim() })
      .eq('user_id', user.id);

    if (error) {
      toast({ title: t("Error"), description: error.message, variant: "destructive" });
    } else {
      await refreshProfile();
      toast({ title: t("Profile Updated"), description: t("Your profile has been saved successfully.") });
    }
    setIsSavingProfile(false);
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({ title: t("Missing Fields"), description: t("Please fill all password fields."), variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: t("Password Too Short"), description: t("Password must be at least 6 characters."), variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: t("Password Mismatch"), description: t("New passwords do not match."), variant: "destructive" });
      return;
    }

    setIsSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      toast({ title: t("Error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("Password Changed"), description: t("Your password has been updated successfully.") });
      setNewPassword("");
      setConfirmPassword("");
    }
    setIsSavingPassword(false);
  };

  return (
    <DashboardLayout title={t("Settings")} subtitle={t("Manage your account and preferences")}>
      <div className="max-w-2xl space-y-6 animate-fade-in">
        <Tabs defaultValue="profile">
          <TabsList className="grid w-full grid-cols-3 bg-secondary/30 p-1 h-11">
            <TabsTrigger value="profile" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-9">
              <User className="h-4 w-4 mr-2" />{t("Profile")}
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-9">
              <Lock className="h-4 w-4 mr-2" />{t("Security")}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-9">
              <Bell className="h-4 w-4 mr-2" />{t("Notifications")}
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="mt-6">
            <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>{t("Profile Information")}</CardTitle>
                <CardDescription>{t("Update your personal details")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{name || t("No name set")}</p>
                    <p className="text-sm text-muted-foreground">{email}</p>
                    {profile?.country && (
                      <Badge variant="outline" className="mt-1 text-xs">{profile.country}</Badge>
                    )}
                  </div>
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">{t("Full Name")}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder={t("Your full name")}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 bg-secondary/30 border-border/30"
                    />
                  </div>
                </div>

                {/* Email (read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="email">{t("Email Address")}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      value={email}
                      disabled
                      className="pl-10 bg-secondary/10 border-border/20 opacity-70"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{t("Email cannot be changed here. Contact support if needed.")}</p>
                </div>

                {/* Account Info */}
                <div className="p-4 rounded-lg bg-secondary/10 border border-border/20 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("Account ID")}</span>
                    <span className="font-mono text-xs text-foreground">{user?.id.slice(0, 16)}...</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("Member Since")}</span>
                    <span className="text-foreground">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}</span>
                  </div>
                  {profile?.referral_code && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("Referral Code")}</span>
                      <span className="font-mono text-primary">{profile.referral_code}</span>
                    </div>
                  )}
                </div>

                <Button className="w-full" onClick={handleSaveProfile} disabled={isSavingProfile}>
                  {isSavingProfile ? (
                    <><Save className="h-4 w-4 mr-2 animate-spin" />{t("Saving...")}</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" />{t("Save Profile")}</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="mt-6">
            <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {t("Change Password")}
                </CardTitle>
                <CardDescription>{t("Keep your account secure with a strong password")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-3">
                  <Key className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">{t("You are signed in as")} <span className="text-foreground font-medium">{email}</span>. {t("Leave password blank to keep current password.")}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">{t("New Password")}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      placeholder={t("Enter new password")}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 pr-10 bg-secondary/30 border-border/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">{t("Confirm New Password")}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder={t("Confirm new password")}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10 bg-secondary/30 border-border/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {newPassword && confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />{t("Passwords do not match")}
                    </p>
                  )}
                  {newPassword && confirmPassword && newPassword === confirmPassword && (
                    <p className="text-xs text-success flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />{t("Passwords match")}
                    </p>
                  )}
                </div>

                <Button
                  className="w-full"
                  onClick={handleChangePassword}
                  disabled={isSavingPassword || !newPassword || !confirmPassword}
                >
                  {isSavingPassword ? (
                    <><Save className="h-4 w-4 mr-2 animate-spin" />{t("Updating...")}</>
                  ) : (
                    <><Lock className="h-4 w-4 mr-2" />{t("Update Password")}</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="mt-6">
            <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>{t("Notification Preferences")}</CardTitle>
                <CardDescription>{t("Control how we communicate with you")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { id: "email-notifs", label: t("Email Notifications"), desc: t("Receive important account alerts via email"), value: emailNotifs, onChange: setEmailNotifs },
                  { id: "order-updates", label: t("Order Updates"), desc: t("Get notified when order status changes"), value: orderUpdates, onChange: setOrderUpdates },
                  { id: "marketing", label: t("Promotional Emails"), desc: t("Receive deals, offers, and news"), value: marketing, onChange: setMarketing },
                ].map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/10 border border-border/20">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      id={item.id}
                      checked={item.value}
                      onCheckedChange={item.onChange}
                    />
                  </div>
                ))}
                <Button className="w-full" onClick={() => toast({ title: t("Preferences Saved"), description: t("Your notification settings have been updated.") })}>
                  <Save className="h-4 w-4 mr-2" />{t("Save Preferences")}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
