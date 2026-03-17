import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LocalizationProvider } from "@/contexts/LocalizationContext";
import Index from "./pages/Index";
import Services from "./pages/Services";
import Dashboard from "./pages/Dashboard";
import NewOrder from "./pages/NewOrder";
import Orders from "./pages/Orders";
import Refills from "./pages/Refills";
import AddFunds from "./pages/AddFunds";
import Referrals from "./pages/Referrals";
import ApiDocs from "./pages/ApiDocs";
import Updates from "./pages/Updates";
import Support from "./pages/Support";
import Settings from "./pages/Settings";
import Transactions from "./pages/Transactions";
import ResellerPanel from "./pages/ResellerPanel";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import { AIChatbot } from "./components/AIChatbot";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LocalizationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/services" element={<Services />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* Legacy auth redirects */}
              <Route path="/login" element={<Navigate to="/auth" replace />} />
              <Route path="/register" element={<Navigate to="/auth" replace />} />
              <Route path="/signup" element={<Navigate to="/auth" replace />} />

              {/* Dashboard routes */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/dashboard/orders" element={<Orders />} />
              <Route path="/dashboard/order" element={<NewOrder />} />
              <Route path="/dashboard/refills" element={<Refills />} />
              <Route path="/dashboard/funds" element={<AddFunds />} />
              <Route path="/dashboard/transactions" element={<Transactions />} />
              <Route path="/dashboard/referrals" element={<Referrals />} />
              <Route path="/dashboard/reseller" element={<ResellerPanel />} />
              <Route path="/dashboard/api" element={<ApiDocs />} />
              <Route path="/dashboard/updates" element={<Updates />} />
              <Route path="/dashboard/support" element={<Support />} />
              <Route path="/dashboard/settings" element={<Settings />} />

              {/* Admin route */}
              <Route path="/admin" element={<Admin />} />

              {/* Legacy redirects */}
              <Route path="/new-order" element={<Navigate to="/dashboard/order" replace />} />
              <Route path="/orders" element={<Navigate to="/dashboard/orders" replace />} />
              <Route path="/add-funds" element={<Navigate to="/dashboard/funds" replace />} />
              <Route path="/api-docs" element={<Navigate to="/dashboard/api" replace />} />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <AIChatbot />
          </BrowserRouter>
        </TooltipProvider>
      </LocalizationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
