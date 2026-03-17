import { Link } from "react-router-dom";
import { 
  Send as Telegram,
  Twitter,
} from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";

export const Footer = () => {
  const { t } = useLocalization();

  const footerLinks = {
    product: [
      { label: t("Services"), href: "/services" },
      { label: t("New Order"), href: "/new-order" },
      { label: t("API Documentation"), href: "/api-docs" },
      { label: t("Updates"), href: "/updates" },
    ],
    company: [
      { label: t("About Us"), href: "/about" },
      { label: t("Terms of Service"), href: "/terms" },
      { label: t("Privacy Policy"), href: "/privacy" },
      { label: t("Contact"), href: "/support" },
    ],
    support: [
      { label: t("Help Center"), href: "/support" },
      { label: t("FAQ"), href: "/faq" },
      { label: t("Status"), href: "/status" },
    ],
  };

  const socialLinks = [
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Telegram, href: "#", label: "Telegram" },
  ];

  return (
    <footer className="border-t border-border/30 bg-card/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-md bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="font-display text-xs font-bold text-primary-foreground">GS</span>
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-display text-base font-bold tracking-wider text-foreground">SMM DADDY</span>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs">
              {t("Enterprise-grade social media growth infrastructure for creators and businesses.")}
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="h-8 w-8 rounded-md bg-secondary/50 border border-border/30 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-display text-sm font-semibold text-foreground mb-4">{t("Product")}</h4>
            <ul className="space-y-2.5">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link 
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-display text-sm font-semibold text-foreground mb-4">{t("Company")}</h4>
            <ul className="space-y-2.5">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link 
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="font-display text-sm font-semibold text-foreground mb-4">{t("Support")}</h4>
            <ul className="space-y-2.5">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  <Link 
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} SMM Daddy. {t("All rights reserved.")}
          </p>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs text-muted-foreground">{t("All systems operational")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};