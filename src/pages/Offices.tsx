import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Offices() {
  const [offices, setOffices] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.from('offices').select('*').order('created_at', { ascending: false });
    setOffices(data || []);
  };

  const save = async () => {
    if (!name.trim()) return;
    if (editId) {
      await supabase.from('offices').update({ name, specialty }).eq('id', editId);
      toast.success('تم التعديل');
    } else {
      await supabase.from('offices').insert({ name, specialty });
      toast.success('تم الإضافة');
    }
    setOpen(false); setName(''); setSpecialty(''); setEditId(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    await supabase.from('offices').delete().eq('id', id);
    toast.success('تم الحذف');
    load();
  };

  const edit = (o: any) => {
    setEditId(o.id); setName(o.name); setSpecialty(o.specialty || ''); setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">المكاتب</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setName(''); setSpecialty(''); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 ml-2" />إضافة مكتب</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>{editId ? 'تعديل مكتب' : 'إضافة مكتب'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>اسم المكتب</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="bg-secondary border-border" /></div>
              <div><Label>التخصص</Label><Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="bg-secondary border-border" /></div>
              <Button onClick={save} className="w-full">{editId ? 'حفظ التعديل' : 'إضافة'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">التخصص</TableHead>
                <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                <TableHead className="text-right">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offices.map((o) => (
                <TableRow key={o.id} className="border-border">
                  <TableCell className="font-medium">{o.name}</TableCell>
                  <TableCell>{o.specialty || '-'}</TableCell>
                  <TableCell>{new Date(o.created_at).toLocaleDateString('ar-EG')}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => edit(o)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(o.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
