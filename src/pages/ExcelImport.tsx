import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, FileSpreadsheet, CheckCircle, Download, RotateCcw, ArrowLeft, ArrowRight } from "lucide-react";

type Step = "upload" | "mapping" | "preview";

interface SystemField {
  key: string;
  label: string;
  required: boolean;
}

const SYSTEM_FIELDS: SystemField[] = [
  { key: "customer_name", label: "اسم العميل", required: true },
  { key: "customer_phone", label: "رقم الهاتف", required: true },
  { key: "customer_code", label: "كود العميل / البوليصة", required: false },
  { key: "product_name", label: "اسم المنتج", required: false },
  { key: "quantity", label: "الكمية", required: false },
  { key: "price", label: "السعر", required: true },
  { key: "delivery_price", label: "سعر التوصيل", required: false },
  { key: "governorate", label: "المحافظة", required: false },
  { key: "address", label: "العنوان", required: false },
  { key: "color", label: "اللون", required: false },
  { key: "size", label: "المقاس", required: false },
  { key: "notes", label: "ملاحظات", required: false },
];

const HEADER_MAP: Record<string, string> = {
  "اسم المستلم": "customer_name",
  "اسم العميل": "customer_name",
  "الاسم": "customer_name",
  "name": "customer_name",
  "customer name": "customer_name",
  "customer_name": "customer_name",
  "موبايل المستلم": "customer_phone",
  "رقم الهاتف": "customer_phone",
  "الموبايل": "customer_phone",
  "التليفون": "customer_phone",
  "هاتف": "customer_phone",
  "phone": "customer_phone",
  "customer_phone": "customer_phone",
  "البوليصة": "customer_code",
  "كود العميل": "customer_code",
  "الكود": "customer_code",
  "code": "customer_code",
  "barcode": "customer_code",
  "اسم المنتج": "product_name",
  "المنتج": "product_name",
  "product": "product_name",
  "product_name": "product_name",
  "الكمية": "quantity",
  "quantity": "quantity",
  "المطلوب سداده": "price",
  "السعر": "price",
  "المبلغ": "price",
  "price": "price",
  "amount": "price",
  "سعر التوصيل": "delivery_price",
  "الشحن": "delivery_price",
  "delivery": "delivery_price",
  "shipping": "delivery_price",
  "delivery_price": "delivery_price",
  "المحافظة": "governorate",
  "مدينة": "governorate",
  "المدينة": "governorate",
  "governorate": "governorate",
  "city": "governorate",
  "العنوان": "address",
  "عنوان": "address",
  "address": "address",
  "اللون": "color",
  "color": "color",
  "المقاس": "size",
  "size": "size",
  "ملاحظات": "notes",
  "notes": "notes",
  "note": "notes",
};

function generateTrackingId() {
  const year = new Date().getFullYear();
  const random = Math.floor(10000 + Math.random() * 90000);
  return `FR-${year}-${random}`;
}

export default function ExcelImport() {
  const [step, setStep] = useState<Step>("upload");
  const [officeId, setOfficeId] = useState("");
  const [globalShipping, setGlobalShipping] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);

  const { data: offices } = useQuery({
    queryKey: ["offices"],
    queryFn: async () => {
      const { data } = await supabase.from("offices").select("id, name").order("name");
      return data || [];
    },
  });

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });

        if (!json.length) {
          toast.error("الملف فارغ أو لا يحتوي على بيانات");
          return;
        }

        const cols = Object.keys(json[0]);
        setHeaders(cols);
        setRawData(json);

        // Auto-detect mapping
        const autoMap: Record<string, string> = {};
        const usedFields = new Set<string>();
        cols.forEach((col) => {
          const normalized = col.trim().toLowerCase();
          const match = HEADER_MAP[normalized];
          if (match && !usedFields.has(match)) {
            autoMap[col] = match;
            usedFields.add(match);
          }
        });
        setMapping(autoMap);

        toast.success(`تم قراءة ${json.length} صف و ${cols.length} عمود`);
        setStep("mapping");
      } catch {
        toast.error("حدث خطأ في قراءة الملف");
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  const updateMapping = (excelCol: string, systemField: string) => {
    setMapping((prev) => {
      const next = { ...prev };
      // Remove any existing mapping to this system field
      if (systemField !== "_none") {
        Object.keys(next).forEach((k) => {
          if (next[k] === systemField) delete next[k];
        });
        next[excelCol] = systemField;
      } else {
        delete next[excelCol];
      }
      return next;
    });
  };

  const requiredMapped = useMemo(() => {
    const mapped = new Set(Object.values(mapping));
    return SYSTEM_FIELDS.filter((f) => f.required).every((f) => mapped.has(f.key));
  }, [mapping]);

  const parsedRows = useMemo(() => {
    if (step !== "preview") return [];
    const reverseMap: Record<string, string> = {};
    Object.entries(mapping).forEach(([excel, sys]) => {
      reverseMap[sys] = excel;
    });

    return rawData.map((row) => {
      const parsed: Record<string, any> = {};
      SYSTEM_FIELDS.forEach((f) => {
        const excelCol = reverseMap[f.key];
        parsed[f.key] = excelCol ? row[excelCol] : "";
      });
      return parsed;
    });
  }, [step, mapping, rawData]);

  const validRows = useMemo(() => {
    return parsedRows.filter((r) => {
      const name = String(r.customer_name || "").trim();
      const phone = String(r.customer_phone || "").trim();
      const price = Number(r.price) || 0;
      return name && phone && price > 0;
    });
  }, [parsedRows]);

  const invalidCount = parsedRows.length - validRows.length;

  const handleImport = async () => {
    if (!officeId) {
      toast.error("يرجى اختيار المكتب أولاً");
      return;
    }

    setImporting(true);
    setProgress(0);
    setResult(null);

    const globalShip = Number(globalShipping) || 0;
    let success = 0;
    let failed = 0;
    const batchSize = 20;

    for (let i = 0; i < validRows.length; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize).map((r) => {
        const gov = String(r.governorate || "").trim();
        const addr = String(r.address || "").trim();
        const combinedAddress = [gov, addr].filter(Boolean).join(" - ");
        const deliveryPrice = Number(r.delivery_price) || globalShip;

        return {
          customer_name: String(r.customer_name).trim(),
          customer_phone: String(r.customer_phone).trim(),
          customer_code: String(r.customer_code || "").trim(),
          product_name: String(r.product_name || "").trim(),
          quantity: Number(r.quantity) || 1,
          price: Number(r.price),
          delivery_price: deliveryPrice,
          governorate: gov,
          address: combinedAddress,
          color: String(r.color || "").trim(),
          size: String(r.size || "").trim(),
          notes: String(r.notes || "").trim(),
          office_id: officeId,
          tracking_id: generateTrackingId(),
        };
      });

      const { error } = await supabase.from("orders").insert(batch);
      if (error) {
        failed += batch.length;
      } else {
        success += batch.length;
      }
      setProgress(Math.round(((i + batch.length) / validRows.length) * 100));
    }

    setResult({ success, failed });
    setImporting(false);
    if (success > 0) toast.success(`تم استيراد ${success} طلب بنجاح`);
    if (failed > 0) toast.error(`فشل استيراد ${failed} طلب`);
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        "اسم المستلم": "أحمد محمد",
        "موبايل المستلم": "01012345678",
        "البوليصة": "ABC123",
        "اسم المنتج": "تيشيرت",
        "الكمية": 1,
        "المطلوب سداده": 250,
        "سعر التوصيل": 50,
        "المحافظة": "القاهرة",
        "العنوان": "شارع التحرير",
        "اللون": "أسود",
        "المقاس": "L",
        "ملاحظات": "",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "import_template.xlsx");
  };

  const reset = () => {
    setStep("upload");
    setHeaders([]);
    setRawData([]);
    setMapping({});
    setProgress(0);
    setResult(null);
  };

  return (
    <div dir="rtl" className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <h1 className="text-lg sm:text-2xl font-bold">استيراد من Excel</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none text-xs sm:text-sm" onClick={downloadTemplate}>
            <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-1" />
            تحميل القالب
          </Button>
          {step !== "upload" && (
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none text-xs sm:text-sm" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-1" />
              ملف جديد
            </Button>
          )}
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center justify-center gap-1 sm:gap-2">
        {[
          { key: "upload", label: "رفع", labelFull: "رفع الملف", icon: Upload },
          { key: "mapping", label: "ربط", labelFull: "ربط الأعمدة", icon: FileSpreadsheet },
          { key: "preview", label: "استيراد", labelFull: "معاينة واستيراد", icon: CheckCircle },
        ].map((s, i) => (
          <div key={s.key} className="flex items-center gap-1 sm:gap-2">
            <div
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-sm font-medium transition-colors ${
                step === s.key
                  ? "bg-primary text-primary-foreground"
                  : ["upload", "mapping", "preview"].indexOf(step) > i
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <s.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{s.labelFull}</span>
              <span className="sm:hidden">{s.label}</span>
            </div>
            {i < 2 && <div className="w-4 sm:w-8 h-px bg-border" />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>رفع ملف Excel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>المكتب / الفرع</Label>
              <Select value={officeId} onValueChange={setOfficeId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المكتب" />
                </SelectTrigger>
                <SelectContent>
                  {offices?.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>سعر الشحن الموحد (اختياري)</Label>
              <Input
                type="number"
                placeholder="يُطبق على الصفوف بدون سعر توصيل"
                value={globalShipping}
                onChange={(e) => setGlobalShipping(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>اختر ملف</Label>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFile}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                يدعم .xlsx, .xls, .csv
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Mapping */}
      {step === "mapping" && (
        <Card>
          <CardHeader>
            <CardTitle>ربط الأعمدة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              اربط كل عمود في الملف بالحقل المناسب في النظام. الحقول المطلوبة مُعلَّمة بـ *
            </p>

            <div className="grid gap-3">
              {headers.map((col) => (
                <div key={col} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm truncate block">{col}</span>
                    {rawData[0] && (
                      <span className="text-xs text-muted-foreground truncate block">
                        مثال: {String(rawData[0][col]).slice(0, 40)}
                      </span>
                    )}
                  </div>
                  <Select
                    value={mapping[col] || "_none"}
                    onValueChange={(v) => updateMapping(col, v)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">— تجاهل —</SelectItem>
                      {SYSTEM_FIELDS.map((f) => {
                        const alreadyUsed = Object.entries(mapping).some(
                          ([k, v]) => v === f.key && k !== col
                        );
                        return (
                          <SelectItem key={f.key} value={f.key} disabled={alreadyUsed}>
                            {f.label} {f.required ? "*" : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4">
              <Button variant="outline" onClick={() => setStep("upload")}>
                <ArrowRight className="h-4 w-4 ml-1" />
                رجوع
              </Button>
              <Button
                disabled={!requiredMapped}
                onClick={() => {
                  if (invalidCount > 0) {
                    toast.warning(`سيتم تجاهل ${invalidCount} صف غير صالح (بدون اسم أو هاتف أو سعر)`);
                  }
                  setStep("preview");
                }}
              >
                معاينة
                <ArrowLeft className="h-4 w-4 mr-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview & Import */}
      {step === "preview" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              معاينة البيانات
              <Badge variant="secondary">{validRows.length} صف صالح</Badge>
              {invalidCount > 0 && (
                <Badge variant="destructive">{invalidCount} صف مرفوض</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-auto max-h-[400px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    {SYSTEM_FIELDS.filter((f) =>
                      Object.values(mapping).includes(f.key)
                    ).map((f) => (
                      <TableHead key={f.key}>{f.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validRows.slice(0, 50).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{i + 1}</TableCell>
                      {SYSTEM_FIELDS.filter((f) =>
                        Object.values(mapping).includes(f.key)
                      ).map((f) => (
                        <TableCell key={f.key}>
                          {String(row[f.key] ?? "").slice(0, 30)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {importing && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-center text-muted-foreground">
                  جاري الاستيراد... {progress}%
                </p>
              </div>
            )}

            {result && (
              <div className="flex items-center justify-center gap-3">
                <Badge className="bg-primary text-primary-foreground">{result.success} نجح</Badge>
                {result.failed > 0 && (
                  <Badge variant="destructive">{result.failed} فشل</Badge>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" onClick={() => setStep("mapping")} disabled={importing}>
                <ArrowRight className="h-4 w-4 ml-1" />
                رجوع
              </Button>
              <Button onClick={handleImport} disabled={importing || validRows.length === 0}>
                {importing ? "جاري الاستيراد..." : `استيراد ${validRows.length} طلب`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
