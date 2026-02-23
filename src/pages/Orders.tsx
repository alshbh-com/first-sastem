import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Search, UserPlus, Lock } from 'lucide-react';
import { toast } from 'sonner';
import AddOrderDialog from '@/components/AddOrderDialog';

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterOffice, setFilterOffice] = useState('all');
  const [filterCompany, setFilterCompany] = useState('all');
  const [offices, setOffices] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignCourier, setAssignCourier] = useState('');

  useEffect(() => {
    loadOrders();
    loadFilters();
  }, []);

  const loadFilters = async () => {
    const [o, c, r] = await Promise.all([
      supabase.from('offices').select('id, name').order('name'),
      supabase.from('companies').select('id, name').order('name'),
      supabase.from('user_roles').select('user_id').eq('role', 'courier'),
    ]);
    setOffices(o.data || []);
    setCompanies(c.data || []);
    if (r.data && r.data.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', r.data.map(x => x.user_id));
      setCouriers(profiles || []);
    }
  };

  const loadOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, order_statuses(name, color), companies(name), offices(name)')
      .eq('is_closed', false)
      .order('created_at', { ascending: false })
      .limit(500);
    setOrders(data || []);
  };

  const filtered = orders.filter(o => {
    const matchSearch = !search || 
      o.tracking_id?.includes(search) ||
      o.customer_name?.includes(search) ||
      o.customer_phone?.includes(search) ||
      o.barcode?.includes(search);
    const matchOffice = filterOffice === 'all' || o.office_id === filterOffice;
    const matchCompany = filterCompany === 'all' || o.company_id === filterCompany;
    return matchSearch && matchOffice && matchCompany;
  });

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(o => o.id)));
    }
  };

  const assignToCourier = async () => {
    if (!assignCourier || selected.size === 0) {
      toast.error('اختر مندوب واوردرات');
      return;
    }
    const { error } = await supabase.from('orders').update({ courier_id: assignCourier }).in('id', Array.from(selected));
    if (error) { toast.error(error.message); return; }
    toast.success(`تم تعيين ${selected.size} أوردر للمندوب`);
    setSelected(new Set());
    setAssignCourier('');
    loadOrders();
  };

  const closeSelected = async () => {
    if (selected.size === 0) { toast.error('اختر أوردرات أولاً'); return; }
    if (!confirm(`هل تريد تقفيل ${selected.size} أوردر؟ ستنقل للأوردرات القديمة.`)) return;
    const { error } = await supabase.from('orders').update({ is_closed: true }).in('id', Array.from(selected));
    if (error) { toast.error(error.message); return; }
    toast.success(`تم تقفيل ${selected.size} أوردر`);
    setSelected(new Set());
    loadOrders();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">الأوردرات</h1>
        <AddOrderDialog onOrderAdded={loadOrders} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative w-64">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9 bg-secondary border-border" />
        </div>
        <Select value={filterOffice} onValueChange={setFilterOffice}>
          <SelectTrigger className="w-40 bg-secondary border-border"><SelectValue placeholder="المكتب" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل المكاتب</SelectItem>
            {offices.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCompany} onValueChange={setFilterCompany}>
          <SelectTrigger className="w-40 bg-secondary border-border"><SelectValue placeholder="الشركة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الشركات</SelectItem>
            {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex flex-wrap gap-3 items-center p-3 bg-secondary rounded-lg border border-border">
          <span className="text-sm font-medium">تم تحديد {selected.size} أوردر</span>
          <Select value={assignCourier} onValueChange={setAssignCourier}>
            <SelectTrigger className="w-44 bg-card border-border"><SelectValue placeholder="اختر مندوب" /></SelectTrigger>
            <SelectContent>
              {couriers.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={assignToCourier} disabled={!assignCourier}>
            <UserPlus className="h-4 w-4 ml-1" />تعيين مندوب
          </Button>
          <Button size="sm" variant="destructive" onClick={closeSelected}>
            <Lock className="h-4 w-4 ml-1" />تم التقفيل
          </Button>
        </div>
      )}

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="w-10">
                    <Checkbox checked={filtered.length > 0 && selected.size === filtered.length} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead className="text-right">Tracking</TableHead>
                  <TableHead className="text-right">العميل</TableHead>
                  <TableHead className="text-right">الهاتف</TableHead>
                  <TableHead className="text-right">المنتج</TableHead>
                  <TableHead className="text-right">السعر</TableHead>
                  <TableHead className="text-right">الشركة</TableHead>
                  <TableHead className="text-right">المكتب</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">لا توجد أوردرات</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((order) => (
                    <TableRow key={order.id} className="border-border">
                      <TableCell>
                        <Checkbox checked={selected.has(order.id)} onCheckedChange={() => toggleSelect(order.id)} />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{order.tracking_id}</TableCell>
                      <TableCell>{order.customer_name}</TableCell>
                      <TableCell dir="ltr">{order.customer_phone}</TableCell>
                      <TableCell>{order.product_name}</TableCell>
                      <TableCell>{order.price} ج.م</TableCell>
                      <TableCell>{order.companies?.name || '-'}</TableCell>
                      <TableCell>{order.offices?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge style={{ backgroundColor: order.order_statuses?.color || undefined }} className="text-xs">
                          {order.order_statuses?.name || 'بدون حالة'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
