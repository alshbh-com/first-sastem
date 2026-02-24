import {
  LayoutDashboard, Package, Building2, Users, Factory, Box,
  Truck, Wallet, CreditCard, ScrollText, Settings, LogOut, Archive, Building,
  PackageSearch, Search, Printer, DollarSign
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, SidebarSeparator,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const menuItems = [
  { title: 'لوحة التحكم', url: '/', icon: LayoutDashboard },
  { title: 'الأوردرات', url: '/orders', icon: Package },
  { title: 'جميع الأوردرات', url: '/unassigned-orders', icon: PackageSearch },
  { title: 'الأوردرات القديمة', url: '/closed-orders', icon: Archive },
  { title: 'بحث شامل', url: '/search', icon: Search },
  { title: 'المكاتب', url: '/offices', icon: Building2 },
  { title: 'العملاء', url: '/customers', icon: Users },
  { title: 'الشركات', url: '/companies', icon: Factory },
  { title: 'المنتجات', url: '/products', icon: Box },
  { title: 'المندوبين', url: '/couriers', icon: Truck },
  { title: 'تحصيلات المندوبين', url: '/courier-collections', icon: Wallet },
  { title: 'حسابات الشركات', url: '/company-accounts', icon: CreditCard },
  { title: 'حسابات المكاتب', url: '/office-accounts', icon: Building },
  { title: 'السلفات والخصومات', url: '/advances', icon: DollarSign },
  { title: 'الطباعة', url: '/print', icon: Printer },
  { title: 'سجل الحركات', url: '/logs', icon: ScrollText },
  { title: 'الإعدادات', url: '/settings', icon: Settings },
];

export function AppSidebar() {
  const { logout } = useAuth();

  return (
    <Sidebar side="right" collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            F
          </div>
          <span className="text-lg font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            FIRST
          </span>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden">تسجيل خروج</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
