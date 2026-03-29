import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sparkles, Moon, Keyboard, Home, Bookmark, Clock, Maximize, Save, HelpCircle, Bell, Sun, Trash2, Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

const saveSetting = async (key: string, value: string) => {
  await supabase.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
};
const loadSetting = async (key: string): Promise<string | null> => {
  const { data } = await supabase.from('app_settings').select('value').eq('key', key).maybeSingle();
  return data?.value || null;
};

// ============ 1. الوضع المظلم/الفاتح ============
function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = localStorage.getItem('user-theme') || 'light';
    setTheme(saved as any);
    document.documentElement.classList.toggle('dark', saved === 'dark');
  }, []);

  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('user-theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    toast.success(next === 'dark' ? 'تم تفعيل الوضع المظلم' : 'تم تفعيل الوضع الفاتح');
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2">{theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />} وضع مظلم / فاتح</CardTitle></CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <span className="text-sm">الوضع الحالي: <Badge>{theme === 'dark' ? 'مظلم' : 'فاتح'}</Badge></span>
          <Switch checked={theme === 'dark'} onCheckedChange={toggle} />
        </div>
      </CardContent>
    </Card>
  );
}

// ============ 2. اختصارات لوحة المفاتيح ============
function KeyboardShortcuts() {
  const shortcuts = [
    { keys: 'Ctrl + N', action: 'أوردر جديد', path: '/orders' },
    { keys: 'Ctrl + F', action: 'بحث شامل', path: '/global-search' },
    { keys: 'Ctrl + D', action: 'لوحة التحكم', path: '/dashboard' },
    { keys: 'Ctrl + M', action: 'المناديب', path: '/couriers' },
    { keys: 'Ctrl + O', action: 'المكاتب', path: '/offices' },
    { keys: 'Ctrl + S', action: 'الإعدادات', path: '/settings' },
  ];

  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      const map: Record<string, string> = { n: '/orders', f: '/global-search', d: '/dashboard', m: '/couriers', o: '/offices', s: '/settings' };
      const path = map[e.key.toLowerCase()];
      if (path) { e.preventDefault(); window.location.href = path; }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled]);

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Keyboard className="h-4 w-4" /> اختصارات لوحة المفاتيح</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm">تفعيل الاختصارات</span>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
        <div className="space-y-2">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded border bg-muted/30">
              <span className="text-sm">{s.action}</span>
              <Badge variant="outline" className="font-mono text-xs">{s.keys}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============ 3. صفحة بداية مخصصة ============
function CustomHomePage() {
  const [homePage, setHomePage] = useState('/dashboard');
  const pages = [
    { value: '/dashboard', label: 'لوحة التحكم' },
    { value: '/orders', label: 'الأوردرات' },
    { value: '/couriers', label: 'المناديب' },
    { value: '/offices', label: 'المكاتب' },
    { value: '/closed-orders', label: 'أوردرات مقفلة' },
    { value: '/new-system', label: 'السيستم الجديد' },
  ];

  useEffect(() => {
    const saved = localStorage.getItem('user-home-page');
    if (saved) setHomePage(saved);
  }, []);

  const save = () => {
    localStorage.setItem('user-home-page', homePage);
    toast.success('تم حفظ الصفحة الرئيسية');
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Home className="h-4 w-4" /> صفحة بداية مخصصة</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Select value={homePage} onValueChange={setHomePage}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{pages.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={save} size="sm" className="w-full"><Save className="h-4 w-4 ml-2" /> حفظ</Button>
      </CardContent>
    </Card>
  );
}

// ============ 4. إشارات مرجعية للأوردرات ============
function OrderBookmarks() {
  const [bookmarks, setBookmarks] = useState<{ trackingId: string; note: string; date: string }[]>([]);
  const [newTracking, setNewTracking] = useState('');
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('order-bookmarks');
    if (saved) setBookmarks(JSON.parse(saved));
  }, []);

  const saveBookmarks = (bm: typeof bookmarks) => {
    setBookmarks(bm);
    localStorage.setItem('order-bookmarks', JSON.stringify(bm));
  };

  const add = () => {
    if (!newTracking) return;
    const updated = [...bookmarks, { trackingId: newTracking, note: newNote, date: format(new Date(), 'yyyy-MM-dd HH:mm') }];
    saveBookmarks(updated);
    setNewTracking(''); setNewNote('');
    toast.success('تمت الإضافة');
  };

  const remove = (idx: number) => {
    saveBookmarks(bookmarks.filter((_, i) => i !== idx));
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Bookmark className="h-4 w-4" /> إشارات مرجعية للأوردرات</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input placeholder="رقم التتبع" value={newTracking} onChange={e => setNewTracking(e.target.value)} className="flex-1" />
          <Input placeholder="ملاحظة" value={newNote} onChange={e => setNewNote(e.target.value)} className="flex-1" />
          <Button size="sm" onClick={add}><Plus className="h-4 w-4" /></Button>
        </div>
        {bookmarks.length > 0 && (
          <div className="space-y-2 max-h-[200px] overflow-auto">
            {bookmarks.map((b, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded border bg-muted/30">
                <div>
                  <p className="text-sm font-medium">{b.trackingId}</p>
                  <p className="text-xs text-muted-foreground">{b.note} • {b.date}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => remove(i)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            ))}
          </div>
        )}
        {bookmarks.length === 0 && <p className="text-center text-xs text-muted-foreground">لا توجد إشارات مرجعية</p>}
      </CardContent>
    </Card>
  );
}

// ============ 5. آخر 10 حركات ============
function RecentActivity() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('activity_logs').select('action, details, created_at')
      .order('created_at', { ascending: false }).limit(10)
      .then(({ data }) => setLogs(data || []));
  }, []);

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" /> آخر 10 حركات</CardTitle></CardHeader>
      <CardContent>
        {logs.length > 0 ? (
          <div className="space-y-2 max-h-[250px] overflow-auto">
            {logs.map((log, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded border bg-muted/30">
                <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                <div>
                  <p className="text-sm">{log.action}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(log.created_at), 'MM/dd HH:mm')}</p>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-center text-xs text-muted-foreground">لا توجد حركات</p>}
      </CardContent>
    </Card>
  );
}

// ============ 6. حفظ إعدادات الفلاتر المفضلة ============
function SavedFilters() {
  const [filters, setFilters] = useState<{ name: string; config: string; date: string }[]>([]);
  const [filterName, setFilterName] = useState('');
  const [filterConfig, setFilterConfig] = useState('');

  useEffect(() => {
    loadSetting('saved_filters').then(v => { if (v) setFilters(JSON.parse(v)); });
  }, []);

  const saveFilters = async (f: typeof filters) => {
    setFilters(f);
    await saveSetting('saved_filters', JSON.stringify(f));
  };

  const add = async () => {
    if (!filterName) return;
    const updated = [...filters, { name: filterName, config: filterConfig || 'فلتر مخصص', date: format(new Date(), 'yyyy-MM-dd') }];
    await saveFilters(updated);
    setFilterName(''); setFilterConfig('');
    toast.success('تم حفظ الفلتر');
  };

  const remove = async (idx: number) => {
    await saveFilters(filters.filter((_, i) => i !== idx));
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Save className="h-4 w-4" /> فلاتر محفوظة</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input placeholder="اسم الفلتر" value={filterName} onChange={e => setFilterName(e.target.value)} className="flex-1" />
          <Input placeholder="وصف (اختياري)" value={filterConfig} onChange={e => setFilterConfig(e.target.value)} className="flex-1" />
          <Button size="sm" onClick={add}><Plus className="h-4 w-4" /></Button>
        </div>
        {filters.length > 0 && (
          <div className="space-y-2">
            {filters.map((f, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded border bg-muted/30">
                <div>
                  <p className="text-sm font-medium">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{f.config} • {f.date}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => remove(i)}><X className="h-3 w-3" /></Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============ 7. نظام مساعدة داخلي ============
function InternalHelp() {
  const helpItems = [
    { section: 'الأوردرات', desc: 'إدارة جميع الأوردرات، إضافة وتعديل وحذف، تغيير الحالات وتعيين المناديب' },
    { section: 'المناديب', desc: 'إدارة بيانات المناديب، الرواتب، السلف، المكافآت، والتحصيلات' },
    { section: 'المكاتب', desc: 'إدارة المكاتب المتعاونة، الحسابات، اليوميات، والمدفوعات' },
    { section: 'سيستم الحسابات', desc: 'إدارة اليوميات المالية لكل مكتب، الشيت المالي والبرتقالي' },
    { section: 'أسعار التوصيل', desc: 'تحديد أسعار التوصيل حسب المحافظة لكل مكتب أو بشكل عام' },
    { section: 'السيستم الجديد', desc: 'ميزات متقدمة: تحليلات، أمان، مالي، تقارير، وأكثر' },
    { section: 'سجل الحركات', desc: 'تتبع جميع العمليات التي تتم في النظام مع التفاصيل' },
    { section: 'الإعدادات', desc: 'إدارة المستخدمين، الصلاحيات، الحالات، وإعدادات النظام' },
  ];

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><HelpCircle className="h-4 w-4" /> دليل المساعدة</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[300px] overflow-auto">
          {helpItems.map((item, i) => (
            <div key={i} className="p-3 rounded-lg border bg-muted/30">
              <p className="text-sm font-medium text-primary">{item.section}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============ 8. صفحة ما الجديد ============
function WhatsNew() {
  const updates = [
    { date: '2025-06', title: 'السيستم الجديد', desc: 'إضافة أكثر من 100 ميزة جديدة في 10 تبويبات' },
    { date: '2025-06', title: 'نظام الفروع', desc: 'إمكانية إضافة فروع وتسجيل أوردرات بنظام موافقات' },
    { date: '2025-06', title: 'حالة المرتجع', desc: 'إضافة عمود حالة المرتجع في الأوردرات المقفلة' },
    { date: '2025-05', title: 'قوائم أسعار متعددة', desc: 'إنشاء قوائم أسعار عامة متعددة مع طباعة PDF' },
    { date: '2025-05', title: 'سلة المحذوفات', desc: 'حذف اليوميات إلى سلة المحذوفات مع حذف تلقائي بعد شهرين' },
    { date: '2025-04', title: 'تتبع المناديب', desc: 'خريطة حية لتتبع مواقع المناديب' },
  ];

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Bell className="h-4 w-4" /> ما الجديد؟</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[300px] overflow-auto">
          {updates.map((u, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-lg border bg-muted/30">
              <Badge variant="outline" className="shrink-0 text-xs">{u.date}</Badge>
              <div>
                <p className="text-sm font-medium">{u.title}</p>
                <p className="text-xs text-muted-foreground">{u.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============ Main ============
export default function UXTab() {
  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ThemeToggle />
        <CustomHomePage />
      </div>
      <KeyboardShortcuts />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <OrderBookmarks />
        <SavedFilters />
      </div>
      <RecentActivity />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <InternalHelp />
        <WhatsNew />
      </div>
    </div>
  );
}
