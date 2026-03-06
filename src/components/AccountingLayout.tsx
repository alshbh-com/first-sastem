import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Building2, Calendar, Calculator, ClipboardList, ArrowRight,
  DollarSign, TrendingUp, BarChart3, Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const accountingNavItems = [
  { title: 'المكاتب - اليوميات', url: '/accounting-system', icon: Building2 },
  { title: 'الحسابات', url: '/accounting-system/dashboard', icon: Calculator },
  { title: 'تقفيلة المكاتب', url: '/accounting-system/office-settlement', icon: ClipboardList },
];

export default function AccountingLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (url: string) => {
    if (url === '/accounting-system') return location.pathname === '/accounting-system';
    return location.pathname.startsWith(url);
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">سيستم الحسابات</h1>
      </div>

      {/* Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {accountingNavItems.map((item) => (
          <Button
            key={item.url}
            variant={isActive(item.url) ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
            onClick={() => navigate(item.url)}
          >
            <item.icon className="h-4 w-4" />
            {item.title}
          </Button>
        ))}
      </div>

      {/* Content */}
      <Outlet />
    </div>
  );
}
