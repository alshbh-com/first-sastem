import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ticket, Car, Fuel, Package, Camera, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function ToolsTab() {
  const [couriers, setCouriers] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [fuelEntries, setFuelEntries] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanResult, setScanResult] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);

  const [ticketForm, setTicketForm] = useState({ title: '', description: '', priority: 'normal', assigned_to: '' });
  const [vehicleForm, setVehicleForm] = useState({ courier_id: '', vehicle_type: 'motorcycle', plate_number: '', brand: '', model: '' });
  const [fuelForm, setFuelForm] = useState({ courier_id: '', amount: '', liters: '', entry_date: format(new Date(), 'yyyy-MM-dd') });
  const [inventoryForm, setInventoryForm] = useState({ item_name: '', quantity: '', min_quantity: '', category: '' });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: roles }, { data: profs }] = await Promise.all([
      supabase.from('user_roles').select('user_id, role'),
      supabase.from('profiles').select('id, full_name'),
    ]);
    const courierIds = roles?.filter(r => r.role === 'courier').map(r => r.user_id) || [];
    setCouriers(profs?.filter(p => courierIds.includes(p.id)) || []);
    setProfiles(profs || []);

    const [{ data: tk }, { data: vh }, { data: fl }, { data: inv }] = await Promise.all([
      supabase.from('internal_tickets').select('*').order('created_at', { ascending: false }),
      supabase.from('vehicles').select('*').order('created_at', { ascending: false }),
      supabase.from('fuel_entries').select('*').order('entry_date', { ascending: false }),
      supabase.from('inventory_items').select('*').order('item_name'),
    ]);
    setTickets(tk || []);
    setVehicles(vh || []);
    setFuelEntries(fl || []);
    setInventory(inv || []);
    setLoading(false);
  };

  const getName = (id: string) => profiles.find(p => p.id === id)?.full_name || '';
  const getCourierName = (id: string) => couriers.find(c => c.id === id)?.full_name || '';

  const addTicket = async () => {
    if (!ticketForm.title) return toast.error('أدخل عنوان التذكرة');
    const user = (await supabase.auth.getUser()).data.user;
    await supabase.from('internal_tickets').insert({
      title: ticketForm.title, description: ticketForm.description,
      priority: ticketForm.priority, assigned_to: ticketForm.assigned_to || null,
      created_by: user?.id,
    });
    toast.success('تم إنشاء التذكرة');
    setTicketForm({ title: '', description: '', priority: 'normal', assigned_to: '' });
    loadAll();
  };

  const updateTicketStatus = async (id: string, status: string) => {
    await supabase.from('internal_tickets').update({ status, closed_at: status === 'closed' ? new Date().toISOString() : null }).eq('id', id);
    toast.success('تم التحديث');
    loadAll();
  };

  const addVehicle = async () => {
    if (!vehicleForm.courier_id) return toast.error('اختر المندوب');
    await supabase.from('vehicles').insert(vehicleForm);
    toast.success('تمت الإضافة');
    setVehicleForm({ courier_id: '', vehicle_type: 'motorcycle', plate_number: '', brand: '', model: '' });
    loadAll();
  };

  const addFuel = async () => {
    if (!fuelForm.courier_id || !fuelForm.amount) return toast.error('اختر المندوب وأدخل المبلغ');
    const user = (await supabase.auth.getUser()).data.user;
    await supabase.from('fuel_entries').insert({
      courier_id: fuelForm.courier_id, amount: parseFloat(fuelForm.amount),
      liters: fuelForm.liters ? parseFloat(fuelForm.liters) : 0,
      entry_date: fuelForm.entry_date, created_by: user?.id,
    });
    toast.success('تمت الإضافة');
    setFuelForm({ courier_id: '', amount: '', liters: '', entry_date: format(new Date(), 'yyyy-MM-dd') });
    loadAll();
  };

  const addInventoryItem = async () => {
    if (!inventoryForm.item_name) return toast.error('أدخل اسم الصنف');
    await supabase.from('inventory_items').insert({
      item_name: inventoryForm.item_name,
      quantity: parseInt(inventoryForm.quantity) || 0,
      min_quantity: parseInt(inventoryForm.min_quantity) || 0,
      category: inventoryForm.category,
    });
    toast.success('تمت الإضافة');
    setInventoryForm({ item_name: '', quantity: '', min_quantity: '', category: '' });
    loadAll();
  };

  const updateInventoryQty = async (id: string, qty: number) => {
    await supabase.from('inventory_items').update({ quantity: qty, updated_at: new Date().toISOString() }).eq('id', id);
    loadAll();
  };

  const deleteRecord = async (table: string, id: string) => {
    await supabase.from(table as any).delete().eq('id', id);
    toast.success('تم الحذف');
    loadAll();
  };

  const startScan = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setScanning(true);
      }
    } catch {
      toast.error('لا يمكن الوصول للكاميرا');
    }
  };

  const stopScan = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

  const searchBarcode = async () => {
    if (!scanResult) return;
    const { data } = await supabase.from('orders').select('*').or(`barcode.eq.${scanResult},tracking_id.eq.${scanResult}`).limit(1);
    if (data?.length) {
      toast.success(`تم العثور على أوردر: ${data[0].tracking_id} - ${data[0].customer_name}`);
    } else {
      toast.error('لم يتم العثور على أوردر بهذا الباركود');
    }
  };

  if (loading) return <div className="text-center py-10 text-muted-foreground">جاري التحميل...</div>;

  const priorityLabel = (p: string) => p === 'urgent' ? 'عاجل' : p === 'high' ? 'عالي' : p === 'low' ? 'منخفض' : 'عادي';
  const statusLabel = (s: string) => s === 'closed' ? 'مغلق' : s === 'in_progress' ? 'قيد المعالجة' : 'مفتوح';

  return (
    <div className="mt-4">
      <Tabs defaultValue="tickets" dir="rtl">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="tickets" className="text-xs"><Ticket className="h-3 w-3 ml-1" />التذاكر</TabsTrigger>
          <TabsTrigger value="vehicles" className="text-xs"><Car className="h-3 w-3 ml-1" />المركبات</TabsTrigger>
          <TabsTrigger value="fuel" className="text-xs"><Fuel className="h-3 w-3 ml-1" />البنزين</TabsTrigger>
          <TabsTrigger value="inventory" className="text-xs"><Package className="h-3 w-3 ml-1" />الجرد</TabsTrigger>
          <TabsTrigger value="scanner" className="text-xs"><Camera className="h-3 w-3 ml-1" />الباركود</TabsTrigger>
        </TabsList>

        {/* Tickets */}
        <TabsContent value="tickets" className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">تذكرة جديدة</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Input placeholder="العنوان" className="flex-1 min-w-[150px]" value={ticketForm.title} onChange={e => setTicketForm(p => ({ ...p, title: e.target.value }))} />
                <Select value={ticketForm.priority} onValueChange={v => setTicketForm(p => ({ ...p, priority: v }))}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">منخفض</SelectItem>
                    <SelectItem value="normal">عادي</SelectItem>
                    <SelectItem value="high">عالي</SelectItem>
                    <SelectItem value="urgent">عاجل</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={ticketForm.assigned_to} onValueChange={v => setTicketForm(p => ({ ...p, assigned_to: v }))}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="تعيين لـ" /></SelectTrigger>
                  <SelectContent>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Textarea placeholder="الوصف" value={ticketForm.description} onChange={e => setTicketForm(p => ({ ...p, description: e.target.value }))} />
              <Button size="sm" onClick={addTicket}><Plus className="h-3 w-3 ml-1" />إنشاء</Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>العنوان</TableHead><TableHead>الأولوية</TableHead><TableHead>الحالة</TableHead><TableHead>معين لـ</TableHead><TableHead>إجراء</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {tickets.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs">{t.title}</TableCell>
                      <TableCell><Badge variant={t.priority === 'urgent' ? 'destructive' : 'secondary'} className="text-xs">{priorityLabel(t.priority)}</Badge></TableCell>
                      <TableCell>
                        <Select value={t.status} onValueChange={v => updateTicketStatus(t.id, v)}>
                          <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">مفتوح</SelectItem>
                            <SelectItem value="in_progress">قيد المعالجة</SelectItem>
                            <SelectItem value="closed">مغلق</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-xs">{getName(t.assigned_to)}</TableCell>
                      <TableCell><Button size="sm" variant="ghost" onClick={() => deleteRecord('internal_tickets', t.id)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                    </TableRow>
                  ))}
                  {tickets.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-xs">لا توجد تذاكر</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vehicles */}
        <TabsContent value="vehicles" className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">إضافة مركبة</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Select value={vehicleForm.courier_id} onValueChange={v => setVehicleForm(p => ({ ...p, courier_id: v }))}>
                <SelectTrigger className="w-36"><SelectValue placeholder="المندوب" /></SelectTrigger>
                <SelectContent>{couriers.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={vehicleForm.vehicle_type} onValueChange={v => setVehicleForm(p => ({ ...p, vehicle_type: v }))}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="motorcycle">موتوسيكل</SelectItem>
                  <SelectItem value="car">سيارة</SelectItem>
                  <SelectItem value="van">فان</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="رقم اللوحة" className="w-28" value={vehicleForm.plate_number} onChange={e => setVehicleForm(p => ({ ...p, plate_number: e.target.value }))} />
              <Input placeholder="الماركة" className="w-24" value={vehicleForm.brand} onChange={e => setVehicleForm(p => ({ ...p, brand: e.target.value }))} />
              <Input placeholder="الموديل" className="w-24" value={vehicleForm.model} onChange={e => setVehicleForm(p => ({ ...p, model: e.target.value }))} />
              <Button size="sm" onClick={addVehicle}><Plus className="h-3 w-3 ml-1" />إضافة</Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>المندوب</TableHead><TableHead>النوع</TableHead><TableHead>اللوحة</TableHead><TableHead>الماركة</TableHead><TableHead>حذف</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {vehicles.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="text-xs">{getCourierName(v.courier_id)}</TableCell>
                      <TableCell className="text-xs">{v.vehicle_type === 'motorcycle' ? 'موتوسيكل' : v.vehicle_type === 'car' ? 'سيارة' : 'فان'}</TableCell>
                      <TableCell className="text-xs">{v.plate_number}</TableCell>
                      <TableCell className="text-xs">{v.brand} {v.model}</TableCell>
                      <TableCell><Button size="sm" variant="ghost" onClick={() => deleteRecord('vehicles', v.id)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                    </TableRow>
                  ))}
                  {vehicles.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-xs">لا توجد مركبات</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fuel */}
        <TabsContent value="fuel" className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">إضافة تكلفة بنزين</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Select value={fuelForm.courier_id} onValueChange={v => setFuelForm(p => ({ ...p, courier_id: v }))}>
                <SelectTrigger className="w-36"><SelectValue placeholder="المندوب" /></SelectTrigger>
                <SelectContent>{couriers.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="number" placeholder="المبلغ" className="w-24" value={fuelForm.amount} onChange={e => setFuelForm(p => ({ ...p, amount: e.target.value }))} />
              <Input type="number" placeholder="اللترات" className="w-24" value={fuelForm.liters} onChange={e => setFuelForm(p => ({ ...p, liters: e.target.value }))} />
              <Input type="date" className="w-36" value={fuelForm.entry_date} onChange={e => setFuelForm(p => ({ ...p, entry_date: e.target.value }))} />
              <Button size="sm" onClick={addFuel}><Plus className="h-3 w-3 ml-1" />إضافة</Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>المندوب</TableHead><TableHead>المبلغ</TableHead><TableHead>اللترات</TableHead><TableHead>التاريخ</TableHead><TableHead>حذف</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {fuelEntries.map(f => (
                    <TableRow key={f.id}>
                      <TableCell className="text-xs">{getCourierName(f.courier_id)}</TableCell>
                      <TableCell className="text-xs font-bold">{f.amount}</TableCell>
                      <TableCell className="text-xs">{f.liters}</TableCell>
                      <TableCell className="text-xs">{f.entry_date}</TableCell>
                      <TableCell><Button size="sm" variant="ghost" onClick={() => deleteRecord('fuel_entries', f.id)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                    </TableRow>
                  ))}
                  {fuelEntries.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-xs">لا توجد بيانات</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {fuelEntries.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm font-bold">إجمالي تكلفة البنزين: {fuelEntries.reduce((s, f) => s + Number(f.amount), 0).toFixed(2)}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Inventory */}
        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">إضافة صنف</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Input placeholder="اسم الصنف" className="w-36" value={inventoryForm.item_name} onChange={e => setInventoryForm(p => ({ ...p, item_name: e.target.value }))} />
              <Input type="number" placeholder="الكمية" className="w-20" value={inventoryForm.quantity} onChange={e => setInventoryForm(p => ({ ...p, quantity: e.target.value }))} />
              <Input type="number" placeholder="حد أدنى" className="w-20" value={inventoryForm.min_quantity} onChange={e => setInventoryForm(p => ({ ...p, min_quantity: e.target.value }))} />
              <Input placeholder="التصنيف" className="w-28" value={inventoryForm.category} onChange={e => setInventoryForm(p => ({ ...p, category: e.target.value }))} />
              <Button size="sm" onClick={addInventoryItem}><Plus className="h-3 w-3 ml-1" />إضافة</Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>الصنف</TableHead><TableHead>الكمية</TableHead><TableHead>حد أدنى</TableHead><TableHead>التصنيف</TableHead><TableHead>حذف</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {inventory.map(item => (
                    <TableRow key={item.id} className={item.quantity <= item.min_quantity ? 'bg-destructive/10' : ''}>
                      <TableCell className="text-xs">{item.item_name}</TableCell>
                      <TableCell>
                        <Input type="number" className="w-16 h-7 text-xs" value={item.quantity}
                          onChange={e => updateInventoryQty(item.id, parseInt(e.target.value) || 0)} />
                      </TableCell>
                      <TableCell className="text-xs">{item.min_quantity}</TableCell>
                      <TableCell className="text-xs">{item.category}</TableCell>
                      <TableCell><Button size="sm" variant="ghost" onClick={() => deleteRecord('inventory_items', item.id)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                    </TableRow>
                  ))}
                  {inventory.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-xs">لا توجد أصناف</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Barcode Scanner */}
        <TabsContent value="scanner" className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">ماسح الباركود</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input placeholder="أدخل الباركود أو رقم التتبع" value={scanResult} onChange={e => setScanResult(e.target.value)} />
                <Button size="sm" onClick={searchBarcode}>بحث</Button>
              </div>
              <div>
                {!scanning ? (
                  <Button variant="outline" onClick={startScan}><Camera className="h-4 w-4 ml-1" />فتح الكاميرا</Button>
                ) : (
                  <Button variant="destructive" onClick={stopScan}>إغلاق الكاميرا</Button>
                )}
              </div>
              <video ref={videoRef} className={`w-full max-w-md rounded-lg ${scanning ? '' : 'hidden'}`} />
              <p className="text-xs text-muted-foreground">ملاحظة: للسكان الكامل استخدم ماسح USB خارجي أو أدخل الرقم يدوياً</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
