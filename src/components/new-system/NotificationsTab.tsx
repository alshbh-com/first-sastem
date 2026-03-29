import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bell, MessageSquare, AlertTriangle, Clock, UserPlus, ShieldAlert, Package, Wallet, BarChart3, Send, Trash2, Eye, CheckCircle, X, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

const saveSetting = async (key: string, value: string) => {
  await supabase.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
};
const loadSetting = async (key: string): Promise<string | null> => {
  const { data } = await supabase.from('app_settings').select('value').eq('key', key).maybeSingle();
  return data?.value || null;
};

// ============ 1. مركز الإشعارات ============
function NotificationCenter() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) { setLoading(false); return; }
    let query = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
    if (filter === 'unread') query = query.eq('is_read', false);
    const { data } = await query;
    setNotifications(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    load();
  };

  const markAllRead = async () => {
    const ids = notifications.filter(n => !n.is_read).map(n => n.id);
    if (!ids.length) return;
    for (const id of ids) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    }
    toast.success('تم تعليم الكل كمقروء');
    load();
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <ShieldAlert className="h-4 w-4 text-destructive" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Bell className="h-4 w-4 text-primary" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bell className="h-4 w-4" /> مركز الإشعارات
            {unreadCount > 0 && <Badge variant="destructive" className="text-xs">{unreadCount}</Badge>}
          </CardTitle>
          <div className="flex gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="unread">غير مقروء</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={markAllRead}>تعليم الكل</Button>
            <Button variant="ghost" size="sm" className="h-7" onClick={load}><RefreshCw className="h-3 w-3" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-center text-sm text-muted-foreground">جاري التحميل...</p> : (
          <div className="space-y-2 max-h-[350px] overflow-auto">
            {notifications.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">لا توجد إشعارات</p>}
            {notifications.map(n => (
              <div key={n.id} className={`flex items-start gap-3 p-3 rounded-lg border ${n.is_read ? 'bg-muted/20' : 'bg-primary/5 border-primary/20'}`}>
                <div className="mt-0.5">{typeIcon(n.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${n.is_read ? '' : 'font-medium'}`}>{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(n.created_at), 'yyyy-MM-dd HH:mm')}</p>
                </div>
                {!n.is_read && (
                  <Button variant="ghost" size="sm" className="shrink-0" onClick={() => markRead(n.id)}>
                    <Eye className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============ 2. إرسال إشعار يدوي ============
function SendNotification() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [userId, setUserId] = useState('all');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');

  useEffect(() => {
    supabase.from('profiles').select('id, full_name').then(({ data }) => setProfiles(data || []));
  }, []);

  const send = async () => {
    if (!title || !message) { toast.error('أكمل البيانات'); return; }
    const targets = userId === 'all' ? profiles.map(p => p.id) : [userId];
    for (const uid of targets) {
      await supabase.from('notifications').insert({ user_id: uid, title, message, type });
    }
    toast.success(`تم إرسال الإشعار لـ ${targets.length} مستخدم`);
    setTitle(''); setMessage('');
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Send className="h-4 w-4" /> إرسال إشعار</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>إلى</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>النوع</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="info">معلومات</SelectItem>
                <SelectItem value="warning">تحذير</SelectItem>
                <SelectItem value="success">نجاح</SelectItem>
                <SelectItem value="error">خطأ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div><Label>العنوان</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="عنوان الإشعار" /></div>
        <div><Label>الرسالة</Label><Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="نص الإشعار" /></div>
        <Button onClick={send} className="w-full"><Send className="h-4 w-4 ml-2" /> إرسال</Button>
      </CardContent>
    </Card>
  );
}

// ============ 3. إعدادات التنبيهات التلقائية ============
function AutoAlertSettings() {
  const [settings, setSettings] = useState({
    status_change: true,
    daily_summary: true,
    collection_alert: true,
    pending_48h: true,
    new_user: true,
    failed_login: false,
    weekly_returns: true,
    low_stock: true,
    courier_settlement: true,
    weekly_financial: false,
  });

  useEffect(() => {
    loadSetting('auto_alert_settings').then(v => { if (v) setSettings(JSON.parse(v)); });
  }, []);

  const toggle = async (key: string) => {
    const updated = { ...settings, [key]: !(settings as any)[key] };
    setSettings(updated);
    await saveSetting('auto_alert_settings', JSON.stringify(updated));
    toast.success('تم الحفظ');
  };

  const alertItems = [
    { key: 'status_change', icon: Bell, label: 'إشعار عند تغيير حالة أوردر', desc: 'إشعار فوري داخلي' },
    { key: 'daily_summary', icon: BarChart3, label: 'ملخص يومي بالأداء', desc: 'يُرسل يومياً للمالك' },
    { key: 'collection_alert', icon: AlertTriangle, label: 'تنبيه تجاوز مبلغ تحصيل', desc: 'بدون تسليم مقابل' },
    { key: 'pending_48h', icon: Clock, label: 'تنبيه أوردرات معلقة +48 ساعة', desc: 'أوردرات متأخرة' },
    { key: 'new_user', icon: UserPlus, label: 'إشعار عند إضافة مستخدم جديد', desc: 'للمالك والمسؤول' },
    { key: 'failed_login', icon: ShieldAlert, label: 'تنبيه محاولة دخول فاشلة', desc: 'أمان إضافي' },
    { key: 'weekly_returns', icon: Package, label: 'إشعار أسبوعي بالمرتجعات', desc: 'ملخص أسبوعي' },
    { key: 'low_stock', icon: Package, label: 'تنبيه نفاد مخزون', desc: 'عند الوصول للحد الأدنى' },
    { key: 'courier_settlement', icon: Wallet, label: 'إشعار تقفيل حساب مندوب', desc: 'عند مسح الحساب' },
    { key: 'weekly_financial', icon: BarChart3, label: 'ملخص مالي أسبوعي', desc: 'تقرير مالي تلقائي' },
  ];

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Bell className="h-4 w-4" /> إعدادات التنبيهات التلقائية</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alertItems.map(item => (
            <div key={item.key} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-3">
                <item.icon className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
              <Switch checked={(settings as any)[item.key]} onCheckedChange={() => toggle(item.key)} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============ 4. تنبيهات الأوردرات المعلقة ============
function PendingOrderAlerts() {
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hours, setHours] = useState('48');

  const check = async () => {
    setLoading(true);
    const cutoff = new Date(Date.now() - Number(hours) * 3600000).toISOString();
    const { data: statuses } = await supabase.from('order_statuses').select('id, name');
    const pendingStatusId = statuses?.find(s => s.name === 'بدون حالة')?.id;

    let query = supabase.from('orders').select('tracking_id, customer_name, customer_phone, created_at, office_id')
      .eq('is_closed', false).lt('created_at', cutoff);
    if (pendingStatusId) query = query.eq('status_id', pendingStatusId);
    const { data } = await query.order('created_at', { ascending: true }).limit(100);

    const { data: offices } = await supabase.from('offices').select('id, name');
    const officeMap = Object.fromEntries((offices || []).map(o => [o.id, o.name]));

    setPendingOrders((data || []).map(o => ({ ...o, office_name: officeMap[o.office_id || ''] || '-' })));
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" /> أوردرات معلقة بدون حركة</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-3 items-end">
          <div className="flex-1"><Label>ساعات بدون تحديث</Label><Input type="number" value={hours} onChange={e => setHours(e.target.value)} /></div>
          <Button onClick={check} disabled={loading}>{loading ? 'جاري...' : 'فحص'}</Button>
        </div>
        {pendingOrders.length > 0 && (
          <div className="overflow-auto max-h-[250px]">
            <Table>
              <TableHeader><TableRow><TableHead>التتبع</TableHead><TableHead>العميل</TableHead><TableHead>المكتب</TableHead><TableHead>منذ</TableHead></TableRow></TableHeader>
              <TableBody>
                {pendingOrders.map((o, i) => {
                  const hoursAgo = Math.round((Date.now() - new Date(o.created_at).getTime()) / 3600000);
                  return (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-mono">{o.tracking_id}</TableCell>
                      <TableCell className="text-xs">{o.customer_name}</TableCell>
                      <TableCell className="text-xs">{o.office_name}</TableCell>
                      <TableCell>
                        <Badge variant={hoursAgo > 72 ? 'destructive' : 'secondary'} className="text-xs">{hoursAgo} ساعة</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        {pendingOrders.length === 0 && !loading && <p className="text-center text-sm text-muted-foreground">لا توجد أوردرات معلقة</p>}
      </CardContent>
    </Card>
  );
}

// ============ 5. تنبيه تجاوز التحصيل ============
function CollectionOverflowAlert() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const check = async () => {
    setLoading(true);
    const [collectionsRes, profilesRes, ordersRes, statusesRes] = await Promise.all([
      supabase.from('courier_collections').select('courier_id, amount'),
      supabase.from('profiles').select('id, full_name'),
      supabase.from('orders').select('courier_id, price, status_id').eq('is_closed', false),
      supabase.from('order_statuses').select('id, name'),
    ]);
    const collections = collectionsRes.data || [];
    const profiles = profilesRes.data || [];
    const orders = ordersRes.data || [];
    const statuses = statusesRes.data || [];
    const deliveredId = statuses.find(s => s.name === 'تم التسليم')?.id;

    const courierTotals: Record<string, { collected: number; delivered: number; name: string }> = {};
    collections.forEach(c => {
      if (!courierTotals[c.courier_id]) courierTotals[c.courier_id] = { collected: 0, delivered: 0, name: profiles.find(p => p.id === c.courier_id)?.full_name || '' };
      courierTotals[c.courier_id].collected += Number(c.amount);
    });
    orders.forEach(o => {
      if (o.courier_id && o.status_id === deliveredId) {
        if (!courierTotals[o.courier_id]) courierTotals[o.courier_id] = { collected: 0, delivered: 0, name: profiles.find(p => p.id === o.courier_id)?.full_name || '' };
        courierTotals[o.courier_id].delivered += Number(o.price);
      }
    });

    const overflows = Object.entries(courierTotals)
      .filter(([_, v]) => v.collected > v.delivered && v.delivered > 0)
      .map(([id, v]) => ({ id, ...v, diff: v.collected - v.delivered }))
      .sort((a, b) => b.diff - a.diff);

    setAlerts(overflows);
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> تنبيه تجاوز التحصيل</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={check} disabled={loading} className="w-full">{loading ? 'جاري الفحص...' : 'فحص التحصيلات'}</Button>
        {alerts.length > 0 ? (
          <div className="space-y-2">
            {alerts.map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                <div>
                  <p className="text-sm font-medium">{a.name}</p>
                  <p className="text-xs text-muted-foreground">محصّل: {a.collected.toLocaleString()} | مُسلّم: {a.delivered.toLocaleString()}</p>
                </div>
                <Badge variant="destructive">فرق: {a.diff.toLocaleString()}</Badge>
              </div>
            ))}
          </div>
        ) : !loading && <p className="text-center text-sm text-muted-foreground">لا توجد تجاوزات</p>}
      </CardContent>
    </Card>
  );
}

// ============ 6. ملخص يومي سريع ============
function DailySummary() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    const [ordersRes, statusesRes, collectionsRes, expensesRes] = await Promise.all([
      supabase.from('orders').select('status_id, price, delivery_price').gte('created_at', today),
      supabase.from('order_statuses').select('id, name'),
      supabase.from('courier_collections').select('amount').gte('created_at', today),
      supabase.from('expenses').select('amount').eq('expense_date', today),
    ]);
    const orders = ordersRes.data || [];
    const statuses = statusesRes.data || [];
    const collections = collectionsRes.data || [];
    const expenses = expensesRes.data || [];

    const deliveredId = statuses.find(s => s.name === 'تم التسليم')?.id;
    const delivered = orders.filter(o => o.status_id === deliveredId);

    setSummary({
      totalOrders: orders.length,
      deliveredCount: delivered.length,
      totalRevenue: orders.reduce((s, o) => s + Number(o.price), 0),
      deliveredRevenue: delivered.reduce((s, o) => s + Number(o.price), 0),
      totalShipping: orders.reduce((s, o) => s + Number(o.delivery_price), 0),
      totalCollections: collections.reduce((s, c) => s + Number(c.amount), 0),
      totalExpenses: expenses.reduce((s, e) => s + Number(e.amount), 0),
    });
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> ملخص اليوم</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={generate} disabled={loading} className="w-full">{loading ? 'جاري...' : 'تحديث الملخص'}</Button>
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'أوردرات اليوم', value: summary.totalOrders, color: 'text-primary' },
              { label: 'تم التسليم', value: summary.deliveredCount, color: 'text-green-600' },
              { label: 'إيرادات مسلمة', value: summary.deliveredRevenue.toLocaleString(), color: 'text-green-600' },
              { label: 'إجمالي الشحن', value: summary.totalShipping.toLocaleString(), color: 'text-blue-600' },
              { label: 'تحصيلات', value: summary.totalCollections.toLocaleString(), color: 'text-orange-600' },
              { label: 'مصاريف', value: summary.totalExpenses.toLocaleString(), color: 'text-destructive' },
            ].map((item, i) => (
              <div key={i} className="p-3 rounded-lg border bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============ 7. سجل تقفيل حسابات المناديب ============
function CourierSettlementLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('activity_logs').select('*')
        .or('action.ilike.%حذف تحصيل%,action.ilike.%مسح حساب%,action.ilike.%تقفيل%,action.ilike.%collection%')
        .order('created_at', { ascending: false }).limit(50);
      setLogs(data || []);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Wallet className="h-4 w-4" /> سجل تقفيل حسابات المناديب</CardTitle></CardHeader>
      <CardContent>
        {loading ? <p className="text-center text-sm text-muted-foreground">جاري التحميل...</p> : (
          <div className="space-y-2 max-h-[250px] overflow-auto">
            {logs.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">لا توجد سجلات تقفيل</p>}
            {logs.map((log, i) => {
              const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
              return (
                <div key={i} className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30">
                  <Wallet className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{log.action}</p>
                    {details?.amount && <p className="text-xs text-muted-foreground">المبلغ: {Number(details.amount).toLocaleString()}</p>}
                    {details?.courier_name && <p className="text-xs text-muted-foreground">المندوب: {details.courier_name}</p>}
                    {details?.user_name && <p className="text-xs text-muted-foreground">بواسطة: {details.user_name}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(log.created_at), 'yyyy-MM-dd HH:mm')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============ Main ============
export default function NotificationsTab() {
  return (
    <div className="mt-4 space-y-4">
      <NotificationCenter />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SendNotification />
        <DailySummary />
      </div>
      <AutoAlertSettings />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PendingOrderAlerts />
        <CollectionOverflowAlert />
      </div>
      <CourierSettlementLog />
    </div>
  );
}
