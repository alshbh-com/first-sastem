import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Users, Shield, Wrench, DollarSign, FileText, Sparkles, Bell, Settings2 } from 'lucide-react';
import AnalyticsTab from '@/components/new-system/AnalyticsTab';
import HRTab from '@/components/new-system/HRTab';
import ToolsTab from '@/components/new-system/ToolsTab';
import SecurityTab from '@/components/new-system/SecurityTab';
import FinanceTab from '@/components/new-system/FinanceTab';
import ReportsTab from '@/components/new-system/ReportsTab';
import UXTab from '@/components/new-system/UXTab';
import NotificationsTab from '@/components/new-system/NotificationsTab';
import CustomizationTab from '@/components/new-system/CustomizationTab';

const tabs = [
  { value: 'analytics', label: 'التحليلات', icon: BarChart3 },
  { value: 'hr', label: 'إدارة المندوبين', icon: Users },
  { value: 'tools', label: 'أدوات تشغيلية', icon: Wrench },
  { value: 'security', label: 'أمان وصلاحيات', icon: Shield },
  { value: 'finance', label: 'مالي متقدم', icon: DollarSign },
  { value: 'reports', label: 'تقارير ومستندات', icon: FileText },
  { value: 'ux', label: 'تجربة المستخدم', icon: Sparkles },
  { value: 'notifications', label: 'إشعارات وتواصل', icon: Bell },
  { value: 'customization', label: 'تخصيص', icon: Settings2 },
];

export default function NewSystem() {
  return (
    <div className="space-y-4" dir="rtl">
      <h1 className="text-2xl font-bold text-foreground">السيستم الجديد</h1>
      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {tabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1.5 text-xs sm:text-sm px-2 py-1.5">
              <tab.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="analytics"><AnalyticsTab /></TabsContent>
        <TabsContent value="hr"><HRTab /></TabsContent>
        <TabsContent value="tools"><ToolsTab /></TabsContent>
        <TabsContent value="security"><SecurityTab /></TabsContent>
        <TabsContent value="finance"><FinanceTab /></TabsContent>
        <TabsContent value="reports"><ReportsTab /></TabsContent>
        <TabsContent value="ux"><UXTab /></TabsContent>
        <TabsContent value="notifications"><NotificationsTab /></TabsContent>
        <TabsContent value="customization"><CustomizationTab /></TabsContent>
      </Tabs>
    </div>
  );
}
