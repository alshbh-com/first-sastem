import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const load = async () => {
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    setCustomers(data || []);
  };

  useEffect(() => { load(); }, []);

  const addCustomer = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error('الاسم والهاتف مطلوبين');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('customers').insert({ name: name.trim(), phone: phone.trim() });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('تم إضافة العميل');
      setName('');
      setPhone('');
      setOpen(false);
      load();
    }
    setLoading(false);
  };

  const filtered = customers.filter(c =>
    c.name?.includes(search) || c.phone?.includes(search)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">العملاء</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 ml-2" />إضافة عميل</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>إضافة عميل جديد</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>الاسم *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} className="bg-secondary border-border" placeholder="اسم العميل" />
              </div>
              <div className="space-y-2">
                <Label>رقم الهاتف *</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} className="bg-secondary border-border" placeholder="01xxxxxxxxx" dir="ltr" />
              </div>
              <Button onClick={addCustomer} className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'إضافة العميل'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="بحث بالاسم أو الهاتف..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9 bg-secondary border-border" />
      </div>
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">الهاتف</TableHead>
                <TableHead className="text-right">تاريخ التسجيل</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">لا يوجد عملاء</TableCell></TableRow>
              ) : filtered.map((c) => (
                <TableRow key={c.id} className="border-border">
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell dir="ltr">{c.phone}</TableCell>
                  <TableCell>{new Date(c.created_at).toLocaleDateString('ar-EG')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
