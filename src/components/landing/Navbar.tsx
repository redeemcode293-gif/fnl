import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, X, Zap } from "lucide-react";
import { CurrencySelector } from "@/components/preferences/CurrencySelector";
import { LanguageSelector } from "@/components/preferences/LanguageSelector";
import { useLocalization } from "@/contexts/LocalizationContext";

const navLinks = [
  { href: "/services", label: "Services" },
  { href: "/new-order", label: "New Order" },
  { href: "/api-docs", label: "API", badge: "PRO" },
  { href: "/updates", label: "Updates" },
];

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { t } = useLocalization();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 bg-background/90 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="relative">
              <div className="h-9 w-9 rounded-md bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="font-display text-sm font-bold text-primary-foreground">SD</span>
              </div>
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display text-lg font-bold tracking-wider text-foreground">SMM DADDY</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-2 ${
                  isActive(link.href)
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                {link.label}
                {link.badge && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/50 text-primary">
                    {link.badge}
                  </Badge>
                )}
              </Link>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-3">
            <LanguageSelector />
            <CurrencySelector />
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">{t("Sign In")}</Link>
            </Button>
            <Button variant="default" size="sm" className="gap-2" asChild>
              <Link to="/register">
                <Zap className="h-3.5 w-3.5" />
                {t("Get Started")}
              </Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="lg:hidden py-4 border-t border-border/30 animate-fade-in">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`px-3 py-2.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                    isActive(link.href)
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  {link.label}
                  {link.badge && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/50 text-primary">
                      {link.badge}
                    </Badge>
                  )}
                </Link>
              ))}
              <div className="flex flex-col gap-2 pt-4 mt-2 border-t border-border/30">
                <Button variant="ghost" size="sm" className="justify-start" asChild>
                  <Link to="/login" onClick={() => setIsOpen(false)}>{t("Sign In")}</Link>
                </Button>
                <Button variant="default" size="sm" className="justify-start gap-2" asChild>
                  <Link to="/register" onClick={() => setIsOpen(false)}>
                    <Zap className="h-3.5 w-3.5" />
                    {t("Get Started")}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};