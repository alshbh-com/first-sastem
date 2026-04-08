import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, FileBarChart, Receipt, Calendar, Users, DollarSign, Clock, BarChart3, Download, Printer, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ============ 1. تقرير PDF شامل ============
function ComprehensivePDFReport() {
  const [dateFrom, setDateFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [officeId, setOfficeId] = useState('all');
  const [offices, setOffices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [columns, setColumns] = useState({
    tracking: true, customer: true, phone: true, product: true, price: true,
    delivery: true, status: true, office: true, courier: true, governorate: true
  });

  useEffect(() => {
    supabase.from('offices').select('id, name').then(({ data }) => setOffices(data || []));
  }, []);

  const generatePDF = async () => {
    setLoading(true);
    try {
      let query = supabase.from('orders').select('*, order_statuses(name)');
      if (officeId !== 'all') query = query.eq('office_id', officeId);
      query = query.gte('created_at', dateFrom).lte('created_at', dateTo + 'T23:59:59');
      const { data: orders } = await query.limit(5000);
      if (!orders?.length) { toast.error('لا توجد بيانات'); setLoading(false); return; }

      const officeMap = Object.fromEntries(offices.map(o => [o.id, o.name]));
      const headers: string[] = [];
      const keys: string[] = [];
      if (columns.tracking) { headers.push('رقم التتبع'); keys.push('tracking_id'); }
      if (columns.customer) { headers.push('العميل'); keys.push('customer_name'); }
      if (columns.phone) { headers.push('الهاتف'); keys.push('customer_phone'); }
      if (columns.product) { headers.push('المنتج'); keys.push('product_name'); }
      if (columns.price) { headers.push('السعر'); keys.push('price'); }
      if (columns.delivery) { headers.push('التوصيل'); keys.push('delivery_price'); }
      if (columns.status) { headers.push('الحالة'); keys.push('_status'); }
      if (columns.office) { headers.push('المكتب'); keys.push('_office'); }
      if (columns.governorate) { headers.push('المحافظة'); keys.push('governorate'); }

      const rows = orders.map(o => keys.map(k => {
        if (k === '_status') return (o as any).order_statuses?.name || '-';
        if (k === '_office') return officeMap[o.office_id || ''] || '-';
        return String((o as any)[k] ?? '-');
      }));

      const win = window.open('', '_blank', 'width=900,height=700');
      if (!win) { toast.error('تم حظر النافذة'); setLoading(false); return; }
      win.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>تقرير الأوردرات</title>
      <style>body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;padding:20px;direction:rtl}
      h2{text-align:center;margin-bottom:5px}p.sub{text-align:center;color:#666;font-size:13px}
      table{width:100%;border-collapse:collapse;margin-top:15px}
      th{background:#3b82f6;color:#fff;padding:8px;text-align:right;font-size:12px}
      td{padding:6px 8px;border-bottom:1px solid #ddd;font-size:12px}
      tr:nth-child(even){background:#f9fafb}
      @media print{body{padding:10px}}</style></head><body>
      <h2>FIRST - تقرير الأوردرات الشامل</h2>
      <p class="sub">من: ${dateFrom} - إلى: ${dateTo} | إجمالي: ${orders.length} أوردر</p>
      <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>
      </body></html>`);
      win.document.close();
      setTimeout(() => win.print(), 300);
      toast.success('تم فتح التقرير للطباعة');
    } catch { toast.error('حدث خطأ'); }
    setLoading(false);
  };

  const colKeys = Object.keys(columns) as (keyof typeof columns)[];
  const colLabels: Record<string, string> = { tracking: 'رقم التتبع', customer: 'العميل', phone: 'الهاتف', product: 'المنتج', price: 'السعر', delivery: 'التوصيل', status: 'الحالة', office: 'المكتب', courier: 'المندوب', governorate: 'المحافظة' };

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> تقرير PDF شامل قابل للتخصيص</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div><Label>من تاريخ</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
          <div><Label>إلى تاريخ</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
          <div><Label>المكتب</Label>
            <Select value={officeId} onValueChange={setOfficeId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">الكل</SelectItem>{offices.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="mb-2 block">اختر الأعمدة</Label>
          <div className="flex flex-wrap gap-2">
            {colKeys.map(k => (
              <Badge key={k} variant={columns[k] ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setColumns(p => ({ ...p, [k]: !p[k] }))}>
                {colLabels[k]}
              </Badge>
            ))}
          </div>
        </div>
        <Button onClick={generatePDF} disabled={loading} className="w-full"><Download className="h-4 w-4 ml-2" />{loading ? 'جاري التحميل...' : 'تحميل PDF'}</Button>
      </CardContent>
    </Card>
  );
}

// ============ 2. كشف حساب مفصل لكل مكتب ============
function OfficeAccountStatement() {
  const [officeId, setOfficeId] = useState('');
  const [offices, setOffices] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState(format(new Date(Date.now() - 30 * 86400000), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [statement, setStatement] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('offices').select('id, name').then(({ data }) => setOffices(data || []));
  }, []);

  const generate = async () => {
    if (!officeId) { toast.error('اختر مكتب'); return; }
    setLoading(true);
    const [ordersRes, paymentsRes] = await Promise.all([
      supabase.from('orders').select('*, order_statuses(name)').eq('office_id', officeId).gte('created_at', dateFrom).lte('created_at', dateTo + 'T23:59:59').limit(5000),
      supabase.from('office_payments').select('*').eq('office_id', officeId).gte('created_at', dateFrom).lte('created_at', dateTo + 'T23:59:59')
    ]);
    const orders = ordersRes.data || [];
    const payments = paymentsRes.data || [];
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((s, o) => s + Number(o.price || 0), 0);
    const totalDelivery = orders.reduce((s, o) => s + Number(o.delivery_price || 0), 0);
    const totalPayments = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    setStatement({ orders, payments, totalOrders, totalRevenue, totalDelivery, totalPayments, balance: totalRevenue - totalDelivery - totalPayments });
    setLoading(false);
  };

  const exportPDF = () => {
    if (!statement) return;
    const officeName = offices.find(o => o.id === officeId)?.name || '';
    const win = window.open('', '_blank', 'width=800,height=700');
    if (!win) { toast.error('تم حظر النافذة'); return; }
    const paymentsRows = statement.payments.map((p: any) =>
      `<tr><td>${format(new Date(p.created_at), 'yyyy-MM-dd')}</td><td>${Number(p.amount).toLocaleString('en-US')}</td><td>${p.notes || '-'}</td></tr>`
    ).join('');
    win.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>كشف حساب</title>
    <style>body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;padding:20px;direction:rtl}
    h2{text-align:center}p.sub{text-align:center;color:#666;font-size:13px}
    table{width:100%;border-collapse:collapse;margin-top:15px}
    th{background:#22c55e;color:#fff;padding:8px;text-align:right;font-size:13px}
    td{padding:6px 8px;border-bottom:1px solid #ddd;font-size:13px}
    h3{margin-top:25px;color:#3b82f6}
    @media print{body{padding:10px}}</style></head><body>
    <h2>كشف حساب - ${officeName}</h2>
    <p class="sub">من: ${dateFrom} - إلى: ${dateTo}</p>
    <table><thead><tr><th>البيان</th><th>القيمة</th></tr></thead><tbody>
    <tr><td>إجمالي الأوردرات</td><td>${statement.totalOrders}</td></tr>
    <tr><td>إجمالي المبيعات</td><td>${statement.totalRevenue.toLocaleString('en-US')} ج.م</td></tr>
    <tr><td>إجمالي الشحن</td><td>${statement.totalDelivery.toLocaleString('en-US')} ج.م</td></tr>
    <tr><td>إجمالي المدفوعات</td><td>${statement.totalPayments.toLocaleString('en-US')} ج.م</td></tr>
    <tr><td><strong>الرصيد</strong></td><td><strong>${statement.balance.toLocaleString('en-US')} ج.م</strong></td></tr>
    </tbody></table>
    ${statement.payments.length ? `<h3>تفاصيل المدفوعات</h3>
    <table><thead><tr><th>التاريخ</th><th>المبلغ</th><th>ملاحظات</th></tr></thead>
    <tbody>${paymentsRows}</tbody></table>` : ''}
    </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 300);
    toast.success('تم فتح كشف الحساب للطباعة');
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileBarChart className="h-4 w-4" /> كشف حساب مفصل لكل مكتب</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div><Label>المكتب</Label>
            <Select value={officeId} onValueChange={setOfficeId}>
              <SelectTrigger><SelectValue placeholder="اختر مكتب" /></SelectTrigger>
              <SelectContent>{offices.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>من</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
          <div><Label>إلى</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
        </div>
        <Button onClick={generate} disabled={loading} className="w-full">{loading ? 'جاري...' : 'عرض كشف الحساب'}</Button>
        {statement && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'إجمالي الأوردرات', value: statement.totalOrders, color: 'text-blue-600' },
                { label: 'إجمالي المبيعات', value: statement.totalRevenue.toLocaleString('en-US'), color: 'text-green-600' },
                { label: 'إجمالي المدفوعات', value: statement.totalPayments.toLocaleString('en-US'), color: 'text-orange-600' },
                { label: 'الرصيد', value: statement.balance.toLocaleString('en-US'), color: statement.balance >= 0 ? 'text-green-600' : 'text-red-600' },
              ].map((item, i) => (
                <div key={i} className="p-3 rounded-lg border bg-muted/30 text-center">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>
            <Button variant="outline" onClick={exportPDF} className="w-full"><Download className="h-4 w-4 ml-2" /> تحميل PDF</Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============ 3. جدول رواتب المندوبين ============
function CourierSalaryReport() {
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [salaryData, setSalaryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;
    const [profilesRes, advancesRes, bonusesRes, fuelRes, collectionsRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, salary').then(r => r),
      supabase.from('advances').select('*').gte('created_at', startDate).lte('created_at', endDate + 'T23:59:59'),
      supabase.from('courier_bonuses').select('*').gte('created_at', startDate).lte('created_at', endDate + 'T23:59:59'),
      supabase.from('fuel_entries').select('*').gte('entry_date', startDate).lte('entry_date', endDate),
      supabase.from('courier_collections').select('*').gte('created_at', startDate).lte('created_at', endDate + 'T23:59:59'),
    ]);
    const profiles = profilesRes.data || [];
    const advances = advancesRes.data || [];
    const bonuses = bonusesRes.data || [];
    const fuel = fuelRes.data || [];
    const collections = collectionsRes.data || [];

    const data = profiles.filter(p => p.salary > 0).map(p => {
      const totalAdvances = advances.filter(a => a.user_id === p.id).reduce((s, a) => s + Number(a.amount), 0);
      const totalBonuses = bonuses.filter(b => b.courier_id === p.id).reduce((s, b) => s + Number(b.amount), 0);
      const totalFuel = fuel.filter(f => f.courier_id === p.id).reduce((s, f) => s + Number(f.amount), 0);
      const totalCollections = collections.filter(c => c.courier_id === p.id).reduce((s, c) => s + Number(c.amount), 0);
      const net = Number(p.salary) + totalBonuses - totalAdvances - totalFuel;
      return { ...p, totalAdvances, totalBonuses, totalFuel, totalCollections, net };
    });
    setSalaryData(data);
    setLoading(false);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text(`Courier Salaries - ${month}`, 140, 15, { align: 'center' });
    autoTable(doc, {
      startY: 25,
      head: [['Name', 'Salary', 'Bonuses', 'Advances', 'Fuel', 'Collections', 'Net']],
      body: salaryData.map(d => [d.full_name, d.salary, d.totalBonuses, d.totalAdvances, d.totalFuel, d.totalCollections, d.net]),
      headStyles: { fillColor: [147, 51, 234] },
      foot: [['Total', '', '', '', '', '', salaryData.reduce((s, d) => s + d.net, 0).toLocaleString('en-US')]],
    });
    doc.save(`salaries-${month}.pdf`);
    toast.success('تم تحميل جدول الرواتب');
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> جدول رواتب المندوبين الشهري</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3 items-end">
          <div className="flex-1"><Label>الشهر</Label><Input type="month" value={month} onChange={e => setMonth(e.target.value)} /></div>
          <Button onClick={generate} disabled={loading}>{loading ? 'جاري...' : 'حساب'}</Button>
        </div>
        {salaryData.length > 0 && (
          <>
            <div className="overflow-auto max-h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead><TableHead>الراتب</TableHead><TableHead>مكافآت</TableHead>
                    <TableHead>سلف</TableHead><TableHead>وقود</TableHead><TableHead>صافي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaryData.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.full_name}</TableCell>
                      <TableCell>{Number(d.salary).toLocaleString('en-US')}</TableCell>
                      <TableCell className="text-green-600">+{d.totalBonuses.toLocaleString('en-US')}</TableCell>
                      <TableCell className="text-red-600">-{d.totalAdvances.toLocaleString('en-US')}</TableCell>
                      <TableCell className="text-orange-600">-{d.totalFuel.toLocaleString('en-US')}</TableCell>
                      <TableCell className={`font-bold ${d.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{d.net.toLocaleString('en-US')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button variant="outline" onClick={exportPDF} className="w-full"><Download className="h-4 w-4 ml-2" /> تحميل PDF</Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============ 4. إيصال استلام فلوس ============
function CollectionReceipt() {
  const [courierId, setCourierId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('تحصيل أوردرات');
  const [couriers, setCouriers] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('profiles').select('id, full_name').then(({ data }) => setCouriers(data || []));
  }, []);

  const printReceipt = () => {
    if (!courierId || !amount) { toast.error('أكمل البيانات'); return; }
    const courierName = couriers.find(c => c.id === courierId)?.full_name || '';
    const now = new Date();
    const receiptNo = `REC-${Date.now().toString(36).toUpperCase()}`;
    const dateStr = format(now, 'yyyy-MM-dd HH:mm');
    const amountStr = Number(amount).toLocaleString('en-US');

    const win = window.open('', '_blank', 'width=600,height=700');
    if (!win) { toast.error('تم حظر النافذة المنبثقة'); return; }
    win.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>إيصال استلام</title>
    <style>
      body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 30px; direction: rtl; }
      h1 { text-align: center; font-size: 22px; margin-bottom: 5px; }
      .line { border-bottom: 2px dashed #ccc; margin: 10px 0 20px; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      th { background: #f59e0b; color: #fff; padding: 10px; text-align: right; font-size: 14px; }
      td { padding: 10px; border-bottom: 1px solid #ddd; font-size: 14px; }
      .label { font-weight: bold; width: 35%; background: #fefce8; }
      .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
      .sig-box { text-align: center; }
      .sig-line { border-top: 1px solid #333; width: 180px; margin-top: 40px; padding-top: 5px; }
      @media print { body { padding: 20px; } }
    </style></head><body>
    <h1>FIRST - إيصال استلام فلوس</h1>
    <div class="line"></div>
    <table>
      <tr><th>البيان</th><th>التفاصيل</th></tr>
      <tr><td class="label">التاريخ</td><td>${dateStr}</td></tr>
      <tr><td class="label">رقم الإيصال</td><td>${receiptNo}</td></tr>
      <tr><td class="label">المندوب</td><td>${courierName}</td></tr>
      <tr><td class="label">المبلغ</td><td>${amountStr} ج.م</td></tr>
      <tr><td class="label">السبب</td><td>${reason}</td></tr>
    </table>
    <div class="signatures">
      <div class="sig-box"><div class="sig-line">المستلم</div></div>
      <div class="sig-box"><div class="sig-line">التوقيع</div></div>
    </div>
    </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 300);
    toast.success('تم فتح الإيصال للطباعة');
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Receipt className="h-4 w-4" /> إيصال استلام فلوس من المندوب</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><Label>المندوب</Label>
            <Select value={courierId} onValueChange={setCourierId}>
              <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
              <SelectContent>{couriers.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>المبلغ</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" /></div>
          <div><Label>السبب</Label><Input value={reason} onChange={e => setReason(e.target.value)} /></div>
        </div>
        <Button onClick={printReceipt} className="w-full"><Printer className="h-4 w-4 ml-2" /> طباعة إيصال PDF</Button>
      </CardContent>
    </Card>
  );
}

// ============ 5. تقرير مقارنة فترات ============
function PeriodComparison() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const compare = async () => {
    setLoading(true);
    const now = new Date();
    const thisStart = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
    const thisEnd = format(now, 'yyyy-MM-dd');
    const lastStart = format(new Date(now.getFullYear(), now.getMonth() - 1, 1), 'yyyy-MM-dd');
    const lastEnd = format(new Date(now.getFullYear(), now.getMonth(), 0), 'yyyy-MM-dd');

    const [thisRes, lastRes] = await Promise.all([
      supabase.from('orders').select('price, delivery_price').gte('created_at', thisStart).lte('created_at', thisEnd + 'T23:59:59'),
      supabase.from('orders').select('price, delivery_price').gte('created_at', lastStart).lte('created_at', lastEnd + 'T23:59:59'),
    ]);
    const thisOrders = thisRes.data || [];
    const lastOrders = lastRes.data || [];
    setResult({
      thisMonth: { count: thisOrders.length, revenue: thisOrders.reduce((s, o) => s + Number(o.price), 0), shipping: thisOrders.reduce((s, o) => s + Number(o.delivery_price), 0) },
      lastMonth: { count: lastOrders.length, revenue: lastOrders.reduce((s, o) => s + Number(o.price), 0), shipping: lastOrders.reduce((s, o) => s + Number(o.delivery_price), 0) },
    });
    setLoading(false);
  };

  const pct = (a: number, b: number) => b === 0 ? 0 : Math.round(((a - b) / b) * 100);

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4" /> مقارنة هذا الشهر بالسابق</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={compare} disabled={loading} className="w-full">{loading ? 'جاري...' : 'مقارنة'}</Button>
        {result && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'عدد الأوردرات', curr: result.thisMonth.count, prev: result.lastMonth.count },
              { label: 'الإيرادات', curr: result.thisMonth.revenue, prev: result.lastMonth.revenue },
              { label: 'الشحن', curr: result.thisMonth.shipping, prev: result.lastMonth.shipping },
            ].map((item, i) => {
              const change = pct(item.curr, item.prev);
              return (
                <div key={i} className="p-3 rounded-lg border bg-muted/30 text-center">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-lg font-bold">{item.curr.toLocaleString('en-US')}</p>
                  <p className="text-xs text-muted-foreground">السابق: {item.prev.toLocaleString('en-US')}</p>
                  <Badge variant={change >= 0 ? 'default' : 'destructive'} className="mt-1">{change >= 0 ? '+' : ''}{change}%</Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============ 6. تقرير أوردرات بدون حركة ============
function StaleOrdersReport() {
  const [days, setDays] = useState('7');
  const [staleOrders, setStaleOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const find = async () => {
    setLoading(true);
    const cutoff = new Date(Date.now() - Number(days) * 86400000).toISOString();
    const { data } = await supabase.from('orders').select('tracking_id, customer_name, product_name, created_at, updated_at, order_statuses(name)')
      .eq('is_closed', false).lt('updated_at', cutoff).order('updated_at', { ascending: true }).limit(200);
    setStaleOrders(data || []);
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" /> أوردرات بدون حركة (راكدة)</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3 items-end">
          <div className="flex-1"><Label>عدد الأيام بدون تحديث</Label><Input type="number" value={days} onChange={e => setDays(e.target.value)} /></div>
          <Button onClick={find} disabled={loading}>{loading ? 'جاري...' : 'بحث'}</Button>
        </div>
        {staleOrders.length > 0 && (
          <div className="overflow-auto max-h-[250px]">
            <Table>
              <TableHeader><TableRow><TableHead>التتبع</TableHead><TableHead>العميل</TableHead><TableHead>الحالة</TableHead><TableHead>آخر تحديث</TableHead></TableRow></TableHeader>
              <TableBody>
                {staleOrders.map((o, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{o.tracking_id}</TableCell>
                    <TableCell className="text-xs">{o.customer_name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{(o as any).order_statuses?.name || '-'}</Badge></TableCell>
                    <TableCell className="text-xs">{format(new Date(o.updated_at), 'MM/dd HH:mm')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {staleOrders.length === 0 && !loading && <p className="text-center text-sm text-muted-foreground">لا توجد أوردرات راكدة</p>}
      </CardContent>
    </Card>
  );
}

// ============ Main ============
export default function ReportsTab() {
  return (
    <div className="mt-4 space-y-4">
      <ComprehensivePDFReport />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <OfficeAccountStatement />
        <CourierSalaryReport />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CollectionReceipt />
        <PeriodComparison />
      </div>
      <StaleOrdersReport />
    </div>
  );
}
