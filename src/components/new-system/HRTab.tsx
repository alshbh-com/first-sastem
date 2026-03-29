import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CalendarDays, Star, AlertTriangle, Award, Plus, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';

export default function HRTab() {
  const [couriers, setCouriers] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [violations, setViolations] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [leaveForm, setLeaveForm] = useState({ courier_id: '', leave_date: '', reason: '' });
  const [ratingForm, setRatingForm] = useState({ courier_id: '', rating: '3', notes: '' });
  const [violationForm, setViolationForm] = useState({ courier_id: '', violation_type: 'warning', reason: '' });
  const [rewardThreshold, setRewardThreshold] = useState('30');
  const [rewardAmount, setRewardAmount] = useState('50');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: roles }, { data: profiles }] = await Promise.all([
      supabase.from('user_roles').select('user_id, role'),
      supabase.from('profiles').select('id, full_name'),
    ]);
    const courierIds = roles?.filter(r => r.role === 'courier').map(r => r.user_id) || [];
    const courierList = profiles?.filter(p => courierIds.includes(p.id)) || [];
    setCouriers(courierList);

    const [{ data: lv }, { data: rt }, { data: vl }, { data: rw }] = await Promise.all([
      supabase.from('courier_leaves').select('*').order('created_at', { ascending: false }),
      supabase.from('courier_ratings').select('*').order('created_at', { ascending: false }),
      supabase.from('courier_violations').select('*').order('created_at', { ascending: false }),
      supabase.from('courier_rewards').select('*').order('created_at', { ascending: false }),
    ]);
    setLeaves(lv || []);
    setRatings(rt || []);
    setViolations(vl || []);
    setRewards(rw || []);
    setLoading(false);
  };

  const getCourierName = (id: string) => couriers.find(c => c.id === id)?.full_name || 'غير معروف';

  const addLeave = async () => {
    if (!leaveForm.courier_id || !leaveForm.leave_date) return toast.error('اختر المندوب والتاريخ');
    await supabase.from('courier_leaves').insert({ courier_id: leaveForm.courier_id, leave_date: leaveForm.leave_date, reason: leaveForm.reason });
    toast.success('تم إضافة الإجازة');
    setLeaveForm({ courier_id: '', leave_date: '', reason: '' });
    loadAll();
  };

  const updateLeaveStatus = async (id: string, status: string) => {
    await supabase.from('courier_leaves').update({ status, approved_by: (await supabase.auth.getUser()).data.user?.id }).eq('id', id);
    toast.success(status === 'approved' ? 'تمت الموافقة' : 'تم الرفض');
    loadAll();
  };

  const addRating = async () => {
    if (!ratingForm.courier_id) return toast.error('اختر المندوب');
    const now = new Date();
    await supabase.from('courier_ratings').insert({
      courier_id: ratingForm.courier_id,
      rating: parseInt(ratingForm.rating),
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      notes: ratingForm.notes,
      rated_by: (await supabase.auth.getUser()).data.user?.id,
    });
    toast.success('تم التقييم');
    setRatingForm({ courier_id: '', rating: '3', notes: '' });
    loadAll();
  };

  const addViolation = async () => {
    if (!violationForm.courier_id || !violationForm.reason) return toast.error('اختر المندوب واكتب السبب');
    await supabase.from('courier_violations').insert({
      courier_id: violationForm.courier_id,
      violation_type: violationForm.violation_type,
      reason: violationForm.reason,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    });
    toast.success('تم تسجيل المخالفة');
    setViolationForm({ courier_id: '', violation_type: 'warning', reason: '' });
    loadAll();
  };

  const checkRewards = async () => {
    const threshold = parseInt(rewardThreshold);
    const amount = parseFloat(rewardAmount);
    if (!threshold || !amount) return toast.error('أدخل الحد الأدنى والمبلغ');
    
    const today = format(new Date(), 'yyyy-MM-dd');
    const { data: orders } = await supabase.from('orders').select('courier_id, status_id');
    const { data: statuses } = await supabase.from('order_statuses').select('id, name');
    const deliveredId = statuses?.find(s => s.name === 'تم التسليم')?.id;
    if (!deliveredId) return toast.error('حالة "تم التسليم" غير موجودة');

    const todayOrders = orders?.filter(o => o.status_id === deliveredId) || [];
    const courierDeliveries: Record<string, number> = {};
    todayOrders.forEach(o => {
      if (o.courier_id) courierDeliveries[o.courier_id] = (courierDeliveries[o.courier_id] || 0) + 1;
    });

    let added = 0;
    for (const [cId, count] of Object.entries(courierDeliveries)) {
      if (count >= threshold) {
        const { data: existing } = await supabase.from('courier_rewards').select('id').eq('courier_id', cId).eq('reward_date', today);
        if (!existing?.length) {
          await supabase.from('courier_rewards').insert({ courier_id: cId, reward_date: today, deliveries_count: count, reward_amount: amount });
          added++;
        }
      }
    }
    toast.success(`تم إضافة ${added} مكافأة`);
    loadAll();
  };

  const deleteRecord = async (table: string, id: string) => {
    await supabase.from(table as any).delete().eq('id', id);
    toast.success('تم الحذف');
    loadAll();
  };

  if (loading) return <div className="text-center py-10 text-muted-foreground">جاري التحميل...</div>;

  return (
    <div className="mt-4">
      <Tabs defaultValue="leaves" dir="rtl">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="leaves" className="text-xs"><CalendarDays className="h-3 w-3 ml-1" />الإجازات</TabsTrigger>
          <TabsTrigger value="ratings" className="text-xs"><Star className="h-3 w-3 ml-1" />التقييم</TabsTrigger>
          <TabsTrigger value="violations" className="text-xs"><AlertTriangle className="h-3 w-3 ml-1" />المخالفات</TabsTrigger>
          <TabsTrigger value="rewards" className="text-xs"><Award className="h-3 w-3 ml-1" />المكافآت</TabsTrigger>
        </TabsList>

        {/* Leaves */}
        <TabsContent value="leaves" className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">إضافة إجازة</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Select value={leaveForm.courier_id} onValueChange={v => setLeaveForm(p => ({ ...p, courier_id: v }))}>
                <SelectTrigger className="w-40"><SelectValue placeholder="المندوب" /></SelectTrigger>
                <SelectContent>{couriers.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="date" className="w-40" value={leaveForm.leave_date} onChange={e => setLeaveForm(p => ({ ...p, leave_date: e.target.value }))} />
              <Input placeholder="السبب" className="w-40" value={leaveForm.reason} onChange={e => setLeaveForm(p => ({ ...p, reason: e.target.value }))} />
              <Button size="sm" onClick={addLeave}><Plus className="h-3 w-3 ml-1" />إضافة</Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>المندوب</TableHead><TableHead>التاريخ</TableHead><TableHead>السبب</TableHead><TableHead>الحالة</TableHead><TableHead>إجراء</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {leaves.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs">{getCourierName(l.courier_id)}</TableCell>
                      <TableCell className="text-xs">{l.leave_date}</TableCell>
                      <TableCell className="text-xs">{l.reason}</TableCell>
                      <TableCell>
                        <Badge variant={l.status === 'approved' ? 'default' : l.status === 'rejected' ? 'destructive' : 'secondary'} className="text-xs">
                          {l.status === 'approved' ? 'مقبول' : l.status === 'rejected' ? 'مرفوض' : 'معلق'}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex gap-1">
                        {l.status === 'pending' && <>
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateLeaveStatus(l.id, 'approved')}>قبول</Button>
                          <Button size="sm" variant="destructive" className="text-xs h-7" onClick={() => updateLeaveStatus(l.id, 'rejected')}>رفض</Button>
                        </>}
                        <Button size="sm" variant="ghost" className="h-7" onClick={() => deleteRecord('courier_leaves', l.id)}><Trash2 className="h-3 w-3" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {leaves.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-xs">لا توجد إجازات</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ratings */}
        <TabsContent value="ratings" className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">تقييم مندوب</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Select value={ratingForm.courier_id} onValueChange={v => setRatingForm(p => ({ ...p, courier_id: v }))}>
                <SelectTrigger className="w-40"><SelectValue placeholder="المندوب" /></SelectTrigger>
                <SelectContent>{couriers.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={ratingForm.rating} onValueChange={v => setRatingForm(p => ({ ...p, rating: v }))}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5].map(r => <SelectItem key={r} value={String(r)}>{'⭐'.repeat(r)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="ملاحظات" className="w-40" value={ratingForm.notes} onChange={e => setRatingForm(p => ({ ...p, notes: e.target.value }))} />
              <Button size="sm" onClick={addRating}><Plus className="h-3 w-3 ml-1" />تقييم</Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>المندوب</TableHead><TableHead>التقييم</TableHead><TableHead>الشهر</TableHead><TableHead>ملاحظات</TableHead><TableHead>حذف</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {ratings.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{getCourierName(r.courier_id)}</TableCell>
                      <TableCell className="text-xs">{'⭐'.repeat(r.rating)}</TableCell>
                      <TableCell className="text-xs">{r.month}/{r.year}</TableCell>
                      <TableCell className="text-xs">{r.notes}</TableCell>
                      <TableCell><Button size="sm" variant="ghost" onClick={() => deleteRecord('courier_ratings', r.id)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                    </TableRow>
                  ))}
                  {ratings.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-xs">لا توجد تقييمات</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Violations */}
        <TabsContent value="violations" className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">تسجيل مخالفة</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Select value={violationForm.courier_id} onValueChange={v => setViolationForm(p => ({ ...p, courier_id: v }))}>
                <SelectTrigger className="w-40"><SelectValue placeholder="المندوب" /></SelectTrigger>
                <SelectContent>{couriers.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={violationForm.violation_type} onValueChange={v => setViolationForm(p => ({ ...p, violation_type: v }))}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="warning">إنذار</SelectItem>
                  <SelectItem value="violation">مخالفة</SelectItem>
                  <SelectItem value="suspension">إيقاف</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="السبب" className="flex-1 min-w-[150px]" value={violationForm.reason} onChange={e => setViolationForm(p => ({ ...p, reason: e.target.value }))} />
              <Button size="sm" onClick={addViolation}><Plus className="h-3 w-3 ml-1" />تسجيل</Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>المندوب</TableHead><TableHead>النوع</TableHead><TableHead>السبب</TableHead><TableHead>التاريخ</TableHead><TableHead>حذف</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {violations.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="text-xs">{getCourierName(v.courier_id)}</TableCell>
                      <TableCell>
                        <Badge variant={v.violation_type === 'suspension' ? 'destructive' : v.violation_type === 'violation' ? 'secondary' : 'outline'} className="text-xs">
                          {v.violation_type === 'warning' ? 'إنذار' : v.violation_type === 'violation' ? 'مخالفة' : 'إيقاف'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{v.reason}</TableCell>
                      <TableCell className="text-xs">{format(new Date(v.created_at), 'yyyy-MM-dd')}</TableCell>
                      <TableCell><Button size="sm" variant="ghost" onClick={() => deleteRecord('courier_violations', v.id)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                    </TableRow>
                  ))}
                  {violations.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-xs">لا توجد مخالفات</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rewards */}
        <TabsContent value="rewards" className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">إعدادات المكافآت التلقائية</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2 items-end">
              <div>
                <label className="text-xs text-muted-foreground">الحد الأدنى للتسليمات/يوم</label>
                <Input type="number" className="w-24" value={rewardThreshold} onChange={e => setRewardThreshold(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">مبلغ المكافأة</label>
                <Input type="number" className="w-24" value={rewardAmount} onChange={e => setRewardAmount(e.target.value)} />
              </div>
              <Button size="sm" onClick={checkRewards}><Award className="h-3 w-3 ml-1" />فحص وتوزيع</Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>المندوب</TableHead><TableHead>التاريخ</TableHead><TableHead>التسليمات</TableHead><TableHead>المبلغ</TableHead><TableHead>مدفوع</TableHead><TableHead>حذف</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {rewards.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{getCourierName(r.courier_id)}</TableCell>
                      <TableCell className="text-xs">{r.reward_date}</TableCell>
                      <TableCell className="text-xs">{r.deliveries_count}</TableCell>
                      <TableCell className="text-xs font-bold">{r.reward_amount}</TableCell>
                      <TableCell>
                        <Badge variant={r.is_paid ? 'default' : 'secondary'} className="text-xs cursor-pointer"
                          onClick={() => supabase.from('courier_rewards').update({ is_paid: !r.is_paid }).eq('id', r.id).then(() => loadAll())}>
                          {r.is_paid ? 'مدفوع' : 'غير مدفوع'}
                        </Badge>
                      </TableCell>
                      <TableCell><Button size="sm" variant="ghost" onClick={() => deleteRecord('courier_rewards', r.id)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                    </TableRow>
                  ))}
                  {rewards.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-xs">لا توجد مكافآت</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
