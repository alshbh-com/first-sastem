import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function Advances() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [advances, setAdvances] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [type, setType] = useState('advance');

  useEffect(() => {
    const load = async () => {
      const { data: roles } = await supabase.from('user_roles').select('user_id, role');
      if (roles && roles.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', roles.map(r => r.user_id));
        setEmployees(profiles || []);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (selectedEmployee) loadAdvances();
  }, [selectedEmployee]);

  const loadAdvances = async () => {
    const { data } = await supabase
      .from('advances')
      .select('*')
      .eq('user_id', selectedEmployee)
      .order('created_at', { ascending: false });
    setAdvances(data || []);
  };

  const addAdvance = async () => {
    if (!amount || !selectedEmployee) return;
    const { error } = await supabase.from('advances').insert({
      user_id: selectedEmployee,
      amount: parseFloat(amount),
      reason,
      type,
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('تم الإضافة');
    setDialogOpen(false);
    setAmount(''); setReason('');
    loadAdvances();
  };

  const deleteAdvance = async (id: string) => {
    if (!confirm('حذف؟')) return;
    await supabase.from('advances').delete().eq('id', id);
    loadAdvances();
  };

  const totalAdvances = advances.filter(a => a.type === 'advance').reduce((s, a) => s + Number(a.amount), 0);
  const totalDeductions = advances.filter(a => a.type === 'deduction').reduce((s, a) => s + Number(a.amount), 0);
  const totalBonuses = advances.filter(a => a.type === 'bonus').reduce((s, a) => s + Number(a.amount), 0);

  const typeLabel = (t: string) => {
    if (t === 'advance') return 'سلفة';
    if (t === 'deduction') return 'خصم';
    return 'مكافأة';
  };
  const typeColor = (t: string) => {
    if (t === 'advance') return 'bg-amber-500';
    if (t === 'deduction') return 'bg-destructive';
    return 'bg-emerald-500';
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">السلفات والخصومات</h1>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">الموظف</Label>
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger className="w-48 bg-secondary border-border"><SelectValue placeholder="اختر موظف" /></SelectTrigger>
            <SelectContent>
              {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {selectedEmployee && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 ml-1" />إضافة</Button></DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>إضافة سلفة / خصم / مكافأة</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>النوع</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="advance">سلفة</SelectItem>
                      <SelectItem value="deduction">خصم</SelectItem>
                      <SelectItem value="bonus">مكافأة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>المبلغ</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="bg-secondary border-border" /></div>
                <div><Label>السبب</Label><Input value={reason} onChange={e => setReason(e.target.value)} className="bg-secondary border-border" /></div>
                <Button onClick={addAdvance} className="w-full">حفظ</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {selectedEmployee && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-card border-border"><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">إجمالي السلف</p><p className="text-xl font-bold text-amber-500">{totalAdvances} ج.م</p></CardContent></Card>
            <Card className="bg-card border-border"><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">إجمالي الخصومات</p><p className="text-xl font-bold text-destructive">{totalDeductions} ج.م</p></CardContent></Card>
            <Card className="bg-card border-border"><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">إجمالي المكافآت</p><p className="text-xl font-bold text-emerald-500">{totalBonuses} ج.م</p></CardContent></Card>
          </div>

          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">السبب</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">حذف</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advances.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">لا توجد بيانات</TableCell></TableRow>
                  ) : advances.map(a => (
                    <TableRow key={a.id} className="border-border">
                      <TableCell><Badge className={typeColor(a.type)}>{typeLabel(a.type)}</Badge></TableCell>
                      <TableCell className="font-bold">{a.amount} ج.م</TableCell>
                      <TableCell>{a.reason || '-'}</TableCell>
                      <TableCell>{new Date(a.created_at).toLocaleDateString('ar-EG')}</TableCell>
                      <TableCell><Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteAdvance(a.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
