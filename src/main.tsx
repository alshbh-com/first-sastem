import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { supabase } from "./integrations/supabase/client";
import { themes, applyTheme } from "./hooks/useTheme";

// Apply saved theme before render
(async () => {
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'active_theme')
      .maybeSingle();
    if (data?.value) {
      const theme = themes.find(t => t.id === data.value);
      if (theme) applyTheme(theme);
    }
  } catch {}
})();

createRoot(document.getElementById("root")!).render(<App />);
