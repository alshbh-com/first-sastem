import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import {
  Package, PackageSearch, Archive, Search, Building2, MapPin, Factory, Box,
  Truck, Wallet, CreditCard, Building, DollarSign, Printer, ScrollText, Settings, Users
} from 'lucide-react';

const sections = [
  { title: 'الأوردرات', url: '/orders', icon: Package, color: 'hsl(var(--primary))' },
  { title: 'جميع الأوردرات', url: '/unassigned-orders', icon: PackageSearch, color: 'hsl(38, 92%, 50%)' },
  { title: 'الأوردرات القديمة', url: '/closed-orders', icon: Archive, color: 'hsl(var(--muted-foreground))' },
  { title: 'بحث شامل', url: '/search', icon: Search, color: 'hsl(var(--primary))' },
  { title: 'المكاتب', url: '/offices', icon: Building2, color: 'hsl(142, 76%, 36%)' },
  { title: 'أسعار التوصيل', url: '/delivery-prices', icon: MapPin, color: 'hsl(38, 92%, 50%)' },
  { title: 'الشركات', url: '/companies', icon: Factory, color: 'hsl(270, 60%, 60%)' },
  { title: 'المنتجات', url: '/products', icon: Box, color: 'hsl(0, 72%, 51%)' },
  { title: 'المندوبين', url: '/couriers', icon: Truck, color: 'hsl(38, 92%, 50%)' },
  { title: 'المستخدمين', url: '/users', icon: Users, color: 'hsl(200, 70%, 50%)' },
  { title: 'تحصيلات المندوبين', url: '/courier-collections', icon: Wallet, color: 'hsl(var(--primary))' },
  { title: 'حسابات الشركات', url: '/company-accounts', icon: CreditCard, color: 'hsl(38, 92%, 50%)' },
  { title: 'حسابات المكاتب', url: '/office-accounts', icon: Building, color: 'hsl(142, 76%, 36%)' },
  { title: 'السلفات والخصومات', url: '/advances', icon: DollarSign, color: 'hsl(0, 72%, 51%)' },
  { title: 'الطباعة', url: '/print', icon: Printer, color: 'hsl(var(--muted-foreground))' },
  { title: 'سجل الحركات', url: '/logs', icon: ScrollText, color: 'hsl(var(--muted-foreground))' },
  { title: 'الإعدادات', url: '/settings', icon: Settings, color: 'hsl(var(--muted-foreground))' },
];

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">لوحة التحكم</h1>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {sections.map((s) => (
          <Card
            key={s.url}
            className="bg-card border-border cursor-pointer hover:bg-secondary/50 transition-colors active:scale-95"
            onClick={() => navigate(s.url)}
          >
            <CardContent className="flex flex-col items-center gap-3 p-4 sm:p-6">
              <div className="rounded-xl p-3" style={{ backgroundColor: s.color + '20' }}>
                <s.icon className="h-6 w-6 sm:h-7 sm:w-7" style={{ color: s.color }} />
              </div>
              <span className="text-sm font-medium text-center">{s.title}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
