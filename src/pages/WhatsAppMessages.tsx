import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { openWhatsApp } from '@/lib/whatsappMessage';
import { MessageSquare, RefreshCw, Send, Search, CheckCircle, XCircle, Clock, AlertTriangle, Phone } from 'lucide-react';
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
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmationFilter, setConfirmationFilter] = useState('all');

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

    if (!error && data) {
      setMessages(data as any);
    }
    setLoading(false);
  };

  useEffect(() => { fetchMessages(); }, []);

  const filteredMessages = messages.filter(msg => {
    if (search) {
      const s = search.toLowerCase();
      const matchesPhone = msg.phone.includes(search);
      const matchesName = msg.order?.customer_name?.toLowerCase().includes(s);
      const matchesTracking = msg.order?.tracking_id?.toLowerCase().includes(s);
      if (!matchesPhone && !matchesName && !matchesTracking) return false;
    }
    if (statusFilter !== 'all' && msg.status !== statusFilter) return false;
    if (confirmationFilter !== 'all' && msg.order?.confirmation_status !== confirmationFilter) return false;
    return true;
  });

  const stats = {
    total: messages.length,
    sent: messages.filter(m => m.status === 'sent').length,
    confirmed: messages.filter(m => m.order?.confirmation_status === 'confirmed').length,
    cancelled: messages.filter(m => m.order?.confirmation_status === 'cancelled').length,
    delayed: messages.filter(m => m.order?.confirmation_status === 'delayed').length,
    awaiting: messages.filter(m => m.order?.confirmation_status === 'awaiting_confirmation' || m.order?.confirmation_status === 'none').length,
  };

  const confirmationStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'confirmed': return <Badge className="bg-green-100 text-green-800 border-green-300">✅ مؤكد</Badge>;
      case 'cancelled': return <Badge className="bg-red-100 text-red-800 border-red-300">❌ ملغي</Badge>;
      case 'delayed': return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">⏳ مؤجل</Badge>;
      case 'awaiting_confirmation': return <Badge className="bg-blue-100 text-blue-800 border-blue-300">⏳ بانتظار</Badge>;
      default: return <Badge variant="secondary">بدون رد</Badge>;
    }
  };

  const handleResend = (msg: WhatsAppMessage) => {
    openWhatsApp(msg.phone, msg.message_text);
    toast.success('تم فتح واتساب لإعادة الإرسال');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            رسائل واتساب
          </h1>
          <p className="text-sm text-muted-foreground mt-1">تتبع رسائل تأكيد الطلبات المرسلة للعملاء</p>
        </div>
        <Button variant="outline" onClick={fetchMessages} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">إجمالي الرسائل</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.sent}</p>
            <p className="text-xs text-muted-foreground">تم الإرسال</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
            <p className="text-xs text-muted-foreground">مؤكد</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
            <p className="text-xs text-muted-foreground">ملغي</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.delayed}</p>
            <p className="text-xs text-muted-foreground">مؤجل</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-orange-600">{stats.awaiting}</p>
            <p className="text-xs text-muted-foreground">بانتظار الرد</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pr-10 bg-secondary border-border"
            placeholder="بحث برقم الهاتف أو اسم العميل أو رقم التتبع..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={confirmationFilter} onValueChange={setConfirmationFilter}>
          <SelectTrigger className="w-[160px] bg-secondary border-border">
            <SelectValue placeholder="حالة التأكيد" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="awaiting_confirmation">بانتظار</SelectItem>
            <SelectItem value="confirmed">مؤكد</SelectItem>
            <SelectItem value="cancelled">ملغي</SelectItem>
            <SelectItem value="delayed">مؤجل</SelectItem>
            <SelectItem value="none">بدون رد</SelectItem>
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
                <TableHead>وقت الإرسال</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : filteredMessages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    لا توجد رسائل
                  </TableCell>
                </TableRow>
              ) : (
                filteredMessages.map(msg => (
                  <TableRow key={msg.id}>
                    <TableCell className="font-mono text-xs">{msg.order?.tracking_id || '-'}</TableCell>
                    <TableCell className="font-medium">{msg.order?.customer_name || '-'}</TableCell>
                    <TableCell dir="ltr" className="text-sm">{msg.phone}</TableCell>
                    <TableCell className="text-sm">{msg.order?.product_name || '-'}</TableCell>
                    <TableCell className="text-sm">{msg.order?.price || 0}</TableCell>
                    <TableCell>{confirmationStatusBadge(msg.order?.confirmation_status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {msg.sent_at ? new Date(msg.sent_at).toLocaleString('ar-LY') : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResend(msg)}
                          title="إعادة إرسال"
                        >
                          <Send className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`tel:${msg.phone}`, '_self')}
                          title="اتصال"
                        >
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

      {/* Info Box */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-4">
          <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            كيف يعمل النظام؟
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>عند إنشاء أوردر جديد، يفتح واتساب تلقائياً برسالة جاهزة للعميل</li>
            <li>الرسالة تحتوي على روابط تأكيد/إلغاء/تأجيل</li>
            <li>عند ضغط العميل على أي رابط، تتحدث حالة الأوردر تلقائياً</li>
            <li>يمكنك إعادة إرسال الرسالة من هذه الصفحة</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
