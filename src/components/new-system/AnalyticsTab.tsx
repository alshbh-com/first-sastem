import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from 'recharts';
import { TrendingUp, MapPin, RotateCcw, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

export default function AnalyticsTab() {
  const [weeklyForecast, setWeeklyForecast] = useState(0);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [returnReasons, setReturnReasons] = useState<any[]>([]);
  const [monthlyComparison, setMonthlyComparison] = useState<any[]>([]);
  const [peakHours, setPeakHours] = useState<any[]>([]);
  const [courierSuccess, setCourierSuccess] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const { data: orders } = await supabase.from('orders').select('id, created_at, governorate, status_id, courier_id, return_status, is_closed');
      if (!orders) return;

      // 1. Forecast - average orders per week over last 4 weeks
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
      const recentOrders = orders.filter(o => new Date(o.created_at) >= fourWeeksAgo);
      setWeeklyForecast(Math.round(recentOrders.length / 4));

      // 2. Heatmap by governorate
      const govCounts: Record<string, number> = {};
      orders.forEach(o => {
        const gov = o.governorate || 'غير محدد';
        govCounts[gov] = (govCounts[gov] || 0) + 1;
      });
      const heatData = Object.entries(govCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);
      setHeatmapData(heatData);

      // 3. Return reasons
      const returnCounts: Record<string, number> = {};
      orders.forEach(o => {
        if (o.return_status && o.return_status !== '') {
          returnCounts[o.return_status] = (returnCounts[o.return_status] || 0) + 1;
        }
      });
      setReturnReasons(Object.entries(returnCounts).map(([name, count]) => ({ name, count })));

      // 4. Monthly comparison
      const monthlyCounts: Record<string, number> = {};
      orders.forEach(o => {
        const d = new Date(o.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyCounts[key] = (monthlyCounts[key] || 0) + 1;
      });
      const monthlyData = Object.entries(monthlyCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, count]) => ({ month, count }));
      setMonthlyComparison(monthlyData);

      // 5. Peak hours
      const hourCounts: Record<number, number> = {};
      orders.forEach(o => {
        const hour = new Date(o.created_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });
      const peakData = Array.from({ length: 24 }, (_, h) => ({
        hour: `${h}:00`,
        count: hourCounts[h] || 0,
      }));
      setPeakHours(peakData);

      // 6. Courier success rate
      const { data: statuses } = await supabase.from('order_statuses').select('id, name');
      const deliveredStatusId = statuses?.find(s => s.name === 'تم التسليم')?.id;
      const { data: profiles } = await supabase.from('profiles').select('id, full_name');
      const { data: roles } = await supabase.from('user_roles').select('user_id, role');
      const courierIds = roles?.filter(r => r.role === 'courier').map(r => r.user_id) || [];

      const courierStats = courierIds.slice(0, 20).map(cId => {
        const courierOrders = orders.filter(o => o.courier_id === cId);
        const delivered = courierOrders.filter(o => o.status_id === deliveredStatusId).length;
        const total = courierOrders.length;
        const name = profiles?.find(p => p.id === cId)?.full_name || 'مندوب';
        return {
          name: name.substring(0, 15),
          rate: total > 0 ? Math.round((delivered / total) * 100) : 0,
          total,
          delivered,
        };
      }).filter(c => c.total > 0).sort((a, b) => b.rate - a.rate);
      setCourierSuccess(courierStats);

      // 7. Smart alerts
      const newAlerts: string[] = [];
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      courierStats.forEach(c => {
        if (c.rate < 50 && c.total > 5) {
          newAlerts.push(`⚠️ المندوب "${c.name}" نسبة نجاحه ${c.rate}% فقط`);
        }
      });

      const thisWeekOrders = orders.filter(o => new Date(o.created_at) >= oneWeekAgo).length;
      const lastWeekOrders = orders.filter(o => {
        const d = new Date(o.created_at);
        return d >= twoWeeksAgo && d < oneWeekAgo;
      }).length;
      if (lastWeekOrders > 0 && thisWeekOrders < lastWeekOrders * 0.7) {
        newAlerts.push(`📉 الأوردرات انخفضت ${Math.round((1 - thisWeekOrders / lastWeekOrders) * 100)}% مقارنة بالأسبوع الماضي`);
      }
      setAlerts(newAlerts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-10 text-muted-foreground">جاري تحميل التحليلات...</div>;

  const getHeatColor = (count: number, max: number) => {
    const ratio = count / max;
    if (ratio > 0.7) return 'bg-red-500/80 text-white';
    if (ratio > 0.4) return 'bg-orange-400/80 text-white';
    if (ratio > 0.2) return 'bg-yellow-400/80';
    return 'bg-green-400/60';
  };

  const maxHeat = Math.max(...heatmapData.map(d => d.count), 1);

  return (
    <div className="space-y-4 mt-4">
      {/* Row 1: Forecast + Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" /> توقع الأوردرات الأسبوعي</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">{weeklyForecast}</div>
            <p className="text-xs text-muted-foreground mt-1">بناءً على متوسط آخر 4 أسابيع</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> تنبيهات ذكية</CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">✅ لا توجد تنبيهات حالياً</p>
            ) : (
              <ul className="space-y-1">
                {alerts.map((a, i) => (
                  <li key={i} className="text-sm">{a}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Heatmap */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4" /> خريطة حرارية للمناطق</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {heatmapData.map(d => (
              <div key={d.name} className={`px-3 py-2 rounded-lg text-sm font-medium ${getHeatColor(d.count, maxHeat)}`}>
                {d.name} ({d.count})
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Row 3: Monthly Comparison */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">مقارنة أداء شهر بشهر</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyComparison}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} name="عدد الأوردرات" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Row 4: Return Reasons + Peak Hours */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><RotateCcw className="h-4 w-4" /> أسباب الإرجاع</CardTitle>
          </CardHeader>
          <CardContent>
            {returnReasons.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد بيانات إرجاع</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={returnReasons}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--destructive))" name="العدد" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" /> ساعات الذروة</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={peakHours}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" fontSize={10} interval={2} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" name="أوردرات" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 5: Courier Success Rate */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><CheckCircle className="h-4 w-4" /> نسبة نجاح التوصيل لكل مندوب</CardTitle>
        </CardHeader>
        <CardContent>
          {courierSuccess.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد بيانات كافية</p>
          ) : (
            <div className="space-y-2">
              {courierSuccess.map(c => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="text-sm w-28 truncate">{c.name}</span>
                  <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${c.rate >= 70 ? 'bg-green-500' : c.rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${c.rate}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-16 text-left">{c.rate}% ({c.delivered}/{c.total})</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
