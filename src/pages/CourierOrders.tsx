import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LogOut, Eye, Phone, MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function CourierOrders() {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [noteText, setNoteText] = useState('');
  const [notes, setNotes] = useState<any[]>([]);
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    load();
    supabase.from('order_statuses').select('*').order('sort_order').then(({ data }) => setStatuses(data || []));
  }, []);

  const load = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, order_statuses(name, color)')
      .eq('courier_id', user?.id || '')
      .eq('is_closed', false)
      .order('created_at', { ascending: false });
    setOrders(data || []);
  };

  const updateStatus = async (orderId: string, statusId: string) => {
    await supabase.from('orders').update({ status_id: statusId }).eq('id', orderId);
    toast.success('تم تحديث الحالة');
    load();
  };

  const openDetails = async (order: any) => {
    setSelectedOrder(order);
    const { data } = await supabase
      .from('order_notes')
      .select('*')
      .eq('order_id', order.id)
      .order('created_at', { ascending: false });
    setNotes(data || []);
  };

  const addNote = async () => {
    if (!noteText.trim() || !selectedOrder) return;
    setSavingNote(true);
    await supabase.from('order_notes').insert({
      order_id: selectedOrder.id,
      user_id: user?.id || '',
      note: noteText.trim(),
    });
    setNoteText('');
    const { data } = await supabase.from('order_notes').select('*').eq('order_id', selectedOrder.id).order('created_at', { ascending: false });
    setNotes(data || []);
    setSavingNote(false);
    toast.success('تم إضافة الملاحظة');
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">أوردراتي</h1>
          <Button variant="ghost" className="text-destructive" onClick={logout}>
            <LogOut className="h-4 w-4 ml-2" />تسجيل خروج
          </Button>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-right">Tracking</TableHead>
                    <TableHead className="text-right">العميل</TableHead>
                    <TableHead className="text-right">المنتج</TableHead>
                    <TableHead className="text-right">المحافظة</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">تفاصيل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">لا توجد أوردرات</TableCell></TableRow>
                  ) : orders.map((order) => (
                    <TableRow key={order.id} className="border-border">
                      <TableCell className="font-mono text-xs">{order.tracking_id}</TableCell>
                      <TableCell>{order.customer_name}</TableCell>
                      <TableCell>{order.product_name}</TableCell>
                      <TableCell>{order.governorate}</TableCell>
                      <TableCell>
                        <Select value={order.status_id || ''} onValueChange={(v) => updateStatus(order.id, v)}>
                          <SelectTrigger className="w-36 bg-secondary border-border">
                            <SelectValue placeholder="اختر الحالة" />
                          </SelectTrigger>
                          <SelectContent>
                            {statuses.map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => openDetails(order)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(v) => { if (!v) setSelectedOrder(null); }}>
        <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل الأوردر - {selectedOrder?.tracking_id}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">العميل:</span> <strong>{selectedOrder.customer_name}</strong></div>
                <div><span className="text-muted-foreground">الهاتف:</span> <strong dir="ltr">{selectedOrder.customer_phone}</strong></div>
                <div><span className="text-muted-foreground">المنتج:</span> <strong>{selectedOrder.product_name}</strong></div>
                <div><span className="text-muted-foreground">الكمية:</span> <strong>{selectedOrder.quantity}</strong></div>
                <div><span className="text-muted-foreground">السعر:</span> <strong>{selectedOrder.price} ج.م</strong></div>
                <div><span className="text-muted-foreground">التوصيل:</span> <strong>{selectedOrder.delivery_price} ج.م</strong></div>
                <div><span className="text-muted-foreground">المحافظة:</span> <strong>{selectedOrder.governorate}</strong></div>
                <div><span className="text-muted-foreground">اللون:</span> <strong>{selectedOrder.color || '-'}</strong></div>
                <div><span className="text-muted-foreground">المقاس:</span> <strong>{selectedOrder.size || '-'}</strong></div>
                <div><span className="text-muted-foreground">الباركود:</span> <strong dir="ltr">{selectedOrder.barcode || '-'}</strong></div>
              </div>

              {/* Contact actions */}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" asChild>
                  <a href={`tel:${selectedOrder.customer_phone}`}>
                    <Phone className="h-4 w-4 ml-1" />اتصال
                  </a>
                </Button>
                <Button size="sm" variant="outline" className="flex-1" asChild>
                  <a href={`sms:${selectedOrder.customer_phone}`}>
                    <MessageSquare className="h-4 w-4 ml-1" />رسالة
                  </a>
                </Button>
                <Button size="sm" variant="outline" className="flex-1 text-emerald-500" asChild>
                  <a href={`https://wa.me/${selectedOrder.customer_phone?.replace(/^0/, '20')}`} target="_blank" rel="noopener noreferrer">
                    <Send className="h-4 w-4 ml-1" />واتساب
                  </a>
                </Button>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">الملاحظات</h3>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {notes.length === 0 ? (
                    <p className="text-xs text-muted-foreground">لا توجد ملاحظات</p>
                  ) : notes.map(n => (
                    <div key={n.id} className="p-2 bg-secondary rounded text-sm">
                      <p>{n.note}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString('ar-EG')}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="أضف ملاحظة..." className="bg-secondary border-border" />
                  <Button size="sm" onClick={addNote} disabled={savingNote || !noteText.trim()}>إضافة</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
