import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LocalizationContextType {
  language: string;
  currency: string;
  currencySymbol: string;
  setLanguage: (lang: string) => void;
  setCurrency: (curr: string) => void;
  t: (text: string) => string;
  formatPrice: (priceUSD: number) => string;
  isTranslating: boolean;
}

// More accurate exchange rates (as of Dec 2024)
const currencyData: Record<string, { symbol: string; rate: number }> = {
  USD: { symbol: "$", rate: 1 },
  EUR: { symbol: "€", rate: 0.95 },
  GBP: { symbol: "£", rate: 0.79 },
  INR: { symbol: "₹", rate: 84.0 },
  AED: { symbol: "د.إ", rate: 3.67 },
  SAR: { symbol: "ر.س", rate: 3.75 },
  CAD: { symbol: "C$", rate: 1.42 },
  AUD: { symbol: "A$", rate: 1.56 },
  JPY: { symbol: "¥", rate: 154 },
  CNY: { symbol: "¥", rate: 7.25 },
  KRW: { symbol: "₩", rate: 1410 },
  BRL: { symbol: "R$", rate: 6.05 },
  MXN: { symbol: "$", rate: 20.2 },
  RUB: { symbol: "₽", rate: 104 },
  TRY: { symbol: "₺", rate: 35.0 },
  IDR: { symbol: "Rp", rate: 16100 },
  MYR: { symbol: "RM", rate: 4.47 },
  THB: { symbol: "฿", rate: 34.5 },
  VND: { symbol: "₫", rate: 25400 },
  PHP: { symbol: "₱", rate: 58.5 },
  PKR: { symbol: "₨", rate: 278 },
  BDT: { symbol: "৳", rate: 121 },
  NGN: { symbol: "₦", rate: 1650 },
  EGP: { symbol: "E£", rate: 50.5 },
  ZAR: { symbol: "R", rate: 18.2 },
  PLN: { symbol: "zł", rate: 4.05 },
  UAH: { symbol: "₴", rate: 41.5 },
  CZK: { symbol: "Kč", rate: 24.0 },
  SEK: { symbol: "kr", rate: 11.0 },
  NOK: { symbol: "kr", rate: 11.3 },
  DKK: { symbol: "kr", rate: 7.10 },
  CHF: { symbol: "CHF", rate: 0.89 },
  SGD: { symbol: "S$", rate: 1.35 },
  HKD: { symbol: "HK$", rate: 7.78 },
  NZD: { symbol: "NZ$", rate: 1.78 },
  ILS: { symbol: "₪", rate: 3.68 },
  CLP: { symbol: "$", rate: 980 },
  COP: { symbol: "$", rate: 4380 },
  ARS: { symbol: "$", rate: 1020 },
  PEN: { symbol: "S/", rate: 3.78 },
  TWD: { symbol: "NT$", rate: 32.5 },
  QAR: { symbol: "ر.ق", rate: 3.64 },
  KWD: { symbol: "د.ك", rate: 0.31 },
  BHD: { symbol: "د.ب", rate: 0.38 },
  OMR: { symbol: "ر.ع", rate: 0.39 },
  JOD: { symbol: "د.أ", rate: 0.71 },
  LKR: { symbol: "Rs", rate: 295 },
  NPR: { symbol: "रू", rate: 135 },
  KES: { symbol: "KSh", rate: 154 },
  GHS: { symbol: "₵", rate: 15.8 },
};

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export const LocalizationProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState("en");
  const [currency, setCurrencyState] = useState("USD");
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState(false);
  
  // Use ref to collect texts without triggering re-renders
  const pendingTextsRef = useRef<Set<string>>(new Set());
  const translationRequestedRef = useRef(false);

  // Load saved preferences
  useEffect(() => {
    const savedLang = localStorage.getItem("preferredLanguage");
    const savedCurrency = localStorage.getItem("preferredCurrency");
    if (savedLang) setLanguageState(savedLang);
    if (savedCurrency) setCurrencyState(savedCurrency);
  }, []);

  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
    localStorage.setItem("preferredLanguage", lang);
    // Clear translations when language changes
    setTranslations({});
    pendingTextsRef.current.clear();
    translationRequestedRef.current = false;
  }, []);

  const setCurrency = useCallback((curr: string) => {
    setCurrencyState(curr);
    localStorage.setItem("preferredCurrency", curr);
  }, []);

  // Batch translate texts
  const translateTexts = useCallback(async (texts: string[]) => {
    if (language === "en" || texts.length === 0) return;
    
    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke("translate", {
        body: { texts, targetLanguage: language }
      });

      if (error) {
        console.error("Translation error:", error);
        return;
      }

      if (data?.translations) {
        setTranslations(prev => ({ ...prev, ...data.translations }));
      }
    } catch (err) {
      console.error("Translation failed:", err);
    } finally {
      setIsTranslating(false);
    }
  }, [language]);

  // Process pending texts after render cycle completes
  useEffect(() => {
    if (language === "en") return;
    
    const processPending = () => {
      if (pendingTextsRef.current.size > 0 && !translationRequestedRef.current) {
        translationRequestedRef.current = true;
        const textsToTranslate = Array.from(pendingTextsRef.current);
        pendingTextsRef.current.clear();
        translateTexts(textsToTranslate).finally(() => {
          translationRequestedRef.current = false;
        });
      }
    };

    // Delay to batch multiple t() calls from same render
    const timer = setTimeout(processPending, 100);
    return () => clearTimeout(timer);
  }, [language, translateTexts, translations]);

  // The t function - does NOT call setState during render
  const t = useCallback((text: string): string => {
    if (language === "en" || !text) return text;
    
    // Return translated text if available
    if (translations[text]) return translations[text];
    
    // Queue for translation using ref (no state update during render)
    if (!pendingTextsRef.current.has(text)) {
      pendingTextsRef.current.add(text);
    }
    
    return text; // Return original while translating
  }, [language, translations]);

  const formatPrice = useCallback((priceUSD: number): string => {
    const currencyInfo = currencyData[currency] || currencyData.USD;
    const convertedPrice = priceUSD * currencyInfo.rate;
    
    // Format based on currency - no decimals for large value currencies
    if (currency === "JPY" || currency === "KRW" || currency === "VND" || currency === "IDR") {
      return `${currencyInfo.symbol}${Math.round(convertedPrice).toLocaleString()}`;
    }
    
    // Smart decimal formatting - show meaningful decimals
    if (convertedPrice === 0) return `${currencyInfo.symbol}0.00`;
    if (convertedPrice >= 1) return `${currencyInfo.symbol}${convertedPrice.toFixed(2)}`;
    if (convertedPrice >= 0.01) return `${currencyInfo.symbol}${convertedPrice.toFixed(2)}`;
    if (convertedPrice >= 0.001) return `${currencyInfo.symbol}${convertedPrice.toFixed(3)}`;
    if (convertedPrice >= 0.0001) return `${currencyInfo.symbol}${convertedPrice.toFixed(4)}`;
    if (convertedPrice >= 0.00001) return `${currencyInfo.symbol}${convertedPrice.toFixed(5)}`;
    return `${currencyInfo.symbol}${convertedPrice.toFixed(6)}`;
  }, [currency]);

  const currencySymbol = currencyData[currency]?.symbol || "$";

  return (
    <LocalizationContext.Provider value={{
      language,
      currency,
      currencySymbol,
      setLanguage,
      setCurrency,
      t,
      formatPrice,
      isTranslating
    }}>
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = () => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error("useLocalization must be used within a LocalizationProvider");
  }
  return context;
};
