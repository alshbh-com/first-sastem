import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Settings2, Layout, FormInput, Zap, Globe, Smartphone, Plus, Trash2, Save, Eye, EyeOff, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const saveSetting = async (key: string, value: string) => {
  await supabase.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
};
const loadSetting = async (key: string): Promise<string | null> => {
  const { data } = await supabase.from('app_settings').select('value').eq('key', key).maybeSingle();
  return data?.value || null;
};

// ============ 1. داشبورد قابل للتخصيص ============
function CustomDashboard() {
  const widgets = [
    { id: 'orders_count', label: 'عدد الأوردرات', enabled: true },
    { id: 'revenue', label: 'الإيرادات', enabled: true },
    { id: 'couriers_active', label: 'المناديب النشطين', enabled: true },
    { id: 'offices_count', label: 'عدد المكاتب', enabled: true },
    { id: 'pending_orders', label: 'أوردرات معلقة', enabled: true },
    { id: 'today_deliveries', label: 'تسليمات اليوم', enabled: false },
    { id: 'returns_rate', label: 'نسبة المرتجعات', enabled: false },
    { id: 'top_courier', label: 'أفضل مندوب', enabled: false },
  ];

  const [items, setItems] = useState(widgets);

  useEffect(() => {
    loadSetting('dashboard_widgets').then(v => { if (v) setItems(JSON.parse(v)); });
  }, []);

  const toggle = (id: string) => {
    setItems(prev => prev.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w));
  };

  const save = async () => {
    await saveSetting('dashboard_widgets', JSON.stringify(items));
    toast.success('تم حفظ إعدادات الداشبورد');
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Layout className="h-4 w-4" /> تخصيص الداشبورد</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">اختر الويدجتس اللي تظهر في لوحة التحكم</p>
        <div className="space-y-2">
          {items.map(w => (
            <div key={w.id} className="flex items-center justify-between p-2 rounded border bg-muted/30">
              <div className="flex items-center gap-2">
                <GripVertical className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm">{w.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {w.enabled ? <Eye className="h-3 w-3 text-green-500" /> : <EyeOff className="h-3 w-3 text-muted-foreground" />}
                <Switch checked={w.enabled} onCheckedChange={() => toggle(w.id)} />
              </div>
            </div>
          ))}
        </div>
        <Button onClick={save} size="sm" className="w-full"><Save className="h-4 w-4 ml-2" /> حفظ</Button>
      </CardContent>
    </Card>
  );
}

// ============ 2. حقول مخصصة للأوردر ============
function CustomOrderFields() {
  const [fields, setFields] = useState<{ name: string; type: string; required: boolean }[]>([]);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('text');

  useEffect(() => {
    loadSetting('custom_order_fields').then(v => { if (v) setFields(JSON.parse(v)); });
  }, []);

  const save = async (f: typeof fields) => {
    setFields(f);
    await saveSetting('custom_order_fields', JSON.stringify(f));
  };

  const add = async () => {
    if (!newName) return;
    const updated = [...fields, { name: newName, type: newType, required: false }];
    await save(updated);
    setNewName('');
    toast.success('تمت إضافة الحقل');
  };

  const remove = async (idx: number) => {
    await save(fields.filter((_, i) => i !== idx));
  };

  const toggleRequired = async (idx: number) => {
    const updated = fields.map((f, i) => i === idx ? { ...f, required: !f.required } : f);
    await save(updated);
  };

  const typeLabels: Record<string, string> = { text: 'نص', number: 'رقم', select: 'اختيار', date: 'تاريخ', checkbox: 'صح/خطأ' };

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FormInput className="h-4 w-4" /> حقول مخصصة للأوردر</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">أضف حقول إضافية تظهر في نموذج الأوردر</p>
        <div className="flex gap-2">
          <Input placeholder="اسم الحقل" value={newName} onChange={e => setNewName(e.target.value)} className="flex-1" />
          <Select value={newType} onValueChange={setNewType}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={add}><Plus className="h-4 w-4" /></Button>
        </div>
        {fields.length > 0 && (
          <div className="space-y-2">
            {fields.map((f, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded border bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{f.name}</span>
                  <Badge variant="outline" className="text-xs">{typeLabels[f.type]}</Badge>
                  {f.required && <Badge className="text-xs">إجباري</Badge>}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => toggleRequired(i)} title={f.required ? 'اختياري' : 'إجباري'}>
                    <Badge variant={f.required ? 'default' : 'outline'} className="text-xs cursor-pointer">مطلوب</Badge>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(i)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============ 3. قواعد أتمتة ============
function AutomationRules() {
  const [rules, setRules] = useState<{ name: string; trigger: string; action: string; active: boolean }[]>([]);
  const [newRule, setNewRule] = useState({ name: '', trigger: 'status_change', action: 'notify_owner' });

  const triggers: Record<string, string> = {
    status_change: 'عند تغيير حالة الأوردر',
    order_created: 'عند إنشاء أوردر جديد',
    payment_received: 'عند استلام دفعة',
    courier_assigned: 'عند تعيين مندوب',
    order_delayed: 'عند تأخر الأوردر',
  };

  const actions: Record<string, string> = {
    notify_owner: 'إرسال إشعار للمالك',
    notify_courier: 'إرسال إشعار للمندوب',
    log_activity: 'تسجيل في سجل الحركات',
    auto_assign: 'تعيين مندوب تلقائي',
    send_whatsapp: 'إرسال رسالة واتساب',
  };

  useEffect(() => {
    loadSetting('automation_rules').then(v => { if (v) setRules(JSON.parse(v)); });
  }, []);

  const save = async (r: typeof rules) => {
    setRules(r);
    await saveSetting('automation_rules', JSON.stringify(r));
  };

  const add = async () => {
    if (!newRule.name) return;
    await save([...rules, { ...newRule, active: true }]);
    setNewRule({ name: '', trigger: 'status_change', action: 'notify_owner' });
    toast.success('تمت إضافة القاعدة');
  };

  const toggle = async (idx: number) => {
    const updated = rules.map((r, i) => i === idx ? { ...r, active: !r.active } : r);
    await save(updated);
  };

  const remove = async (idx: number) => {
    await save(rules.filter((_, i) => i !== idx));
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4" /> قواعد أتمتة</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">لو حصل X اعمل Y تلقائياً</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Input placeholder="اسم القاعدة" value={newRule.name} onChange={e => setNewRule(p => ({ ...p, name: e.target.value }))} />
          <Select value={newRule.trigger} onValueChange={v => setNewRule(p => ({ ...p, trigger: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(triggers).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={newRule.action} onValueChange={v => setNewRule(p => ({ ...p, action: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(actions).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={add} className="w-full"><Plus className="h-4 w-4 ml-2" /> إضافة قاعدة</Button>
        {rules.length > 0 && (
          <div className="space-y-2">
            {rules.map((r, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded border bg-muted/30">
                <div>
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{triggers[r.trigger]} → {actions[r.action]}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={r.active} onCheckedChange={() => toggle(i)} />
                  <Button variant="ghost" size="sm" onClick={() => remove(i)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============ 4. واجهة API خارجية ============
function APIInterface() {
  const [apiKey, setApiKey] = useState('');
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    loadSetting('api_key').then(v => { if (v) { setApiKey(v); setGenerated(true); } });
  }, []);

  const generateKey = async () => {
    const key = `sk_live_${Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b => b.toString(16).padStart(2, '0')).join('')}`;
    setApiKey(key);
    setGenerated(true);
    await saveSetting('api_key', key);
    toast.success('تم إنشاء مفتاح API');
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Globe className="h-4 w-4" /> واجهة API خارجية</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">اربط السيستم بأنظمة خارجية عبر API</p>
        {generated ? (
          <div className="space-y-2">
            <Label>مفتاح API</Label>
            <div className="flex gap-2">
              <Input value={apiKey} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(apiKey); toast.success('تم النسخ'); }}>نسخ</Button>
            </div>
            <div className="p-3 rounded border bg-muted/30">
              <p className="text-xs font-medium mb-1">نقاط النهاية المتاحة:</p>
              <div className="space-y-1 text-xs text-muted-foreground font-mono">
                <p>GET /api/orders - جلب الأوردرات</p>
                <p>POST /api/orders - إنشاء أوردر</p>
                <p>GET /api/couriers - جلب المناديب</p>
                <p>GET /api/offices - جلب المكاتب</p>
              </div>
            </div>
          </div>
        ) : (
          <Button onClick={generateKey} className="w-full"><Globe className="h-4 w-4 ml-2" /> إنشاء مفتاح API</Button>
        )}
      </CardContent>
    </Card>
  );
}

// ============ 5. تطبيق موبايل ============
function MobileAppInfo() {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Smartphone className="h-4 w-4" /> واجهة الموبايل للمندوب</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">النظام متوافق مع الموبايل بالكامل. يمكن للمندوب:</p>
        <div className="space-y-2">
          {[
            'عرض الأوردرات المسندة إليه',
            'تحديث حالة الأوردر',
            'إضافة ملاحظات على الأوردر',
            'تحديث موقعه الجغرافي',
            'عرض تحصيلاته ورصيده',
            'طلب إجازة',
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded border bg-muted/30">
              <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              <span className="text-sm">{item}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">💡 افتح النظام من متصفح الموبايل وأضفه للشاشة الرئيسية للحصول على تجربة تطبيق كاملة</p>
      </CardContent>
    </Card>
  );
}

// ============ Main ============
export default function CustomizationTab() {
  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CustomDashboard />
        <CustomOrderFields />
      </div>
      <AutomationRules />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <APIInterface />
        <MobileAppInfo />
      </div>
    </div>
  );
}
