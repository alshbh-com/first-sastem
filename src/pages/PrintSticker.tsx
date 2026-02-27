import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Printer, StickyNote, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function PrintSticker() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Load all non-closed orders on mount
  useEffect(() => {
    loadAllOrders();
  }, []);

  const loadAllOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, offices(name), companies(name)')
      .eq('is_closed', false)
      .order('created_at', { ascending: false })
      .limit(500);
    setResults(data || []);
  };

  const doSearch = async () => {
    if (!search.trim()) { loadAllOrders(); return; }
    const term = search.trim();
    const { data } = await supabase
      .from('orders')
      .select('*, offices(name), companies(name)')
      .or(`barcode.ilike.%${term}%,customer_code.ilike.%${term}%,tracking_id.ilike.%${term}%,customer_phone.ilike.%${term}%,customer_name.ilike.%${term}%`)
      .order('created_at', { ascending: false })
      .limit(200);
    setResults(data || []);
    setSelected(new Set());
    if (!data?.length) toast.error('لم يتم العثور على نتائج');
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAll = () => {
    if (selected.size === results.length) setSelected(new Set());
    else setSelected(new Set(results.map(o => o.id)));
  };

  const selectedOrders = results.filter(o => selected.has(o.id));

  const generateBarcodeStripes = (barcode: string) => {
    return barcode.split('').map((c: string) => {
      const w = (parseInt(c) || 1) + 1;
      return `<div style="width:${w}px;height:40px;background:#000;margin:0 1px;display:inline-block"></div>`;
    }).join('');
  };

  const printStickers = () => {
    if (selectedOrders.length === 0) { toast.error('اختر أوردرات للطباعة'); return; }
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) return;

    const stickers = selectedOrders.map(order => {
      const total = Number(order.price) + Number(order.delivery_price);
      const barcode = order.barcode || '';
      return `
        <div class="sticker">
          <div class="header">FIRST</div>
          <div class="barcode-area">${generateBarcodeStripes(barcode)}</div>
          <div class="barcode-num">${barcode}</div>
          <div class="row"><span>الكود: <b>${order.customer_code || '-'}</b></span><span>${new Date(order.created_at).toLocaleDateString('ar-EG')}</span></div>
          <div class="info">المكتب: <b>${order.offices?.name || '-'}</b></div>
          <div class="info">هاتف: <b dir="ltr">${order.customer_phone}</b></div>
          <div class="info">العنوان: <b>${order.address || order.governorate || '-'}</b></div>
          <div class="total">الإجمالي: ${total} ج.م</div>
        </div>`;
    }).join('');

    printWindow.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8">
      <style>
        @page { size: 76mm 50mm; margin: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; font-size: 9px; }
        .sticker { width: 72mm; height: 46mm; padding: 2mm; box-sizing: border-box; page-break-after: always; border: 1px dashed #ccc; }
        .header { text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 2px; }
        .barcode-area { text-align: center; margin: 2px 0; }
        .barcode-num { text-align: center; font-family: monospace; font-size: 10px; font-weight: bold; }
        .info { margin: 1px 0; font-size: 8px; }
        .row { display: flex; justify-content: space-between; margin: 1px 0; font-size: 8px; }
        .total { font-size: 12px; font-weight: bold; text-align: center; margin-top: 3px; border: 1px solid #000; padding: 2px; }
      </style></head><body>${stickers}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const printInvoice = () => {
    if (selectedOrders.length === 0) { toast.error('اختر أوردرات للطباعة'); return; }
    const printWindow = window.open('', '_blank', 'width=800,height=1000');
    if (!printWindow) return;

    // Group into pages of ~20 orders each to fit on A4
    const perPage = 20;
    const pages: any[][] = [];
    for (let i = 0; i < selectedOrders.length; i += perPage) {
      pages.push(selectedOrders.slice(i, i + perPage));
    }

    const totalAll = selectedOrders.reduce((s, o) => s + Number(o.price) + Number(o.delivery_price), 0);

    const pagesHtml = pages.map((pageOrders, pageIdx) => {
      const rows = pageOrders.map((order, i) => {
        const total = Number(order.price) + Number(order.delivery_price);
        const barcode = order.barcode || '';
        const globalIdx = pageIdx * perPage + i + 1;
        return `<tr>
          <td>${globalIdx}</td>
          <td>${order.customer_code || '-'}</td>
          <td style="direction:ltr;text-align:center"><span style="font-family:monospace;font-size:9px">${barcode}</span></td>
          <td>${order.customer_name}</td>
          <td dir="ltr">${order.customer_phone}</td>
          <td>${order.offices?.name || '-'}</td>
          <td>${order.address || order.governorate || '-'}</td>
          <td><b>${total} ج.م</b></td>
        </tr>`;
      }).join('');

      return `
        <div class="page">
          <div class="header">FIRST</div>
          <div class="date">${new Date().toLocaleDateString('ar-EG')} - عدد: ${selectedOrders.length} أوردر - صفحة ${pageIdx + 1}/${pages.length}</div>
          <table>
            <thead><tr><th>#</th><th>الكود</th><th>الباركود</th><th>العميل</th><th>الهاتف</th><th>المكتب</th><th>العنوان</th><th>الإجمالي</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          ${pageIdx === pages.length - 1 ? `<div class="total-row">الإجمالي الكلي: ${totalAll} ج.م</div>` : ''}
        </div>`;
    }).join('');

    printWindow.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8">
      <style>
        @page { size: A4; margin: 8mm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; font-size: 11px; }
        .page { page-break-after: always; }
        .page:last-child { page-break-after: auto; }
        .header { text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 4px; }
        .date { text-align: center; margin-bottom: 10px; color: #666; font-size: 10px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #333; padding: 4px 6px; text-align: right; font-size: 10px; }
        th { background: #f0f0f0; font-weight: bold; }
        .total-row { font-size: 14px; font-weight: bold; text-align: center; margin-top: 10px; border: 2px solid #000; padding: 6px; }
      </style></head><body>${pagesHtml}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-bold">الطباعة</h1>
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-lg">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="بحث بالباركود / الكود / الاسم / الهاتف..." value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
            className="pr-9 bg-secondary border-border" />
        </div>
        <Button onClick={doSearch}>بحث</Button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm font-medium">تم تحديد {selected.size} أوردر</span>
        <Button size="sm" onClick={printStickers} disabled={selected.size === 0}>
          <StickyNote className="h-4 w-4 ml-1" />ملصقات (3×5)
        </Button>
        <Button size="sm" variant="outline" onClick={printInvoice} disabled={selected.size === 0}>
          <FileText className="h-4 w-4 ml-1" />فاتورة (A4)
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="w-10"><Checkbox checked={results.length > 0 && selected.size === results.length} onCheckedChange={toggleAll} /></TableHead>
                  <TableHead className="text-right">الباركود</TableHead>
                  <TableHead className="text-right">الكود</TableHead>
                  <TableHead className="text-right">العميل</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">الهاتف</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">المكتب</TableHead>
                  <TableHead className="text-right">الإجمالي</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">لا توجد أوردرات</TableCell></TableRow>
                ) : results.map(order => (
                  <TableRow key={order.id} className="border-border">
                    <TableCell><Checkbox checked={selected.has(order.id)} onCheckedChange={() => toggleSelect(order.id)} /></TableCell>
                    <TableCell className="font-mono text-xs">{order.barcode || '-'}</TableCell>
                    <TableCell className="font-mono text-xs">{order.customer_code || '-'}</TableCell>
                    <TableCell className="text-sm">{order.customer_name}</TableCell>
                    <TableCell dir="ltr" className="hidden sm:table-cell text-sm">{order.customer_phone}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">{order.offices?.name || '-'}</TableCell>
                    <TableCell className="font-bold text-sm">{Number(order.price) + Number(order.delivery_price)} ج.م</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
