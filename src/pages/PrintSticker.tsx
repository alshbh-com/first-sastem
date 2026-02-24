import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Printer } from 'lucide-react';
import { toast } from 'sonner';

export default function PrintSticker() {
  const [search, setSearch] = useState('');
  const [order, setOrder] = useState<any | null>(null);

  const doSearch = async () => {
    if (!search.trim()) return;
    const term = search.trim();
    const { data } = await supabase
      .from('orders')
      .select('*, offices(name), companies(name)')
      .or(`barcode.ilike.%${term}%,customer_code.ilike.%${term}%,tracking_id.ilike.%${term}%,customer_phone.ilike.%${term}%`)
      .limit(1)
      .single();
    if (data) setOrder(data);
    else toast.error('لم يتم العثور على أوردر');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=400,height=400');
    if (!printWindow || !order) return;

    const total = Number(order.price) + Number(order.delivery_price);
    const barcode = order.barcode || '';
    const barcodeStripes = barcode.split('').map((c: string) => {
      const w = (parseInt(c) || 1) + 1;
      return `<div style="width:${w}px;height:60px;background:#000;margin:0 1px;display:inline-block"></div>`;
    }).join('');

    printWindow.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8">
      <style>
        @page { size: 100mm 100mm; margin: 3mm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 8px; width: 94mm; height: 94mm; box-sizing: border-box; font-size: 11px; }
        .header { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 6px; }
        .barcode-area { text-align: center; margin: 6px 0; }
        .barcode-num { text-align: center; font-family: monospace; font-size: 14px; font-weight: bold; margin-top: 2px; }
        .info { margin: 4px 0; }
        .info span { font-weight: bold; }
        .row { display: flex; justify-content: space-between; margin: 3px 0; }
        .total { font-size: 16px; font-weight: bold; text-align: center; margin: 6px 0; border: 2px solid #000; padding: 4px; }
      </style></head><body>
      <div class="header">FIRST</div>
      <div class="barcode-area">${barcodeStripes}</div>
      <div class="barcode-num">${barcode}</div>
      <div class="row"><div class="info">الكود: <span>${order.customer_code || '-'}</span></div><div class="info">التاريخ: <span>${new Date(order.created_at).toLocaleDateString('ar-EG')}</span></div></div>
      <div class="info">الشركة: <span>${order.companies?.name || '-'}</span></div>
      <div class="info">المكتب: <span>${order.offices?.name || '-'}</span></div>
      <div class="info">هاتف العميل: <span dir="ltr">${order.customer_phone}</span></div>
      <div class="info">المحافظة: <span>${order.governorate || '-'}</span></div>
      <div class="total">الإجمالي: ${total} ج.م</div>
      </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">طباعة ملصق</h1>
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="بحث بالباركود / الكود / Tracking / الهاتف..." value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
            className="pr-9 bg-secondary border-border" />
        </div>
        <Button onClick={doSearch}>بحث</Button>
      </div>

      {order && (
        <Card className="bg-card border-border max-w-md">
          <CardContent className="p-4 space-y-3">
            <div className="text-center text-xl font-bold">FIRST</div>
            {/* Barcode display */}
            <div className="text-center space-y-1">
              <div className="flex justify-center gap-[1px]">
                {(order.barcode || '').split('').map((c: string, i: number) => (
                  <div key={i} style={{ width: `${(parseInt(c) || 1) + 1}px`, height: '50px', backgroundColor: 'hsl(var(--foreground))' }} />
                ))}
              </div>
              <p className="font-mono text-sm font-bold">{order.barcode}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>الكود: <strong>{order.customer_code || '-'}</strong></div>
              <div>التاريخ: <strong>{new Date(order.created_at).toLocaleDateString('ar-EG')}</strong></div>
              <div>الشركة: <strong>{order.companies?.name || '-'}</strong></div>
              <div>المكتب: <strong>{order.offices?.name || '-'}</strong></div>
              <div>الهاتف: <strong dir="ltr">{order.customer_phone}</strong></div>
              <div>المحافظة: <strong>{order.governorate || '-'}</strong></div>
            </div>
            <div className="text-center text-lg font-bold border-2 border-border rounded p-2">
              الإجمالي: {Number(order.price) + Number(order.delivery_price)} ج.م
            </div>
            <Button className="w-full" onClick={handlePrint}><Printer className="h-4 w-4 ml-2" />طباعة الملصق</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
