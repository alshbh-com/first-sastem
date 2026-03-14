import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { openWhatsApp } from '@/lib/whatsappMessage';
import { MessageSquare, RefreshCw, Send, Search, Settings2, Wifi, WifiOff, Phone, ExternalLink, Link2 } from 'lucide-react';
import { toast } from 'sonner';

interface WhatsAppMessage {
  id: string;
  order_id: string;
  phone: string;
  message_text: string;
  status: string;
  sent_at: string | null;
  created_at: string;
  order?: {
    tracking_id: string;
    customer_name: string;
    confirmation_status: string;
    product_name: string;
    price: number;
  };
}

export default function WhatsAppMessages() {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirmationFilter, setConfirmationFilter] = useState('all');
  const [serverUrl, setServerUrl] = useState('');
  const [savedServerUrl, setSavedServerUrl] = useState('');
  const [serverStatus, setServerStatus] = useState<'unknown' | 'connected' | 'connecting' | 'disconnected' | 'pairing_code_ready' | 'waiting_for_pairing'>('unknown');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pairingOpen, setPairingOpen] = useState(false);
  const [savingUrl, setSavingUrl] = useState(false);
  const [statusDetails, setStatusDetails] = useState<{ rawStatus?: string; lastDisconnectReason?: string | number | null; queueLength?: number; pairingCode?: string | null }>({});
  const [pairingPhone, setPairingPhone] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [requestingCode, setRequestingCode] = useState(false);
  const statusCheckRef = useRef(0);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select(`
        *,
        order:orders!order_id (
          tracking_id,
          customer_name,
          confirmation_status,
          product_name,
          price
        )
      `)
      .order('created_at', { ascending: false })
      .limit(200);

    if (!error && data) setMessages(data as any);
    setLoading(false);
  };

  const fetchServerUrl = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'whatsapp_server_url')
      .maybeSingle();
    if (data?.value) {
      setServerUrl(data.value);
      setSavedServerUrl(data.value);
      checkServerStatus(data.value);
    }
  };

  const checkServerStatus = async (url?: string) => {
    const checkUrl = (url || savedServerUrl).replace(/\/+$/, '');
    const requestId = ++statusCheckRef.current;

    if (!checkUrl) {
      setServerStatus('unknown');
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 7000);
      const statusResponse = await fetch(`${checkUrl}/status`, { signal: controller.signal });
      window.clearTimeout(timeoutId);

      if (!statusResponse.ok) throw new Error(`http_${statusResponse.status}`);

      const statusData = await statusResponse.json();
      if (requestId !== statusCheckRef.current) return;

      setStatusDetails({
        rawStatus: statusData.status,
        lastDisconnectReason: statusData.lastDisconnectReason,
        queueLength: statusData.queueLength,
        pairingCode: statusData.pairingCode,
      });

      if (statusData.connected) {
        setServerStatus('connected');
        setPairingCode(null);
        return;
      }

      // Keep pairing code from server OR from local state
      if (statusData.pairingCode) {
        setServerStatus('pairing_code_ready');
        setPairingCode(statusData.pairingCode);
        return;
      }

      // If we have a local pairing code and server is in pairing/reconnecting mode, keep showing it
      if (pairingCode && ['waiting_for_pairing', 'reconnecting', 'connecting', 'pairing_code_ready'].includes(statusData.status)) {
        setServerStatus('pairing_code_ready');
        return;
      }

      if (['connecting', 'reconnecting', 'waiting_for_pairing'].includes(statusData.status)) {
        // If we had a pairing code, keep showing it
        if (pairingCode) {
          setServerStatus('pairing_code_ready');
          return;
        }
        setServerStatus('connecting');
        return;
      }

      setServerStatus('disconnected');
    } catch {
      if (requestId !== statusCheckRef.current) return;
      // Don't mark as disconnected if we have a pairing code
      if (pairingCode) {
        setServerStatus('pairing_code_ready');
        return;
      }
      setServerStatus('disconnected');
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchServerUrl();
  }, []);

  useEffect(() => {
    if (!savedServerUrl) return;
    const intervalMs = serverStatus === 'connected' ? 15000 : 5000;
    const interval = setInterval(() => checkServerStatus(), intervalMs);
    return () => clearInterval(interval);
  }, [serverStatus, savedServerUrl]);

  const saveServerUrl = async () => {
    setSavingUrl(true);
    const cleanUrl = serverUrl.replace(/\/+$/, '');
    await supabase.from('app_settings').upsert(
      { key: 'whatsapp_server_url', value: cleanUrl },
      { onConflict: 'key' }
    );
    setSavedServerUrl(cleanUrl);
    setServerUrl(cleanUrl);
    toast.success('تم حفظ رابط السيرفر');
    checkServerStatus(cleanUrl);
    setSavingUrl(false);
    setSettingsOpen(false);
  };

  const requestPairingCode = async () => {
    if (!pairingPhone.trim() || !savedServerUrl) return;
    setRequestingCode(true);
    setPairingCode(null);

    try {
      const res = await fetch(`${savedServerUrl}/request-pairing-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: pairingPhone.trim() }),
      });
      const data = await res.json();

      if (data.alreadyConnected) {
        toast.success('واتساب متصل بالفعل!');
        setServerStatus('connected');
        setPairingOpen(false);
      } else if (data.success && data.code) {
        setPairingCode(data.code);
        setServerStatus('pairing_code_ready');
        toast.success('تم توليد كود الربط! أدخله في واتساب');
      } else {
        toast.error(data.error || 'فشل في توليد الكود');
      }
    } catch {
      toast.error('فشل الاتصال بالسيرفر');
    }
    setRequestingCode(false);
  };

  const handleResetSession = async () => {
    if (!savedServerUrl) return;
    try {
      await fetch(`${savedServerUrl}/reset-session`, { method: 'POST' });
      toast.success('تم إعادة تعيين الجلسة');
      setPairingCode(null);
      checkServerStatus();
    } catch {
      toast.error('فشل الاتصال بالسيرفر');
    }
  };

  const filteredMessages = messages.filter(msg => {
    if (search) {
      const s = search.toLowerCase();
      if (!msg.phone.includes(search) &&
          !msg.order?.customer_name?.toLowerCase().includes(s) &&
          !msg.order?.tracking_id?.toLowerCase().includes(s)) return false;
    }
    if (confirmationFilter !== 'all' && msg.order?.confirmation_status !== confirmationFilter) return false;
    return true;
  });

  const stats = {
    total: messages.length,
    sent: messages.filter(m => m.status === 'sent').length,
    confirmed: messages.filter(m => m.order?.confirmation_status === 'confirmed').length,
    cancelled: messages.filter(m => m.order?.confirmation_status === 'cancelled').length,
    delayed: messages.filter(m => m.order?.confirmation_status === 'delayed').length,
    awaiting: messages.filter(m => ['awaiting_confirmation', 'none'].includes(m.order?.confirmation_status || '')).length,
  };

  const confirmBadge = (status?: string) => {
    switch (status) {
      case 'confirmed': return <Badge className="bg-green-100 text-green-800 border-green-300">✅ مؤكد</Badge>;
      case 'cancelled': return <Badge className="bg-red-100 text-red-800 border-red-300">❌ ملغي</Badge>;
      case 'delayed': return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">⏳ مؤجل</Badge>;
      case 'awaiting_confirmation': return <Badge className="bg-blue-100 text-blue-800 border-blue-300">⏳ بانتظار</Badge>;
      default: return <Badge variant="secondary">بدون رد</Badge>;
    }
  };

  const handleResend = async (msg: WhatsAppMessage) => {
    if (!savedServerUrl) {
      openWhatsApp(msg.phone, msg.message_text);
      return;
    }
    try {
      const res = await fetch(`${savedServerUrl}/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: msg.phone, message: msg.message_text }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('تم إعادة الإرسال بنجاح');
      } else {
        toast.error('فشل: ' + (data.error || 'خطأ'));
      }
    } catch {
      toast.error('فشل الاتصال بالسيرفر');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            رسائل واتساب
          </h1>
          <p className="text-sm text-muted-foreground mt-1">إرسال تلقائي + تتبع تأكيد الطلبات</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="h-4 w-4 ml-2" />
                إعدادات السيرفر
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>إعدادات سيرفر واتساب</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>رابط السيرفر</Label>
                  <Input
                    className="bg-secondary border-border"
                    placeholder="https://whatsapp-bot-xxxx.up.railway.app"
                    value={serverUrl}
                    onChange={e => setServerUrl(e.target.value)}
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground">
                    الصق هنا رابط سيرفر واتساب اللي نشرته على Railway
                  </p>
                </div>
                <Button onClick={saveServerUrl} disabled={savingUrl} className="w-full">
                  {savingUrl ? 'جاري الحفظ...' : 'حفظ'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={() => { fetchMessages(); checkServerStatus(); }} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>
      </div>

      {/* Server Status Card */}
      <Card className={`border-2 ${
        serverStatus === 'connected' ? 'border-green-500/50 bg-green-500/5' :
        serverStatus === 'pairing_code_ready' ? 'border-blue-500/50 bg-blue-500/5' :
        serverStatus === 'connecting' ? 'border-border bg-muted/40' :
        savedServerUrl ? 'border-red-500/50 bg-red-500/5' :
        'border-yellow-500/50 bg-yellow-500/5'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              {serverStatus === 'connected' ? (
                <Wifi className="h-6 w-6 text-green-500" />
              ) : serverStatus === 'pairing_code_ready' ? (
                <Link2 className="h-6 w-6 text-blue-500" />
              ) : serverStatus === 'connecting' ? (
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <WifiOff className="h-6 w-6 text-red-500" />
              )}
              <div>
                <p className="font-bold">
                  {serverStatus === 'connected' ? '✅ واتساب متصل ويعمل تلقائياً' :
                   serverStatus === 'pairing_code_ready' ? '📱 أدخل كود الربط في واتساب' :
                   serverStatus === 'connecting' ? '⏳ جاري الاتصال...' :
                   !savedServerUrl ? '⚠️ السيرفر غير مُعد - اضغط إعدادات السيرفر' :
                   '❌ السيرفر غير متصل'}
                </p>
                {savedServerUrl && (
                  <p className="text-xs text-muted-foreground" dir="ltr">{savedServerUrl}</p>
                )}
                {statusDetails.rawStatus && (
                  <p className="text-xs text-muted-foreground mt-1">الحالة: {statusDetails.rawStatus}</p>
                )}
              </div>
            </div>
            {savedServerUrl && (
              <div className="flex gap-2 flex-wrap">
                {/* Pairing Code Button */}
                <Dialog open={pairingOpen} onOpenChange={setPairingOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant={serverStatus === 'connected' ? 'outline' : 'default'}>
                      <Link2 className="h-3 w-3 ml-1" />
                      ربط بكود الهاتف
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border max-w-md">
                    <DialogHeader>
                      <DialogTitle>ربط واتساب بكود الهاتف</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>رقم الهاتف (مع كود الدولة)</Label>
                        <Input
                          className="bg-secondary border-border text-lg tracking-wider"
                          placeholder="20XXXXXXXXXX"
                          value={pairingPhone}
                          onChange={e => setPairingPhone(e.target.value)}
                          dir="ltr"
                        />
                        <p className="text-xs text-muted-foreground">
                          مثال: 201012345678 (مصر) - بدون + أو 00
                        </p>
                      </div>

                      <Button
                        onClick={requestPairingCode}
                        disabled={requestingCode || !pairingPhone.trim()}
                        className="w-full"
                      >
                        {requestingCode ? (
                          <>
                            <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                            جاري التوليد...
                          </>
                        ) : 'توليد كود الربط'}
                      </Button>

                      {/* Show Pairing Code */}
                      {pairingCode && (
                        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-center space-y-3">
                          <p className="text-sm font-medium">كود الربط الخاص بك:</p>
                          <p className="text-4xl font-bold tracking-[0.5em] text-blue-500" dir="ltr">
                            {pairingCode}
                          </p>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>1. افتح واتساب على هاتفك</p>
                            <p>2. اذهب إلى الإعدادات ← الأجهزة المرتبطة</p>
                            <p>3. اضغط "ربط جهاز"</p>
                            <p>4. اضغط "الربط برقم الهاتف بدلاً من ذلك"</p>
                            <p>5. أدخل الكود أعلاه</p>
                          </div>
                        </div>
                      )}

                      {serverStatus === 'connected' && (
                        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                          <p className="text-sm font-bold text-green-500">✅ تم الربط بنجاح!</p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={handleResetSession}>
                          إعادة تعيين الجلسة
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => checkServerStatus()}>
                          فحص الاتصال
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button size="sm" variant="outline" onClick={() => window.open(`${savedServerUrl}/qr`, '_blank')}>
                  <ExternalLink className="h-3 w-3 ml-1" />
                  فتح صفحة السيرفر
                </Button>
                <Button size="sm" variant="outline" onClick={() => checkServerStatus()}>
                  فحص الاتصال
                </Button>
              </div>
            )}
          </div>

          {/* Inline Pairing Code Display */}
          {serverStatus === 'pairing_code_ready' && pairingCode && !pairingOpen && (
            <div className="mt-4 flex flex-col items-center gap-3 p-4 bg-card rounded-lg border">
              <p className="text-sm font-medium">أدخل هذا الكود في واتساب: الإعدادات ← الأجهزة المرتبطة ← ربط جهاز ← الربط برقم الهاتف</p>
              <p className="text-4xl font-bold tracking-[0.5em] text-blue-500" dir="ltr">{pairingCode}</p>
              <p className="text-xs text-muted-foreground">يتم فحص الاتصال تلقائياً...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: 'الإجمالي', value: stats.total, color: '' },
          { label: 'مُرسل', value: stats.sent, color: 'text-blue-500' },
          { label: 'مؤكد', value: stats.confirmed, color: 'text-green-500' },
          { label: 'ملغي', value: stats.cancelled, color: 'text-red-500' },
          { label: 'مؤجل', value: stats.delayed, color: 'text-yellow-500' },
          { label: 'بانتظار', value: stats.awaiting, color: 'text-orange-500' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pr-10 bg-secondary border-border" placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={confirmationFilter} onValueChange={setConfirmationFilter}>
          <SelectTrigger className="w-[150px] bg-secondary border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="awaiting_confirmation">بانتظار</SelectItem>
            <SelectItem value="confirmed">مؤكد</SelectItem>
            <SelectItem value="cancelled">ملغي</SelectItem>
            <SelectItem value="delayed">مؤجل</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Messages Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم التتبع</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>الهاتف</TableHead>
                <TableHead>المنتج</TableHead>
                <TableHead>السعر</TableHead>
                <TableHead>حالة التأكيد</TableHead>
                <TableHead>الوقت</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">جاري التحميل...</TableCell></TableRow>
              ) : filteredMessages.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">لا توجد رسائل</TableCell></TableRow>
              ) : (
                filteredMessages.map(msg => (
                  <TableRow key={msg.id}>
                    <TableCell className="font-mono text-xs">{msg.order?.tracking_id || '-'}</TableCell>
                    <TableCell className="font-medium">{msg.order?.customer_name || '-'}</TableCell>
                    <TableCell dir="ltr" className="text-sm">{msg.phone}</TableCell>
                    <TableCell className="text-sm">{msg.order?.product_name || '-'}</TableCell>
                    <TableCell className="text-sm">{msg.order?.price || 0}</TableCell>
                    <TableCell>{confirmBadge(msg.order?.confirmation_status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {msg.created_at ? new Date(msg.created_at).toLocaleString('ar-LY') : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleResend(msg)} title="إعادة إرسال">
                          <Send className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => window.open(`tel:${msg.phone}`, '_self')} title="اتصال">
                          <Phone className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Setup Guide */}
      {!savedServerUrl && (
        <Card className="border-dashed border-2 border-primary/30">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-bold">🚀 دليل الإعداد السريع</h3>
            <ol className="space-y-3 text-sm list-decimal list-inside">
              <li className="leading-relaxed">
                <strong>أنشئ حساب GitHub</strong> - ارفع ملفات مجلد <code className="bg-secondary px-1 rounded">whatsapp-bot</code>
              </li>
              <li className="leading-relaxed">
                <strong>انشر على Railway</strong> - افتح <a href="https://railway.app" target="_blank" className="text-primary underline">railway.app</a> ← New Project ← Deploy from GitHub
              </li>
              <li className="leading-relaxed">
                <strong>الصق الرابط</strong> - انسخ رابط Railway والصقه في "إعدادات السيرفر"
              </li>
              <li className="leading-relaxed">
                <strong>اربط بكود الهاتف</strong> - اضغط "ربط بكود الهاتف" وأدخل رقمك
              </li>
            </ol>
            <p className="text-xs text-muted-foreground">بعد الإعداد، كل أوردر جديد هيروح رسالة واتساب تلقائياً للعميل! 🎉</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
