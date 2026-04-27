import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, Search, UserPlus2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { logActivity } from '@/lib/activityLogger';

type Application = {
  id: string;
  full_name: string;
  phone: string;
  address: string;
  current_job: string;
  coverage_areas: string;
  agreed_amount: number;
  notes: string;
  status: string;
  created_at: string;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'قيد المراجعة', color: 'bg-amber-500' },
  accepted: { label: 'مقبول', color: 'bg-emerald-600' },
  rejected: { label: 'مرفوض', color: 'bg-red-600' },
  hired: { label: 'تم التوظيف', color: 'bg-blue-600' },
};

const emptyForm = {
  full_name: '',
  phone: '',
  address: '',
  current_job: '',
  coverage_areas: '',
  agreed_amount: 0,
  notes: '',
  status: 'pending',
};

export default function CourierApplications() {
  const { user, isOwner } = useAuth();
  const [items, setItems] = useState<Application[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Application | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from('courier_applications')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { toast.error(error.message); return; }
    setItems((data || []) as Application[]);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (a: Application) => {
    setEditing(a);
    setForm({
      full_name: a.full_name,
      phone: a.phone,
      address: a.address,
      current_job: a.current_job,
      coverage_areas: a.coverage_areas,
      agreed_amount: Number(a.agreed_amount) || 0,
      notes: a.notes,
      status: a.status,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.full_name.trim()) { toast.error('الاسم مطلوب'); return; }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from('courier_applications')
          .update(form)
          .eq('id', editing.id);
        if (error) throw error;
        logActivity('تعديل طلب عامل', { name: form.full_name });
        toast.success('تم التعديل');
      } else {
        const { error } = await supabase
          .from('courier_applications')
          .insert({ ...form, created_by: user?.id });
        if (error) throw error;
        logActivity('إضافة طلب عامل جديد', { name: form.full_name });
        toast.success('تم الحفظ');
      }
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (a: Application) => {
    if (!confirm(`حذف طلب "${a.full_name}" نهائياً؟`)) return;
    const { error } = await supabase.from('courier_applications').delete().eq('id', a.id);
    if (error) { toast.error(error.message); return; }
    logActivity('حذف طلب عامل', { name: a.full_name });
    toast.success('تم الحذف');
    load();
  };

  const filtered = items.filter(a => {
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      a.full_name?.toLowerCase().includes(s) ||
      a.phone?.includes(search) ||
      a.address?.toLowerCase().includes(s) ||
      a.coverage_areas?.toLowerCase().includes(s) ||
      a.current_job?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <UserPlus2 className="h-6 w-6 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold">طلبات عمال</h1>
          <Badge variant="outline">{items.length}</Badge>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 ml-1" /> إضافة طلب جديد
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو الهاتف أو المنطقة..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pr-9 bg-secondary border-border"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44 bg-secondary border-border">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">الهاتف</TableHead>
                  <TableHead className="text-right">العنوان</TableHead>
                  <TableHead className="text-right">العمل الحالي</TableHead>
                  <TableHead className="text-right">مناطق التغطية</TableHead>
                  <TableHead className="text-right">الاتفاق</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      لا توجد طلبات
                    </TableCell>
                  </TableRow>
                ) : filtered.map(a => {
                  const st = STATUS_LABELS[a.status] || STATUS_LABELS.pending;
                  return (
                    <TableRow key={a.id} className="border-border">
                      <TableCell className="font-medium">{a.full_name}</TableCell>
                      <TableCell dir="ltr" className="font-mono text-sm">{a.phone || '-'}</TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate">{a.address || '-'}</TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate">{a.current_job || '-'}</TableCell>
                      <TableCell className="text-sm max-w-[180px] truncate">{a.coverage_areas || '-'}</TableCell>
                      <TableCell className="text-sm font-bold">
                        {Number(a.agreed_amount).toLocaleString('en-US')} ج.م
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs text-white ${st.color}`}>{st.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(a)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {isOwner && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                              onClick={() => remove(a)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing ? 'تعديل طلب عامل' : 'إضافة طلب عامل جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>الاسم *</Label>
                <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} maxLength={100} />
              </div>
              <div className="space-y-1">
                <Label>رقم الهاتف</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} dir="ltr" maxLength={20} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>العنوان</Label>
              <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} maxLength={250} />
            </div>
            <div className="space-y-1">
              <Label>العمل الحالي</Label>
              <Input value={form.current_job} onChange={e => setForm({ ...form, current_job: e.target.value })} maxLength={150} />
            </div>
            <div className="space-y-1">
              <Label>مناطق التغطية</Label>
              <Textarea
                value={form.coverage_areas}
                onChange={e => setForm({ ...form, coverage_areas: e.target.value })}
                placeholder="مثال: مدينة نصر، مصر الجديدة، المعادي"
                rows={2}
                maxLength={500}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>الاتفاق (ج.م)</Label>
                <Input
                  type="number"
                  value={form.agreed_amount || ''}
                  placeholder="0"
                  onChange={e => setForm({ ...form, agreed_amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1">
                <Label>الحالة</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>ملاحظات</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={2}
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
