import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Package, CheckCircle, RotateCcw, Truck, Wallet, Building2, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Stats {
  todayOrders: number;
  delivered: number;
  returned: number;
  withCourier: number;
  dailyCollection: number;
  companyDues: number;
  profit: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    todayOrders: 0, delivered: 0, returned: 0, withCourier: 0,
    dailyCollection: 0, companyDues: 0, profit: 0,
  });
  const [chartData, setChartData] = useState<{ month: string; orders: number }[]>([]);

  useEffect(() => {
    loadStats();
    loadChart();
  }, []);

  const loadStats = async () => {
    const today = new Date().toISOString().split('T')[0];

    // Today's orders
    const { count: todayOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today);

    // Get statuses for filtering
    const { data: statuses } = await supabase.from('order_statuses').select('*');
    const deliveredStatus = statuses?.find(s => s.name === 'تم التسليم');
    const returnedStatuses = statuses?.filter(s => s.name.includes('مرتجع'));
    const courierStatus = statuses?.find(s => s.name === 'قيد التوصيل');

    const { count: delivered } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today)
      .eq('status_id', deliveredStatus?.id || '');

    const { count: returned } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today)
      .in('status_id', returnedStatuses?.map(s => s.id) || []);

    const { count: withCourier } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status_id', courierStatus?.id || '');

    // Daily collections
    const { data: collections } = await supabase
      .from('courier_collections')
      .select('amount')
      .gte('created_at', today);
    const dailyCollection = collections?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;

    setStats({
      todayOrders: todayOrders || 0,
      delivered: delivered || 0,
      returned: returned || 0,
      withCourier: withCourier || 0,
      dailyCollection,
      companyDues: 0,
      profit: 0,
    });
  };

  const loadChart = async () => {
    const months: { month: string; orders: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString();
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', start)
        .lte('created_at', end);
      months.push({
        month: d.toLocaleDateString('ar-EG', { month: 'short' }),
        orders: count || 0,
      });
    }
    setChartData(months);
  };

  const cards = [
    { title: 'أوردرات اليوم', value: stats.todayOrders, icon: Package, color: 'text-primary' },
    { title: 'تم التسليم', value: stats.delivered, icon: CheckCircle, color: 'text-emerald-500' },
    { title: 'مرتجع', value: stats.returned, icon: RotateCcw, color: 'text-destructive' },
    { title: 'مع المندوب', value: stats.withCourier, icon: Truck, color: 'text-amber-500' },
    { title: 'تحصيل اليوم', value: `${stats.dailyCollection} ج.م`, icon: Wallet, color: 'text-primary' },
    { title: 'مستحقات الشركات', value: `${stats.companyDues} ج.م`, icon: Building2, color: 'text-amber-500' },
    { title: 'أرباح النظام', value: `${stats.profit} ج.م`, icon: TrendingUp, color: 'text-emerald-500' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">لوحة التحكم</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} className="bg-card border-border">
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`rounded-lg bg-secondary p-3 ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-xl font-bold">{card.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>الأوردرات الشهرية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                />
                <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
