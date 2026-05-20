import { useEffect, useRef, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScanLine, Trash2, Printer, UserPlus, UserMinus, Lock, Play, X, CheckCircle2, History } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { logActivity } from '@/lib/activityLogger';
import { printStickers as printBarcodeStickers } from '@/components/BarcodeStickerPrint';
import { useAuth } from '@/contexts/AuthContext';

type ScannedOrder = {
  id: string;
  barcode: string | null;
  customer_code?: string | null;
  customer_name: string;
  customer_phone?: string | null;
  governorate?: string | null;
  price: number;
  product_name?: string;
  status_id?: string | null;
  courier_id?: string | null;
  is_closed?: boolean;
  order_statuses?: { name: string; color: string } | null;
  offices?: { name: string } | null;
};

function beep(ok: boolean) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = ok ? 880 : 220;
    g.gain.value = 0.15;
    o.start();
    setTimeout(() => { o.stop(); ctx.close(); }, ok ? 90 : 220);
  } catch {}
}

export default function BarcodeScan() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [active, setActive] = useState(false);
  const [value, setValue] = useState('');
  const [orders, setOrders] = useState<ScannedOrder[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [bulkCourier, setBulkCourier] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionActions, setSessionActions] = useState<any[]>([]);
  const [confirmAssign, setConfirmAssign] = useState(false);
  const [confirmUnassign, setConfirmUnassign] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from('order_statuses').select('*').order('sort_order').then(({ data }) => setStatuses(data || []));
    (async () => {
      const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'courier');
      const ids = (roles || []).map((r: any) => r.user_id);
      if (ids.length === 0) { setCouriers([]); return; }
      const { data } = await supabase.from('profiles').select('id, full_name').in('id', ids).order('full_name');
      setCouriers(data || []);
    })();
  }, []);

  const courierName = (id?: string | null) => id ? (couriers.find(c => c.id === id)?.full_name || '-') : '-';

  const loadHistory = async () => {
    const { data } = await supabase.from('activity_logs')
      .select('*').like('action', 'barcode_%')
      .order('created_at', { ascending: false }).limit(200);
    setHistoryLogs(data || []);
    setHistoryOpen(true);
  };

  const startSession = async () => {
    if (!user) return;
    const { data, error } = await supabase.from('scan_sessions').insert({ user_id: user.id }).select().single();
    if (error) { toast.error('فشل بدء الجلسة'); return; }
    setSessionId(data.id);
    setSessionActions([]);
    setActive(true);
  };

  const endSession = async () => {
    if (!sessionId) { setActive(false); return; }
    await supabase.from('scan_sessions').update({
      ended_at: new Date().toISOString(),
      orders_count: orders.length,
      actions: sessionActions as any,
    }).eq('id', sessionId);
    toast.success(`تم إنهاء الجلسة - ${orders.length} أوردر`);
    setActive(false);
    setSessionId(null);
    setOrders([]);
    setSessionActions([]);
  };

  useEffect(() => {
    if (active) inputRef.current?.focus();
  }, [active]);

  // Realtime: reflect status changes in scanned list
  useEffect(() => {
    if (orders.length === 0) return;
    const ids = orders.map(o => o.id);
    const ch = supabase.channel('barcode-scan-rt')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload: any) => {
        if (!ids.includes(payload.new?.id)) return;
        setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orders.length]);

  const handleScan = async (raw: string) => {
    const code = raw.trim();
    if (!code) return;
    setValue('');
    if (orders.some(o => o.barcode === code || o.customer_code === code || o.id === code)) {
      beep(false);
      toast.error('الأوردر ممسوح بالفعل');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_statuses(name, color), offices(name)')
      .or(`barcode.eq.${code},customer_code.eq.${code}`)
      .limit(1)
      .maybeSingle();
    setLoading(false);
    if (error || !data) {
      beep(false);
      toast.error(`لم يتم العثور على الأوردر: ${code}`);
      return;
    }
    beep(true);
    setOrders(prev => [data as any, ...prev]);
    if (sessionId) {
      supabase.from('scan_session_items').insert({ session_id: sessionId, order_id: data.id, scanned_code: code });
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); handleScan(value); }
  };

  const totals = useMemo(() => ({
    count: orders.length,
    sum: orders.reduce((s, o) => s + (Number(o.price) || 0), 0),
  }), [orders]);

  const removeFromList = (id: string) => setOrders(prev => prev.filter(o => o.id !== id));
  const clearAll = () => { setOrders([]); toast.success('تم تفريغ القائمة'); };

  const applyBulkStatus = async () => {
    if (!bulkStatus || orders.length === 0) return;
    const ids = orders.map(o => o.id);
    const { error } = await supabase.from('orders').update({ status_id: bulkStatus }).in('id', ids);
    if (error) return toast.error('فشل تحديث الحالة');
    const st = statuses.find(s => s.id === bulkStatus);
    setOrders(prev => prev.map(o => ({ ...o, status_id: bulkStatus, order_statuses: { name: st?.name, color: st?.color } as any })));
    setSessionActions(prev => [...prev, { type: 'status', status: st?.name, count: ids.length, at: new Date().toISOString() }]);
    await logActivity('barcode_bulk_status', { count: ids.length, status: st?.name });
    toast.success(`تم تحديث ${ids.length} أوردر إلى: ${st?.name}`);
  };

  const doApplyCourier = async (clear: boolean) => {
    const ids = orders.map(o => o.id);
    const targetCourier = clear ? null : bulkCourier;
    const targetName = clear ? null : courierName(bulkCourier);
    // Capture previous assignments BEFORE update for detailed log
    const prevSnapshot = orders.map(o => ({
      order_id: o.id,
      barcode: o.barcode,
      customer_code: o.customer_code,
      customer_name: o.customer_name,
      prev_courier_id: o.courier_id || null,
      prev_courier_name: courierName(o.courier_id),
    }));
    const payload: any = { courier_id: targetCourier };
    if (!clear) {
      const cs = statuses.find(s => s.name === 'قيد التوصيل');
      if (cs) payload.status_id = cs.id;
    }
    const { error } = await supabase.from('orders').update(payload).in('id', ids);
    if (error) return toast.error('فشل تعيين المندوب');
    setOrders(prev => prev.map(o => ({ ...o, ...payload })));
    await logActivity(clear ? 'barcode_bulk_unassign' : 'barcode_bulk_assign', {
      count: ids.length,
      new_courier_id: targetCourier,
      new_courier_name: targetName,
      orders: prevSnapshot,
    });
    setSessionActions(prev => [...prev, { type: clear ? 'unassign' : 'assign', courier: targetName, count: ids.length, at: new Date().toISOString() }]);
    toast.success(clear ? `تم إزالة التعيين عن ${ids.length} أوردر` : `تم تعيين ${ids.length} أوردر للمندوب: ${targetName}`);
  };

  const applyBulkCourier = (clear = false) => {
    if (orders.length === 0) return;
    if (!clear && !bulkCourier) return;
    if (clear) setConfirmUnassign(true); else setConfirmAssign(true);
  };

  const closeAll = async () => {
    if (orders.length === 0) return;
    if (!confirm(`هل تريد تقفيل ${orders.length} أوردر؟`)) return;
    const ids = orders.map(o => o.id);
    const snapshot = orders.map(o => ({ order_id: o.id, barcode: o.barcode, customer_name: o.customer_name }));
    const { error } = await supabase.from('orders').update({ is_closed: true }).in('id', ids);
    if (error) return toast.error('فشل تقفيل الأوردرات');
    await logActivity('barcode_bulk_close', { count: ids.length, orders: snapshot });
    toast.success(`تم تقفيل ${ids.length} أوردر`);
    setOrders([]);
  };

  const printStickers = () => {
    if (orders.length === 0) return;
    printBarcodeStickers(orders as any);
    setSessionActions(prev => [...prev, { type: 'print', count: orders.length, at: new Date().toISOString() }]);
  };

  const exportCsv = () => {
    if (orders.length === 0) return;
    const rows = [
      ['الكود', 'العميل', 'الهاتف', 'المحافظة', 'المنتج', 'السعر', 'الحالة'],
      ...orders.map(o => [
        o.barcode || o.customer_code || '',
        o.customer_name, o.customer_phone || '', o.governorate || '',
        o.product_name || '', o.price, o.order_statuses?.name || '',
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `barcode-scan-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ScanLine className="w-6 h-6" /> قراءة الباركود</h1>
          <p className="text-sm text-muted-foreground tracking-[0.3em] uppercase">// barcode scan · v1.0</p>
        </div>
        {!active ? (
          <Button size="lg" className="h-14 px-8 text-lg" onClick={startSession}>
            <Play className="w-5 h-5 ml-2" /> ابدأ الاسكان
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button size="lg" className="h-14 px-6" onClick={endSession}>
              <CheckCircle2 className="w-5 h-5 ml-2" /> انتهيت
            </Button>
            <Button size="lg" variant="destructive" onClick={() => { setActive(false); setSessionId(null); }}>
              <X className="w-5 h-5 ml-2" /> إلغاء
            </Button>
          </div>
        )}
      </div>

      {active && (
        <Card className="p-4 border-primary/40 bg-primary/5">
          <label className="text-xs text-muted-foreground tracking-widest uppercase">// scan input · gun ready</label>
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => active && setTimeout(() => inputRef.current?.focus(), 50)}
            placeholder="امسح الباركود الآن..."
            className="h-16 text-2xl font-mono text-center mt-2"
            autoFocus
          />
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">عدد الأوردرات</div><div className="text-3xl font-bold">{totals.count}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">إجمالي السعر</div><div className="text-3xl font-bold">{totals.sum.toFixed(0)} ج</div></Card>
        <Card className="p-4 col-span-2"><div className="text-xs text-muted-foreground">آخر مسح</div><div className="text-lg font-mono truncate">{orders[0]?.barcode || '-'}</div></Card>
      </div>

      {orders.length > 0 && (
        <Card className="p-4 space-y-3">
          <h2 className="font-bold">أوامر جماعية</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="flex gap-2">
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger><SelectValue placeholder="اختر الحالة" /></SelectTrigger>
                <SelectContent>{statuses.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={applyBulkStatus} disabled={!bulkStatus}>تطبيق</Button>
            </div>
            <div className="flex gap-2">
              <Select value={bulkCourier} onValueChange={setBulkCourier}>
                <SelectTrigger><SelectValue placeholder="اختر مندوب" /></SelectTrigger>
                <SelectContent>{couriers.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={() => applyBulkCourier(false)} disabled={!bulkCourier}><UserPlus className="w-4 h-4" /></Button>
              <Button variant="outline" onClick={() => applyBulkCourier(true)}><UserMinus className="w-4 h-4" /></Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={printStickers}><Printer className="w-4 h-4 ml-1" /> طباعة ملصقات</Button>
              <Button variant="outline" onClick={exportCsv}>تصدير CSV</Button>
              <Button variant="destructive" onClick={closeAll}><Lock className="w-4 h-4 ml-1" /> تقفيل</Button>
              <Button variant="ghost" onClick={clearAll}>تفريغ القائمة</Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-0 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-right">الكود</th>
              <th className="p-2 text-right">العميل</th>
              <th className="p-2 text-right">المحافظة</th>
              <th className="p-2 text-right">المنتج</th>
              <th className="p-2 text-right">السعر</th>
              <th className="p-2 text-right">الحالة</th>
              <th className="p-2 text-right">المكتب</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">{active ? 'في انتظار المسح...' : 'اضغط "ابدأ الاسكان" للبدء'}</td></tr>
            )}
            {orders.map(o => (
              <tr key={o.id} className="border-t">
                <td className="p-2 font-mono">{o.barcode || o.customer_code}</td>
                <td className="p-2">{o.customer_name}</td>
                <td className="p-2">{o.governorate}</td>
                <td className="p-2">{o.product_name}</td>
                <td className="p-2 font-bold">{Number(o.price).toFixed(0)}</td>
                <td className="p-2">
                  <Badge style={{ backgroundColor: o.order_statuses?.color || undefined }}>{o.order_statuses?.name || 'بدون'}</Badge>
                </td>
                <td className="p-2">{o.offices?.name || '-'}</td>
                <td className="p-2"><Button size="sm" variant="ghost" onClick={() => removeFromList(o.id)}><Trash2 className="w-4 h-4" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
