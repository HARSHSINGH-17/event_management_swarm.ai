import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Index from "./pages/Index";
import Participants from "./pages/Participants";
import EmailAutomation from "./pages/EmailAutomation";
import SocialMedia from "./pages/SocialMedia";
import Scheduler from "./pages/Scheduler";
import CrisisManagement from "./pages/CrisisManagement";
import SwarmControl from "./pages/SwarmControl";
import Analytics from "./pages/Analytics";
import SettingsPage from "./pages/Settings";
import NotFound from "./pages/NotFound";
import DataImport from "./pages/DataImport";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes — no auth required */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected routes — redirects to /login if not authenticated */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Index />} />
                <Route path="/participants" element={<Participants />} />
                <Route path="/email-automation" element={<EmailAutomation />} />
                <Route path="/social-media" element={<SocialMedia />} />
                <Route path="/scheduler" element={<Scheduler />} />
                <Route path="/crisis-management" element={<CrisisManagement />} />
                <Route path="/swarm-control" element={<SwarmControl />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/import" element={<DataImport />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
