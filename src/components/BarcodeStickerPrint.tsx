import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

type Order = {
  id: string;
  barcode?: string | null;
  customer_code?: string | null;
  customer_name?: string;
  customer_phone?: string | null;
  governorate?: string;
  address?: string;
  price?: number;
  product_name?: string;
  offices?: { name: string } | null;
};

export function StickerCard({ order }: { order: Order }) {
  const code = order.barcode || order.customer_code || order.id;
  const bcRef = useRef<SVGSVGElement>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (bcRef.current) {
      try { JsBarcode(bcRef.current, code, { format: 'CODE128', width: 2, height: 50, displayValue: true, fontSize: 14, margin: 0 }); } catch {}
    }
    if (qrRef.current) {
      QRCode.toCanvas(qrRef.current, code, { width: 80, margin: 0 }).catch(() => {});
    }
  }, [code]);

  return (
    <div className="sticker border-2 border-black p-2 break-inside-avoid" style={{ width: '10cm', height: '5cm' }}>
      <div className="flex justify-between items-start text-xs mb-1">
        <div className="font-bold">{order.offices?.name || 'FIRST'}</div>
        <div>{Number(order.price || 0).toFixed(0)} ج</div>
      </div>
      <div className="flex gap-2 items-center">
        <svg ref={bcRef} className="flex-1" />
        <canvas ref={qrRef} />
      </div>
      <div className="text-xs mt-1 leading-tight">
        <div className="font-bold truncate">{order.customer_name}</div>
        <div>{order.customer_phone} · {order.governorate}</div>
        <div className="truncate">{order.address}</div>
      </div>
    </div>
  );
}

export function printStickers(orders: Order[]) {
  const w = window.open('', '_blank', 'width=800,height=600');
  if (!w) return;
  w.document.write(`<html><head><title>ملصقات</title>
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.12.3/dist/JsBarcode.all.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js"></script>
    <style>
      @page { size: 10cm 5cm; margin: 0; }
      body { font-family: sans-serif; direction: rtl; margin: 0; }
      .sticker { width: 10cm; height: 5cm; padding: 6px; box-sizing: border-box; page-break-after: always; border: 1px solid #000; }
      .row { display: flex; gap: 6px; align-items: center; }
      .hdr { display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; }
      .info { font-size: 10px; line-height: 1.2; margin-top: 4px; }
      svg, canvas { display: block; }
    </style></head><body>`);
  orders.forEach((o, i) => {
    const code = o.barcode || o.customer_code || o.id;
    w.document.write(`<div class="sticker">
      <div class="hdr"><span>${o.offices?.name || 'FIRST'}</span><span>${Number(o.price || 0).toFixed(0)} ج</span></div>
      <div class="row"><svg id="bc${i}" style="flex:1"></svg><canvas id="qr${i}"></canvas></div>
      <div class="info">
        <div><b>${o.customer_name || ''}</b></div>
        <div>${o.customer_phone || ''} · ${o.governorate || ''}</div>
        <div>${o.address || ''}</div>
      </div>
    </div>`);
  });
  w.document.write(`<script>
    window.onload = function() {
      ${orders.map((o, i) => {
        const code = (o.barcode || o.customer_code || o.id || '').toString().replace(/'/g, "\\'");
        return `try{JsBarcode('#bc${i}','${code}',{format:'CODE128',width:2,height:50,fontSize:14,margin:0});}catch(e){}
                QRCode.toCanvas(document.getElementById('qr${i}'),'${code}',{width:80,margin:0});`;
      }).join('\n')}
      setTimeout(function(){ window.print(); }, 400);
    };
  </script></body></html>`);
  w.document.close();
}
