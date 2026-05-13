import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { MODERATOR_DEFAULT_SECTIONS, usePermissions, urlToSectionKey } from '@/hooks/usePermissions';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';

export default function AppLayout() {
  const { isCourier, isOwnerOrAdmin, isOffice, isModerator } = useAuth();
  const { canView, canEdit, loading } = usePermissions();
  const location = useLocation();

  if (isOffice && !isOwnerOrAdmin) {
    return <Navigate to="/office-portal" replace />;
  }
  if (isCourier && !isOwnerOrAdmin) {
    return <Navigate to="/courier-orders" replace />;
  }

  // Check if current section is hidden
  const sectionKey = urlToSectionKey(location.pathname);
  if (loading) return null;
  if (!canView(sectionKey)) {
    if (isModerator && !isOwnerOrAdmin) {
      const firstAllowedSection = MODERATOR_DEFAULT_SECTIONS.find(canView);
      if (firstAllowedSection) {
        return <Navigate to={`/${firstAllowedSection}`} replace />;
      }
      return <div className="flex min-h-screen items-center justify-center bg-background text-foreground">لا توجد صلاحيات متاحة لهذا المستخدم</div>;
    }
    return <Navigate to="/" replace />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 min-w-0">
          <header className="flex h-12 items-center border-b border-border px-4">
            <SidebarTrigger />
          </header>
          <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-x-hidden">
            <Outlet context={{ canEdit: canEdit(sectionKey) }} />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
