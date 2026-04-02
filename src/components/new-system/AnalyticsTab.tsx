import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from 'recharts';
import { TrendingUp, MapPin, RotateCcw, Clock, CheckCircle, AlertTriangle, ListChecks, Truck } from 'lucide-react';
import { format } from 'date-fns';

export default function AnalyticsTab() {
  const [weeklyForecast, setWeeklyForecast] = useState(0);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [returnReasons, setReturnReasons] = useState<any[]>([]);
  const [monthlyComparison, setMonthlyComparison] = useState<any[]>([]);
  const [peakHours, setPeakHours] = useState<any[]>([]);
  const [courierSuccess, setCourierSuccess] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusCounts, setStatusCounts] = useState<any[]>([]);
  const [statusPeriod, setStatusPeriod] = useState('30');
  const [statusDateFrom, setStatusDateFrom] = useState('');
  const [statusDateTo, setStatusDateTo] = useState('');

  useEffect(() => {
    loadAnalytics();
  }, []);

  useEffect(() => {
    loadStatusCounts();
  }, [statusPeriod, statusDateFrom, statusDateTo]);

  const loadStatusCounts = async () => {
    const { data: statuses } = await supabase.from('order_statuses').select('id, name, color').order('sort_order');
    if (!statuses) return;

    let query = supabase.from('orders').select('status_id').eq('is_pending_approval', false);

    if (statusDateFrom && statusDateTo) {
      query = query.gte('created_at', statusDateFrom).lte('created_at', statusDateTo + 'T23:59:59');
    } else {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - Number(statusPeriod));
      query = query.gte('created_at', daysAgo.toISOString());
    }

    const { data: orders } = await query;
    if (!orders) return;

    const counts = statuses.map(s => ({
      name: s.name,
      color: s.color || '#6b7280',
      count: orders.filter(o => o.status_id === s.id).length,
    })).filter(s => s.count > 0).sort((a, b) => b.count - a.count);

    setStatusCounts(counts);
  };

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
      {/* Status Counts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><ListChecks className="h-4 w-4" /> عدد الأوردرات حسب الحالة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">الفترة</Label>
              <Select value={statusPeriod} onValueChange={v => { setStatusPeriod(v); setStatusDateFrom(''); setStatusDateTo(''); }}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">آخر 7 أيام</SelectItem>
                  <SelectItem value="30">آخر 30 يوم</SelectItem>
                  <SelectItem value="60">آخر 60 يوم</SelectItem>
                  <SelectItem value="90">آخر 90 يوم</SelectItem>
                  <SelectItem value="365">آخر سنة</SelectItem>
                  <SelectItem value="all">الكل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">من تاريخ</Label>
              <Input type="date" value={statusDateFrom} onChange={e => setStatusDateFrom(e.target.value)} className="w-36" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">إلى تاريخ</Label>
              <Input type="date" value={statusDateTo} onChange={e => setStatusDateTo(e.target.value)} className="w-36" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {statusCounts.map(s => (
              <div key={s.name} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-sm flex-1 truncate">{s.name}</span>
                <span className="text-sm font-bold">{s.count}</span>
              </div>
            ))}
          </div>
          {statusCounts.length > 0 && (
            <div className="text-sm text-muted-foreground text-center">
              إجمالي: <strong>{statusCounts.reduce((s, c) => s + c.count, 0)}</strong> أوردر
            </div>
          )}
        </CardContent>
      </Card>
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

      {/* Row 6: Courier Daily Performance */}
      <CourierDailyPerformance />
    </div>
  );
}

// ============ Courier Daily Performance ============
function CourierDailyPerformance() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadData(); }, [date]);

  const loadData = async () => {
    setLoading(true);
    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;

    const [rolesRes, ordersRes, statusRes, profilesRes] = await Promise.all([
      supabase.from('user_roles').select('user_id').eq('role', 'courier'),
      supabase.from('orders').select('id, courier_id, status_id, price, delivery_price, shipping_paid, is_closed')
        .not('courier_id', 'is', null)
        .gte('updated_at', startOfDay).lte('updated_at', endOfDay),
      supabase.from('order_statuses').select('id, name, color'),
      supabase.from('profiles').select('id, full_name'),
    ]);

    const courierIds = (rolesRes.data || []).map(r => r.user_id);
    const orders = ordersRes.data || [];
    const statuses = statusRes.data || [];
    const profiles = profilesRes.data || [];

    const deliveredIds = statuses.filter(s => s.name === 'تم التسليم' || s.name === 'تسليم جزئي').map(s => s.id);
    const rejectPaidId = statuses.find(s => s.name === 'رفض ودفع شحن')?.id;
    const rejectNoPaidId = statuses.find(s => s.name === 'رفض ولم يدفع شحن')?.id;
    const canceledId = statuses.find(s => s.name === 'ملغي')?.id;
    const noAnswerId = statuses.find(s => s.name === 'لم يرد')?.id;
    const evadeId = statuses.find(s => s.name === 'تهرب')?.id;

    const courierData = courierIds.map(cId => {
      const name = profiles.find(p => p.id === cId)?.full_name || 'بدون اسم';
      const courierOrders = orders.filter(o => o.courier_id === cId);
      const delivered = courierOrders.filter(o => deliveredIds.includes(o.status_id));
      const rejectPaid = courierOrders.filter(o => o.status_id === rejectPaidId);
      const rejectNoPaid = courierOrders.filter(o => o.status_id === rejectNoPaidId);
      const canceled = courierOrders.filter(o => o.status_id === canceledId);
      const noAnswer = courierOrders.filter(o => o.status_id === noAnswerId);
      const evaded = courierOrders.filter(o => o.status_id === evadeId);
      const pending = courierOrders.filter(o => !deliveredIds.includes(o.status_id) && o.status_id !== rejectPaidId && o.status_id !== rejectNoPaidId && o.status_id !== canceledId && o.status_id !== noAnswerId && o.status_id !== evadeId);

      const totalCollection = delivered.reduce((s, o) => s + Number(o.price) + Number(o.delivery_price), 0)
        + rejectPaid.reduce((s, o) => s + Number(o.shipping_paid || 0), 0);

      return {
        id: cId, name,
        total: courierOrders.length,
        delivered: delivered.length,
        rejectPaid: rejectPaid.length,
        rejectNoPaid: rejectNoPaid.length,
        canceled: canceled.length,
        noAnswer: noAnswer.length,
        evaded: evaded.length,
        pending: pending.length,
        totalCollection,
      };
    }).filter(c => c.total > 0).sort((a, b) => b.delivered - a.delivered);

    setData(courierData);
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm flex items-center gap-2"><Truck className="h-4 w-4" /> أداء المناديب اليومي</CardTitle>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-[150px] text-xs" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-xs text-muted-foreground">جاري التحميل...</p> : data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">لا توجد حركة للمناديب في هذا اليوم</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right text-[10px]">المندوب</TableHead>
                  <TableHead className="text-center text-[10px]">إجمالي</TableHead>
                  <TableHead className="text-center text-[10px]">تسليم</TableHead>
                  <TableHead className="text-center text-[10px]">رفض+شحن</TableHead>
                  <TableHead className="text-center text-[10px]">رفض بدون</TableHead>
                  <TableHead className="text-center text-[10px]">ملغي</TableHead>
                  <TableHead className="text-center text-[10px]">لم يرد</TableHead>
                  <TableHead className="text-center text-[10px]">تهرب</TableHead>
                  <TableHead className="text-center text-[10px]">معلق</TableHead>
                  <TableHead className="text-right text-[10px]">التحصيل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs font-medium">{c.name}</TableCell>
                    <TableCell className="text-center text-xs">{c.total}</TableCell>
                    <TableCell className="text-center text-xs font-bold text-green-600">{c.delivered}</TableCell>
                    <TableCell className="text-center text-xs text-orange-600">{c.rejectPaid}</TableCell>
                    <TableCell className="text-center text-xs text-red-600">{c.rejectNoPaid}</TableCell>
                    <TableCell className="text-center text-xs text-red-600">{c.canceled}</TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">{c.noAnswer}</TableCell>
                    <TableCell className="text-center text-xs text-red-600">{c.evaded}</TableCell>
                    <TableCell className="text-center text-xs text-yellow-600">{c.pending}</TableCell>
                    <TableCell className="text-xs font-bold">{c.totalCollection.toLocaleString('en-US')} ج.م</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell className="text-xs">الإجمالي</TableCell>
                  <TableCell className="text-center text-xs">{data.reduce((s, c) => s + c.total, 0)}</TableCell>
                  <TableCell className="text-center text-xs text-green-600">{data.reduce((s, c) => s + c.delivered, 0)}</TableCell>
                  <TableCell className="text-center text-xs text-orange-600">{data.reduce((s, c) => s + c.rejectPaid, 0)}</TableCell>
                  <TableCell className="text-center text-xs text-red-600">{data.reduce((s, c) => s + c.rejectNoPaid, 0)}</TableCell>
                  <TableCell className="text-center text-xs text-red-600">{data.reduce((s, c) => s + c.canceled, 0)}</TableCell>
                  <TableCell className="text-center text-xs">{data.reduce((s, c) => s + c.noAnswer, 0)}</TableCell>
                  <TableCell className="text-center text-xs text-red-600">{data.reduce((s, c) => s + c.evaded, 0)}</TableCell>
                  <TableCell className="text-center text-xs text-yellow-600">{data.reduce((s, c) => s + c.pending, 0)}</TableCell>
                  <TableCell className="text-xs font-bold">{data.reduce((s, c) => s + c.totalCollection, 0).toLocaleString('en-US')} ج.م</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
