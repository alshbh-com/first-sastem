import { themes, useTheme } from '@/hooks/useTheme';
import { Card, CardContent } from '@/components/ui/card';
import { Check } from 'lucide-react';

export default function ThemesPage() {
  const { activeThemeId, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الثيمات</h1>
        <p className="text-sm text-muted-foreground mt-1">اختر ثيم لتغيير مظهر النظام بالكامل</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {themes.map((theme) => {
          const isActive = activeThemeId === theme.id;
          return (
            <Card
              key={theme.id}
              className={`cursor-pointer transition-all hover:scale-105 border-2 ${
                isActive ? 'border-primary ring-2 ring-primary/30' : 'border-border'
              }`}
              onClick={() => setTheme(theme.id)}
            >
              <CardContent className="p-3 space-y-2">
                {/* Color preview */}
                <div
                  className="rounded-md h-16 relative overflow-hidden border border-border/50"
                  style={{ backgroundColor: theme.preview.bg }}
                >
                  {/* Sidebar mock */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1/4 opacity-80"
                    style={{ backgroundColor: theme.preview.accent }}
                  />
                  {/* Primary accent bar */}
                  <div
                    className="absolute left-2 top-2 rounded-sm h-2 w-8"
                    style={{ backgroundColor: theme.preview.primary }}
                  />
                  <div
                    className="absolute left-2 top-6 rounded-sm h-1.5 w-12 opacity-30"
                    style={{ backgroundColor: theme.preview.primary }}
                  />
                  <div
                    className="absolute left-2 bottom-2 rounded-sm h-3 w-6"
                    style={{ backgroundColor: theme.preview.primary }}
                  />
                  {isActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="rounded-full p-1" style={{ backgroundColor: theme.preview.primary }}>
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold truncate">{theme.nameAr}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{theme.name}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
