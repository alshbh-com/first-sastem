import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';

export default function AppLayout() {
  const { isCourier, isOwnerOrAdmin } = useAuth();

  // Courier gets redirected to their own page
  if (isCourier && !isOwnerOrAdmin) {
    return <Navigate to="/courier-orders" replace />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-12 items-center border-b border-border px-4">
            <SidebarTrigger />
          </header>
          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
