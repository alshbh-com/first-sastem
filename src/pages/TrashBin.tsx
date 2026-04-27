import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, RotateCcw, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { logActivity } from '@/lib/activityLogger';
import { format, differenceInMonths } from 'date-fns';

export default function TrashBin() {
  const { isOwner } = useAuth();
  const [trashedOrders, setTrashedOrders] = useState<any[]>([]);
  const [trashedDiaries, setTrashedDiaries] = useState<any[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [selectedDiaries, setSelectedDiaries] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrash();
  }, []);

  const loadTrash = async () => {
    setLoading(true);
    const trashIds: string[] = JSON.parse(localStorage.getItem('trash_order_ids') || '[]');
    
    let ordersData: any[] = [];
    if (trashIds.length > 0) {
      const { data } = await supabase.from('orders').select('*, order_statuses(name, color), offices(name)').in('id', trashIds).order('updated_at', { ascending: false });
      ordersData = data || [];
    }
    setTrashedOrders(ordersData);

    const { data: diariesData } = await supabase.from('diaries').select('*, offices(name)').not('deleted_at', 'is', null).order('deleted_at', { ascending: false });
    const diaries = diariesData || [];
    // Auto-delete diaries older than 2 months
    const now = new Date();
    const toAutoDelete = diaries.filter((d: any) => differenceInMonths(now, new Date(d.deleted_at)) >= 2);
    if (toAutoDelete.length > 0) {
      await supabase.from('diaries').delete().in('id', toAutoDelete.map((d: any) => d.id));
      setTrashedDiaries(diaries.filter((d: any) => differenceInMonths(now, new Date(d.deleted_at)) < 2));
    } else {
      setTrashedDiaries(diaries);
    }
    
    setLoading(false);
  };

  // Order selection
  const toggleSelectOrder = (id: string) => {
    setSelectedOrders(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAllOrders = () => {
    if (selectedOrders.size === trashedOrders.length) setSelectedOrders(new Set());
    else setSelectedOrders(new Set(trashedOrders.map(o => o.id)));
  };

  // Diary selection
  const toggleSelectDiary = (id: string) => {
    setSelectedDiaries(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAllDiaries = () => {
    if (selectedDiaries.size === trashedDiaries.length) setSelectedDiaries(new Set());
    else setSelectedDiaries(new Set(trashedDiaries.map(d => d.id)));
  };

  const restoreOrders = async () => {
    if (selectedOrders.size === 0) return;
    const ids = Array.from(selectedOrders);
    const trashIds: string[] = JSON.parse(localStorage.getItem('trash_order_ids') || '[]');
    const updated = trashIds.filter(id => !ids.includes(id));
    localStorage.setItem('trash_order_ids', JSON.stringify(updated));
    logActivity('استعادة أوردرات من سلة المحذوفات', { count: ids.length });
    toast.success(`تم استعادة ${ids.length} أوردر`);
    setSelectedOrders(new Set());
    loadTrash();
  };

  const permanentDeleteOrders = async () => {
    if (selectedOrders.size === 0) return;
    if (!confirm(`حذف ${selectedOrders.size} أوردر نهائياً؟ لا يمكن التراجع!`)) return;
    const ids = Array.from(selectedOrders);
    const { error } = await supabase.from('orders').delete().in('id', ids);
    if (error) { toast.error(error.message); return; }
    const trashIds: string[] = JSON.parse(localStorage.getItem('trash_order_ids') || '[]');
    const updated = trashIds.filter(id => !ids.includes(id));
    localStorage.setItem('trash_order_ids', JSON.stringify(updated));
    logActivity('حذف نهائي من سلة المحذوفات', { count: ids.length });
    toast.success('تم الحذف نهائياً');
    setSelectedOrders(new Set());
    loadTrash();
  };

  const restoreDiaries = async () => {
    if (selectedDiaries.size === 0) return;
    const ids = Array.from(selectedDiaries);
    const { error } = await supabase.from('diaries').update({ deleted_at: null } as any).in('id', ids);
    if (error) { toast.error(error.message); return; }
    logActivity('استعادة يوميات من سلة المحذوفات', { count: ids.length });
    toast.success(`تم استعادة ${ids.length} يومية`);
    setSelectedDiaries(new Set());
    loadTrash();
  };

  const permanentDeleteDiaries = async () => {
    if (selectedDiaries.size === 0) return;
    if (!confirm(`حذف ${selectedDiaries.size} يومية نهائياً؟ لا يمكن التراجع!`)) return;
    const ids = Array.from(selectedDiaries);
    const { error } = await supabase.from('diaries').delete().in('id', ids);
    if (error) { toast.error(error.message); return; }
    logActivity('حذف يوميات نهائي', { count: ids.length });
    toast.success('تم الحذف نهائياً');
    setSelectedDiaries(new Set());
    loadTrash();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-bold">سلة المحذوفات</h1>
      <p className="text-sm text-muted-foreground">العناصر المحذوفة تبقى هنا. اليوميات تُحذف تلقائياً بعد شهرين.</p>

      <Tabs defaultValue="orders" dir="rtl">
        <TabsList>
          <TabsTrigger value="orders">أوردرات ({trashedOrders.length})</TabsTrigger>
          <TabsTrigger value="diaries">يوميات ({trashedDiaries.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4 space-y-3">
          {selectedOrders.size > 0 && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={restoreOrders}>
                <RotateCcw className="h-4 w-4 ml-1" />استعادة ({selectedOrders.size})
              </Button>
              {isOwner && (
                <Button size="sm" variant="destructive" onClick={permanentDeleteOrders}>
                  <Trash2 className="h-4 w-4 ml-1" />حذف نهائي ({selectedOrders.size})
                </Button>
              )}
            </div>
          )}
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="w-10"><Checkbox checked={trashedOrders.length > 0 && selectedOrders.size === trashedOrders.length} onCheckedChange={toggleAllOrders} /></TableHead>
                      <TableHead className="text-right">الباركود</TableHead>
                      <TableHead className="text-right">العميل</TableHead>
                      <TableHead className="text-right">المكتب</TableHead>
                      <TableHead className="text-right">السعر</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">جاري التحميل...</TableCell></TableRow>
                    ) : trashedOrders.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">لا توجد أوردرات محذوفة</TableCell></TableRow>
                    ) : trashedOrders.map(o => (
                      <TableRow key={o.id} className="border-border">
                        <TableCell><Checkbox checked={selectedOrders.has(o.id)} onCheckedChange={() => toggleSelectOrder(o.id)} /></TableCell>
                        <TableCell className="font-mono text-xs">{o.barcode || '-'}</TableCell>
                        <TableCell className="text-sm">{o.customer_name}</TableCell>
                        <TableCell className="text-sm">{o.offices?.name || o.office_name_snapshot || '-'}</TableCell>
                        <TableCell className="font-bold text-sm">{o.price} ج.م</TableCell>
                        <TableCell>
                          <Badge style={{ backgroundColor: o.order_statuses?.color }} className="text-xs">
                            {o.order_statuses?.name || '-'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diaries" className="mt-4 space-y-3">
          {selectedDiaries.size > 0 && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={restoreDiaries}>
                <RotateCcw className="h-4 w-4 ml-1" />استعادة ({selectedDiaries.size})
              </Button>
              {isOwner && (
                <Button size="sm" variant="destructive" onClick={permanentDeleteDiaries}>
                  <Trash2 className="h-4 w-4 ml-1" />حذف نهائي ({selectedDiaries.size})
                </Button>
              )}
            </div>
          )}
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="w-10"><Checkbox checked={trashedDiaries.length > 0 && selectedDiaries.size === trashedDiaries.length} onCheckedChange={toggleAllDiaries} /></TableHead>
                      <TableHead className="text-right">رقم اليومية</TableHead>
                      <TableHead className="text-right">المكتب</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">تاريخ الحذف</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">جاري التحميل...</TableCell></TableRow>
                    ) : trashedDiaries.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">لا توجد يوميات محذوفة</TableCell></TableRow>
                    ) : trashedDiaries.map(d => (
                      <TableRow key={d.id} className="border-border">
                        <TableCell><Checkbox checked={selectedDiaries.has(d.id)} onCheckedChange={() => toggleSelectDiary(d.id)} /></TableCell>
                        <TableCell className="font-bold">
                          <div className="flex items-center gap-1">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            يومية #{d.diary_number}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{d.offices?.name || '-'}</TableCell>
                        <TableCell className="text-sm">{format(new Date(d.diary_date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{d.deleted_at ? format(new Date(d.deleted_at), 'dd/MM/yyyy') : '-'}</TableCell>
                        <TableCell>
                          <Badge variant={d.is_closed ? 'secondary' : 'default'} className="text-xs">
                            {d.is_closed ? 'مقفولة' : 'مفتوحة'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
