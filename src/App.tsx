import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Orders from "@/pages/Orders";
import Offices from "@/pages/Offices";
import Customers from "@/pages/Customers";
import Companies from "@/pages/Companies";
import Products from "@/pages/Products";
import Couriers from "@/pages/Couriers";
import Collections from "@/pages/Collections";
import CompanyAccounts from "@/pages/CompanyAccounts";
import ActivityLogs from "@/pages/ActivityLogs";
import Settings from "@/pages/Settings";
import CourierOrders from "@/pages/CourierOrders";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function LoginRedirect() {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) return <Navigate to="/" replace />;
  return <Login />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginRedirect />} />
            <Route path="/courier-orders" element={
              <ProtectedRoute><CourierOrders /></ProtectedRoute>
            } />
            <Route element={
              <ProtectedRoute requiredRole="owner_or_admin"><AppLayout /></ProtectedRoute>
            }>
              <Route path="/" element={<Dashboard />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/offices" element={<Offices />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/products" element={<Products />} />
              <Route path="/couriers" element={<Couriers />} />
              <Route path="/collections" element={<Collections />} />
              <Route path="/company-accounts" element={<CompanyAccounts />} />
              <Route path="/logs" element={<ActivityLogs />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
