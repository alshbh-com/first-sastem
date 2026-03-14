import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Clock, Loader2, AlertTriangle } from 'lucide-react';

export default function OrderAction() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const action = searchParams.get('action');

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !action) {
      setError('رابط غير صالح');
      setLoading(false);
      return;
    }

    const processAction = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('order-action', {
          body: null,
          headers: {},
        });

        // Use fetch directly since we need query params
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'qmfzhdbdkrlkkunefcsv';
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/order-action?token=${token}&action=${action}`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }
        );

        const json = await res.json();
        if (!res.ok) {
          setError(json.error || 'حدث خطأ');
        } else {
          setResult(json);
        }
      } catch (err: any) {
        setError('حدث خطأ في الاتصال');
      } finally {
        setLoading(false);
      }
    };

    processAction();
  }, [token, action]);

  const icons: Record<string, any> = {
    confirm: <CheckCircle className="h-20 w-20 text-green-500" />,
    cancel: <XCircle className="h-20 w-20 text-red-500" />,
    delay: <Clock className="h-20 w-20 text-yellow-500" />,
  };

  const bgColors: Record<string, string> = {
    confirm: 'from-green-50 to-green-100',
    cancel: 'from-red-50 to-red-100',
    delay: 'from-yellow-50 to-yellow-100',
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${bgColors[action || ''] || 'from-gray-50 to-gray-100'} p-4`} dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-6">
        {/* Logo/Brand */}
        <h1 className="text-2xl font-bold text-gray-800">FIRST</h1>
        <p className="text-sm text-gray-500">نظام الشحن</p>

        {loading ? (
          <div className="py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-500" />
            <p className="text-gray-600">جاري معالجة طلبك...</p>
          </div>
        ) : error ? (
          <div className="py-8 space-y-4">
            <AlertTriangle className="h-16 w-16 text-red-400 mx-auto" />
            <p className="text-lg font-medium text-red-600">{error}</p>
          </div>
        ) : result ? (
          <div className="py-6 space-y-4">
            <div className="flex justify-center">
              {icons[action || ''] || icons.confirm}
            </div>
            <p className="text-lg font-medium text-gray-800">{result.message}</p>
            {result.order && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm text-gray-600">
                <p>رقم الطلب: <strong>{result.order.tracking_id}</strong></p>
                <p>العميل: <strong>{result.order.customer_name}</strong></p>
              </div>
            )}
            {!result.success && result.current_status && (
              <p className="text-sm text-orange-600">
                الحالة الحالية: {result.current_status === 'confirmed' ? 'تم التأكيد' : result.current_status === 'cancelled' ? 'تم الإلغاء' : result.current_status === 'delayed' ? 'تم التأجيل' : result.current_status}
              </p>
            )}
          </div>
        ) : null}

        <p className="text-xs text-gray-400 pt-4">
          © {new Date().getFullYear()} FIRST Shipping System
        </p>
      </div>
    </div>
  );
}
