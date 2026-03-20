import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { usePagePermission } from '@/hooks/usePagePermission';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function DeliveryPrices() {
  const { canEdit } = usePagePermission();
  const [offices, setOffices] = useState<any[]>([]);
  const [prices, setPrices] = useState<any[]>([]);
  const [filterOffice, setFilterOffice] = useState('all');
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [officeId, setOfficeId] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [price, setPrice] = useState('');
  const [pickupPrice, setPickupPrice] = useState('');

  // General price lists
  const [priceLists, setPriceLists] = useState<any[]>([]);
  const [priceListItems, setPriceListItems] = useState<any[]>([]);
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [editListId, setEditListId] = useState<string | null>(null);
  const [listName, setListName] = useState('');
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [selectedListId, setSelectedListId] = useState('');
  const [itemGovernorate, setItemGovernorate] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemPickupPrice, setItemPickupPrice] = useState('');

  useEffect(() => {
    supabase.from('offices').select('id, name').order('name').then(({ data }) => setOffices(data || []));
    load();
    loadPriceLists();
  }, []);

  const load = async () => {
    const { data } = await supabase.from('delivery_prices').select('*, offices(name)').order('created_at', { ascending: false });
    setPrices(data || []);
  };

  const loadPriceLists = async () => {
    const { data: lists } = await supabase.from('price_lists').select('*').order('created_at', { ascending: false });
    setPriceLists(lists || []);
    const { data: items } = await supabase.from('price_list_items').select('*').order('created_at');
    setPriceListItems(items || []);
  };

  // Office prices CRUD
  const save = async () => {
    if (!officeId || !governorate.trim()) { toast.error('المكتب والمحافظة مطلوبين'); return; }
    const p = parseFloat(price) || 0;
    const pp = parseFloat(pickupPrice) || 0;
    if (editId) {
      await supabase.from('delivery_prices').update({ office_id: officeId, governorate, price: p, pickup_price: pp }).eq('id', editId);
      toast.success('تم التعديل');
    } else {
      await supabase.from('delivery_prices').insert({ office_id: officeId, governorate, price: p, pickup_price: pp });
      toast.success('تم الإضافة');
    }
    setOpen(false); resetForm(); load();
  };

  const remove = async (id: string) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    await supabase.from('delivery_prices').delete().eq('id', id);
    toast.success('تم الحذف'); load();
  };

  const edit = (item: any) => {
    setEditId(item.id); setOfficeId(item.office_id); setGovernorate(item.governorate); setPrice(String(item.price)); setPickupPrice(String(item.pickup_price || 0)); setOpen(true);
  };

  const resetForm = () => { setEditId(null); setOfficeId(''); setGovernorate(''); setPrice(''); setPickupPrice(''); };

  // Price lists CRUD
  const saveList = async () => {
    if (!listName.trim()) { toast.error('اسم القائمة مطلوب'); return; }
    if (editListId) {
      await supabase.from('price_lists').update({ name: listName }).eq('id', editListId);
      toast.success('تم التعديل');
    } else {
      await supabase.from('price_lists').insert({ name: listName });
      toast.success('تم الإضافة');
    }
    setListDialogOpen(false); setEditListId(null); setListName(''); loadPriceLists();
  };

  const deleteList = async (id: string) => {
    if (!confirm('حذف القائمة وجميع أسعارها؟')) return;
    await supabase.from('price_lists').delete().eq('id', id);
    toast.success('تم الحذف'); loadPriceLists();
  };

  const editList = (list: any) => {
    setEditListId(list.id); setListName(list.name); setListDialogOpen(true);
  };

  // Price list items CRUD
  const saveItem = async () => {
    if (!selectedListId || !itemGovernorate.trim()) { toast.error('القائمة والمحافظة مطلوبين'); return; }
    const p = parseFloat(itemPrice) || 0;
    const pp = parseFloat(itemPickupPrice) || 0;
    if (editItemId) {
      await supabase.from('price_list_items').update({ price_list_id: selectedListId, governorate: itemGovernorate, price: p, pickup_price: pp }).eq('id', editItemId);
      toast.success('تم التعديل');
    } else {
      await supabase.from('price_list_items').insert({ price_list_id: selectedListId, governorate: itemGovernorate, price: p, pickup_price: pp });
      toast.success('تم الإضافة');
    }
    setItemDialogOpen(false); resetItemForm(); loadPriceLists();
  };

  const deleteItem = async (id: string) => {
    if (!confirm('حذف هذا السعر؟')) return;
    await supabase.from('price_list_items').delete().eq('id', id);
    toast.success('تم الحذف'); loadPriceLists();
  };

  const editItem = (item: any) => {
    setEditItemId(item.id); setSelectedListId(item.price_list_id); setItemGovernorate(item.governorate); setItemPrice(String(item.price)); setItemPickupPrice(String(item.pickup_price || 0)); setItemDialogOpen(true);
  };

  const resetItemForm = () => { setEditItemId(null); setSelectedListId(''); setItemGovernorate(''); setItemPrice(''); setItemPickupPrice(''); };

  const filtered = filterOffice === 'all' ? prices : prices.filter(p => p.office_id === filterOffice);

  // PDF export for a price list
  const exportListPDF = (list: any) => {
    const items = priceListItems.filter(i => i.price_list_id === list.id);
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.setFont('Helvetica');
    doc.setFontSize(18);
    doc.text(list.name, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });

    autoTable(doc, {
      startY: 30,
      head: [['#', 'المحافظة / المنطقة', 'سعر التوصيل', 'البيك اب']],
      body: items.map((item, i) => [
        i + 1,
        item.governorate,
        `${item.price}`,
        `${item.pickup_price || 0}`,
      ]),
      styles: { font: 'Helvetica', halign: 'center', fontSize: 11 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    });

    doc.save(`${list.name}.pdf`);
    toast.success('تم تصدير PDF');
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">أسعار التوصيل</h1>

      <Tabs defaultValue="office" dir="rtl">
        <TabsList>
          <TabsTrigger value="office">أسعار المكاتب</TabsTrigger>
          <TabsTrigger value="general">قوائم أسعار عامة</TabsTrigger>
        </TabsList>

        {/* ===== Office Prices Tab ===== */}
        <TabsContent value="office" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <Select value={filterOffice} onValueChange={setFilterOffice}>
              <SelectTrigger className="w-48 bg-secondary border-border"><SelectValue placeholder="فلتر بالمكتب" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المكاتب</SelectItem>
                {offices.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {canEdit && (
              <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 ml-2" />إضافة سعر</Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader><DialogTitle>{editId ? 'تعديل سعر' : 'إضافة سعر توصيل'}</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>المكتب *</Label>
                      <Select value={officeId} onValueChange={setOfficeId}>
                        <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="اختر مكتب" /></SelectTrigger>
                        <SelectContent>{offices.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>المحافظة / المنطقة *</Label>
                      <Input value={governorate} onChange={e => setGovernorate(e.target.value)} className="bg-secondary border-border" placeholder="مثال: القاهرة" />
                    </div>
                    <div className="space-y-2">
                      <Label>سعر التوصيل (ج.م)</Label>
                      <Input type="number" value={price} onChange={e => setPrice(e.target.value)} className="bg-secondary border-border" placeholder="0" />
                    </div>
                    <div className="space-y-2">
                      <Label>البيك اب (ج.م)</Label>
                      <Input type="number" value={pickupPrice} onChange={e => setPickupPrice(e.target.value)} className="bg-secondary border-border" placeholder="0" />
                    </div>
                    <Button onClick={save} className="w-full">{editId ? 'حفظ التعديل' : 'إضافة'}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-right">المكتب</TableHead>
                    <TableHead className="text-right">المحافظة / المنطقة</TableHead>
                    <TableHead className="text-right">سعر التوصيل</TableHead>
                    <TableHead className="text-right">البيك اب</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">لا توجد أسعار</TableCell></TableRow>
                  ) : filtered.map(item => (
                    <TableRow key={item.id} className="border-border">
                      <TableCell className="font-medium">{item.offices?.name || '-'}</TableCell>
                      <TableCell>{item.governorate}</TableCell>
                      <TableCell className="font-bold">{item.price} ج.م</TableCell>
                      <TableCell className="font-bold">{item.pickup_price || 0} ج.م</TableCell>
                      <TableCell>
                        {canEdit && (
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => edit(item)}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(item.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== General Price Lists Tab ===== */}
        <TabsContent value="general" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">قوائم الأسعار العامة</h2>
            {canEdit && (
              <div className="flex gap-2">
                <Dialog open={listDialogOpen} onOpenChange={(v) => { setListDialogOpen(v); if (!v) { setEditListId(null); setListName(''); } }}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4 ml-1" />قائمة جديدة</Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border">
                    <DialogHeader><DialogTitle>{editListId ? 'تعديل القائمة' : 'إنشاء قائمة أسعار'}</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>اسم القائمة *</Label>
                        <Input value={listName} onChange={e => setListName(e.target.value)} className="bg-secondary border-border" placeholder="مثال: أسعار الصعيد" />
                      </div>
                      <Button onClick={saveList} className="w-full">{editListId ? 'حفظ' : 'إنشاء'}</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>

          {/* Item add dialog */}
          <Dialog open={itemDialogOpen} onOpenChange={(v) => { setItemDialogOpen(v); if (!v) resetItemForm(); }}>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>{editItemId ? 'تعديل سعر' : 'إضافة سعر للقائمة'}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>القائمة *</Label>
                  <Select value={selectedListId} onValueChange={setSelectedListId}>
                    <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="اختر قائمة" /></SelectTrigger>
                    <SelectContent>{priceLists.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>المحافظة / المنطقة *</Label>
                  <Input value={itemGovernorate} onChange={e => setItemGovernorate(e.target.value)} className="bg-secondary border-border" placeholder="مثال: القاهرة" />
                </div>
                <div className="space-y-2">
                  <Label>سعر التوصيل (ج.م)</Label>
                  <Input type="number" value={itemPrice} onChange={e => setItemPrice(e.target.value)} className="bg-secondary border-border" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>البيك اب (ج.م)</Label>
                  <Input type="number" value={itemPickupPrice} onChange={e => setItemPickupPrice(e.target.value)} className="bg-secondary border-border" placeholder="0" />
                </div>
                <Button onClick={saveItem} className="w-full">{editItemId ? 'حفظ التعديل' : 'إضافة'}</Button>
              </div>
            </DialogContent>
          </Dialog>

          {priceLists.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا توجد قوائم أسعار. أنشئ واحدة جديدة.</p>
          ) : priceLists.map(list => {
            const items = priceListItems.filter(i => i.price_list_id === list.id);
            return (
              <Card key={list.id} className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{list.name} ({items.length} سعر)</span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => exportListPDF(list)}>
                        <Printer className="h-4 w-4 ml-1" />PDF
                      </Button>
                      {canEdit && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => { setSelectedListId(list.id); setItemDialogOpen(true); }}>
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => editList(list)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteList(list.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-right">المحافظة / المنطقة</TableHead>
                        <TableHead className="text-right">سعر التوصيل</TableHead>
                        <TableHead className="text-right">البيك اب</TableHead>
                        {canEdit && <TableHead className="text-right">إجراءات</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.length === 0 ? (
                        <TableRow><TableCell colSpan={canEdit ? 4 : 3} className="text-center text-muted-foreground py-4">لا توجد أسعار في هذه القائمة</TableCell></TableRow>
                      ) : items.map(item => (
                        <TableRow key={item.id} className="border-border">
                          <TableCell>{item.governorate}</TableCell>
                          <TableCell className="font-bold">{item.price} ج.م</TableCell>
                          <TableCell className="font-bold">{item.pickup_price || 0} ج.م</TableCell>
                          {canEdit && (
                            <TableCell>
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" onClick={() => editItem(item)}><Pencil className="h-4 w-4" /></Button>
                                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
