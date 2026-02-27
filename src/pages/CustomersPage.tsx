import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Plus, Phone, Package, Trash2, Edit, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [custRes, ordRes] = await Promise.all([
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('id, customer_phone, customer_name, price, delivery_price, created_at, is_closed'),
    ]);
    setCustomers(custRes.data || []);
    setOrders(ordRes.data || []);
  };

  const filtered = customers.filter(c =>
    c.name.includes(search) || c.phone.includes(search)
  );

  const getCustomerOrders = (phone: string) => orders.filter(o => o.customer_phone === phone);

  const save = async () => {
    if (!name.trim() || !phone.trim()) { toast.error('أدخل الاسم والهاتف'); return; }
    if (editId) {
      await supabase.from('customers').update({ name, phone }).eq('id', editId);
      toast.success('تم التحديث');
    } else {
      await supabase.from('customers').insert({ name, phone });
      toast.success('تمت الإضافة');
    }
    setDialogOpen(false); setEditId(null); setName(''); setPhone('');
    loadData();
  };

  const remove = async (id: string) => {
    if (!confirm('حذف هذا العميل؟')) return;
    await supabase.from('customers').delete().eq('id', id);
    toast.success('تم الحذف');
    loadData();
  };

  const edit = (c: any) => {
    setEditId(c.id); setName(c.name); setPhone(c.phone); setDialogOpen(true);
  };

  const customerOrders = selectedCustomer ? getCustomerOrders(selectedCustomer) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl sm:text-2xl font-bold">العملاء</h1>
        <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) { setEditId(null); setName(''); setPhone(''); } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 ml-1" />إضافة عميل</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>{editId ? 'تعديل عميل' : 'إضافة عميل جديد'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>الاسم</Label><Input value={name} onChange={e => setName(e.target.value)} className="bg-secondary border-border" /></div>
              <div><Label>الهاتف</Label><Input value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" className="bg-secondary border-border" /></div>
              <Button onClick={save} className="w-full">{editId ? 'تحديث' : 'إضافة'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-lg">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="بحث بالاسم أو الهاتف..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9 bg-secondary border-border" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-right">الاسم</TableHead>
                      <TableHead className="text-right">الهاتف</TableHead>
                      <TableHead className="text-center">الأوردرات</TableHead>
                      <TableHead className="text-center">الإجمالي</TableHead>
                      <TableHead className="text-center">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">لا يوجد عملاء</TableCell></TableRow>
                    ) : filtered.map(c => {
                      const custOrders = getCustomerOrders(c.phone);
                      const total = custOrders.reduce((s, o) => s + Number(o.price) + Number(o.delivery_price), 0);
                      return (
                        <TableRow key={c.id} className="border-border cursor-pointer hover:bg-secondary/50" onClick={() => setSelectedCustomer(c.phone)}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell dir="ltr">{c.phone}</TableCell>
                          <TableCell className="text-center">{custOrders.length}</TableCell>
                          <TableCell className="text-center font-bold">{total.toLocaleString()} ج.م</TableCell>
                          <TableCell>
                            <div className="flex gap-1 justify-center">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); window.open(`tel:${c.phone}`); }}>
                                <Phone className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); window.open(`https://wa.me/${c.phone.replace(/^0/, '20')}`); }}>
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); edit(c); }}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={e => { e.stopPropagation(); remove(c.id); }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customer Order History */}
        <div>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <h3 className="font-bold mb-3 flex items-center gap-2"><Package className="h-4 w-4" />سجل الأوردرات</h3>
              {!selectedCustomer ? (
                <p className="text-sm text-muted-foreground">اختر عميل لعرض أوردراته</p>
              ) : customerOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا توجد أوردرات</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {customerOrders.map(o => (
                    <div key={o.id} className="p-2 rounded-lg bg-secondary/50 text-sm">
                      <div className="flex justify-between">
                        <span>{o.customer_name}</span>
                        <span className="font-bold">{(Number(o.price) + Number(o.delivery_price)).toLocaleString()} ج.م</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString('ar-EG')} | {o.is_closed ? 'مغلق' : 'مفتوح'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
