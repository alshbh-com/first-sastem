import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// ترجمة الأكشن للعامية
function translateAction(action: string): string {
  const map: Record<string, string> = {
    'create_order': 'أضاف أوردر جديد',
    'update_order': 'عدّل أوردر',
    'delete_order': 'مسح أوردر',
    'update_status': 'غيّر حالة أوردر',
    'change_status': 'غيّر حالة أوردر',
    'assign_courier': 'عيّن مندوب على أوردر',
    'create_office': 'أضاف مكتب جديد',
    'update_office': 'عدّل بيانات مكتب',
    'delete_office': 'مسح مكتب',
    'create_courier': 'أضاف مندوب جديد',
    'update_courier': 'عدّل بيانات مندوب',
    'delete_courier': 'مسح مندوب',
    'create_payment': 'سجّل دفعة فلوس',
    'delete_payment': 'مسح دفعة فلوس',
    'create_collection': 'سجّل تحصيل',
    'delete_collection': 'مسح تحصيل',
    'clear_collections': 'مسح كل التحصيلات',
    'create_advance': 'سجّل سلفة',
    'delete_advance': 'مسح سلفة',
    'create_expense': 'أضاف مصروف',
    'delete_expense': 'مسح مصروف',
    'update_expense': 'عدّل مصروف',
    'create_product': 'أضاف منتج',
    'update_product': 'عدّل منتج',
    'delete_product': 'مسح منتج',
    'create_status': 'أضاف حالة جديدة',
    'update_status_config': 'عدّل إعدادات حالة',
    'delete_status': 'مسح حالة',
    'close_diary': 'قفل يومية',
    'open_diary': 'فتح يومية',
    'create_diary': 'أنشأ يومية جديدة',
    'delete_diary': 'مسح يومية',
    'approve_order': 'وافق على أوردر',
    'reject_order': 'رفض أوردر',
    'import_orders': 'استورد أوردرات من إكسل',
    'export_data': 'صدّر بيانات',
    'login': 'سجّل دخول',
    'logout': 'سجّل خروج',
    'settle_order': 'خلّص أوردر (خالص)',
    'unsettle_order': 'ألغى تخليص أوردر',
    'update_delivery_price': 'عدّل سعر توصيل',
    'create_bonus': 'أضاف مكافأة لمندوب',
    'delete_bonus': 'مسح مكافأة مندوب',
    'create_violation': 'سجّل مخالفة على مندوب',
    'update_permissions': 'غيّر صلاحيات مستخدم',
    'update_role': 'غيّر دور مستخدم',
    'send_whatsapp': 'بعت رسالة واتساب',
    'create_cash_flow': 'سجّل حركة نقدية',
    'delete_cash_flow': 'مسح حركة نقدية',
    'close_order': 'قفل أوردر',
    'open_order': 'فتح أوردر مقفول',
    'bulk_update': 'عدّل أوردرات بالجملة',
    'trash_order': 'نقل أوردر للمحذوفات',
    'restore_order': 'رجّع أوردر من المحذوفات',
  };
  return map[action] || action;
}

// ترجمة التفاصيل لنص عربي عامي مفهوم
function translateDetails(details: any): string {
  if (!details || typeof details !== 'object') return String(details || '-');

  const labels: Record<string, string> = {
    order_id: 'رقم الأوردر', tracking_id: 'كود التتبع', customer_name: 'اسم العميل',
    customer_phone: 'تليفون العميل', price: 'السعر', office: 'المكتب', office_name: 'اسم المكتب',
    courier: 'المندوب', courier_name: 'اسم المندوب', status: 'الحالة', old_status: 'كانت',
    new_status: 'بقت', amount: 'المبلغ', reason: 'السبب', name: 'الاسم',
    phone: 'التليفون', address: 'العنوان', product: 'المنتج', product_name: 'اسم المنتج',
    quantity: 'الكمية', notes: 'ملاحظات', date: 'التاريخ', type: 'النوع',
    delivery_price: 'سعر التوصيل', governorate: 'المحافظة', barcode: 'الباركود',
    changed_by: 'اللي عمل كده', old_value: 'كانت', new_value: 'بقت',
    field: 'الحقل', count: 'العدد', total: 'الإجمالي', user: 'المستخدم',
    office_id: 'المكتب', courier_id: 'المندوب', status_id: 'الحالة',
    product_id: 'المنتج', company_id: 'الشركة', customer_id: 'العميل',
    customer_code: 'كود العميل', size: 'المقاس', color: 'اللون',
    branch_label: 'الفرع', return_status: 'حالة الإرجاع', shipping_paid: 'شحن مدفوع',
    is_closed: 'مقفول', is_settled: 'مخلّص', priority: 'الأولوية',
    diary_number: 'رقم اليومية', diary_date: 'تاريخ اليومية',
    partial_amount: 'مبلغ جزئي', settlement: 'تسوية',
    user_id: 'المستخدم', created_by: 'اللي عمله', paid_by: 'اللي دفع',
    collected_by: 'اللي حصّل', approved_by: 'اللي وافق', rated_by: 'اللي قيّم',
    assigned_to: 'معيّن لـ', created_at: 'وقت الإنشاء', updated_at: 'وقت التعديل',
    category: 'التصنيف', expense_name: 'اسم المصروف', expense_date: 'تاريخ المصروف',
    leave_date: 'تاريخ الإجازة', violation_type: 'نوع المخالفة',
    entry_date: 'تاريخ القيد', liters: 'لترات', plate_number: 'رقم اللوحة',
    vehicle_type: 'نوع المركبة', item_name: 'اسم الصنف', min_quantity: 'أقل كمية',
    reward_amount: 'مبلغ المكافأة', deliveries_count: 'عدد التوصيلات',
    is_paid: 'مدفوع', is_active: 'نشط', salary: 'المرتب', full_name: 'الاسم بالكامل',
    login_code: 'كود الدخول', coverage_areas: 'مناطق التغطية',
    complaint_text: 'نص الشكوى', resolution: 'الحل', message: 'الرسالة',
    title: 'العنوان', description: 'الوصف', closing_date: 'تاريخ التقفيل',
    agreement_price: 'سعر الاتفاق', pickup_price: 'سعر البيك أب',
    owner_name: 'اسم صاحب المكتب', owner_phone: 'تليفون صاحب المكتب',
    id: 'الرقم التعريفي',
  };

  // ترجمة القيم الإنجليزية الشائعة
  const valueTranslations: Record<string, string> = {
    'deduction': 'خصم', 'advance': 'سلفة', 'bonus': 'مكافأة', 'penalty': 'جزاء',
    'warning': 'إنذار', 'suspension': 'إيقاف', 'fine': 'غرامة',
    'inside': 'داخل', 'outside': 'خارج', 'income': 'دخل', 'expense': 'مصروف',
    'normal': 'عادي', 'urgent': 'مستعجل', 'high': 'عالي', 'low': 'منخفض',
    'open': 'مفتوح', 'closed': 'مقفول', 'pending': 'معلّق', 'resolved': 'تم الحل',
    'approved': 'موافق عليه', 'rejected': 'مرفوض',
    'motorcycle': 'موتوسيكل', 'car': 'عربية', 'bicycle': 'عجلة',
    'true': 'أيوه', 'false': 'لأ',
    'salary': 'مرتب', 'rent': 'إيجار', 'fuel': 'بنزين', 'other': 'تاني',
    'أخرى': 'تاني',
  };

  const translateValue = (v: any): string => {
    if (typeof v === 'boolean') return v ? 'أيوه' : 'لأ';
    const str = String(v);
    return valueTranslations[str] || str;
  };

  // لو القيمة UUID طويل نتجاهلها أو نختصرها
  const isUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

  const parts: string[] = [];
  for (const [k, v] of Object.entries(details as Record<string, any>)) {
    if (v === null || v === undefined || v === '') continue;
    const strV = String(v);
    // لو UUID وملوش ترجمة نتخطاه
    if (isUUID(strV) && !['order_id', 'tracking_id'].includes(k)) continue;
    const label = labels[k] || k;
    parts.push(`${label}: ${translateValue(v)}`);
  }
  return parts.length > 0 ? parts.join('\n') : '-';
}

export default function ActivityLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      const [logsRes, profilesRes] = await Promise.all([
        supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('profiles').select('id, full_name'),
      ]);

      if (logsRes.error) {
        console.error('Failed loading activity logs:', logsRes.error);
        setLogs([]);
        return;
      }

      setLogs(logsRes.data || []);
      const map: Record<string, string> = {};
      (profilesRes.data || []).forEach(p => { map[p.id] = p.full_name; });
      setProfiles(map);
    };
    load();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-bold">سجل الحركات</h1>
      <p className="text-sm text-muted-foreground">يعرض آخر 200 حركة - يتم حذف السجلات تلقائياً بعد 7 أيام</p>
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-right">المستخدم</TableHead>
                  <TableHead className="text-right">عمل إيه</TableHead>
                  <TableHead className="text-right">التفاصيل</TableHead>
                  <TableHead className="text-right">إمتى</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">مفيش حركات لسه</TableCell></TableRow>
                ) : logs.map((l) => (
                  <TableRow key={l.id} className="border-border align-top">
                    <TableCell className="text-sm font-medium whitespace-nowrap">{l.user_id ? (profiles[l.user_id] || 'مجهول') : '-'}</TableCell>
                    <TableCell className="font-medium text-sm whitespace-nowrap">{translateAction(l.action)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                      {translateDetails(l.details)}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{new Date(l.created_at).toLocaleString('ar-EG')}</TableCell>
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