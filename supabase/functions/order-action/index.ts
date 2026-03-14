import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const action = url.searchParams.get("action");

    if (!token || !action) {
      return new Response(
        JSON.stringify({ error: "Missing token or action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validActions: Record<string, string> = {
      confirm: "confirmed",
      cancel: "cancelled",
      delay: "delayed",
    };

    const newStatus = validActions[action];
    if (!newStatus) {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find order by confirmation token
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, confirmation_status, customer_name, product_name, tracking_id")
      .eq("confirmation_token", token)
      .single();

    if (fetchError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already actioned
    if (order.confirmation_status !== "none" && order.confirmation_status !== "awaiting_confirmation") {
      return new Response(
        JSON.stringify({
          success: false,
          message: "تم اتخاذ إجراء على هذا الطلب مسبقاً",
          current_status: order.confirmation_status,
          order: { tracking_id: order.tracking_id, customer_name: order.customer_name },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update confirmation status
    const { error: updateError } = await supabase
      .from("orders")
      .update({ confirmation_status: newStatus })
      .eq("id", order.id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to update order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log in whatsapp_messages
    await supabase.from("whatsapp_messages").insert({
      order_id: order.id,
      phone: "",
      message_text: `العميل اختار: ${newStatus}`,
      status: "action_received",
      sent_at: new Date().toISOString(),
    });

    const messages: Record<string, string> = {
      confirmed: "✅ شكراً لك! تم تأكيد طلبك بنجاح وسيتم التواصل معك قريباً.",
      cancelled: "❌ تم إلغاء طلبك. إذا غيرت رأيك تواصل معنا.",
      delayed: "⏳ تم تسجيل طلب التأجيل. سنتواصل معك لاحقاً.",
    };

    return new Response(
      JSON.stringify({
        success: true,
        message: messages[newStatus],
        order: { tracking_id: order.tracking_id, customer_name: order.customer_name },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
