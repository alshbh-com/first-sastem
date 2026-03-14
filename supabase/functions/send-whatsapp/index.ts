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
    const { order_id } = await req.json();

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: "order_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, tracking_id, customer_name, customer_phone, product_name, price, confirmation_token")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get WhatsApp server URL from settings
    const { data: setting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "whatsapp_server_url")
      .maybeSingle();

    const serverUrl = setting?.value;

    if (!serverUrl) {
      // Log as pending if no server configured
      await supabase.from("whatsapp_messages").insert({
        order_id: order.id,
        phone: order.customer_phone,
        message_text: "Server not configured",
        status: "no_server",
      });

      return new Response(
        JSON.stringify({ error: "WhatsApp server URL not configured", status: "no_server" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the app URL for confirmation links
    const { data: appUrlSetting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "app_url")
      .maybeSingle();

    const appUrl = appUrlSetting?.value || "https://first-route-logistics.lovable.app";

    // Build message
    const message = `مرحباً ${order.customer_name} 👋

تم تسجيل طلب لك في *FIRST Shipping*.

📦 رقم الطلب: *${order.tracking_id}*
🛍️ المنتج: *${order.product_name}*
💰 السعر: *${order.price}* د.ل

━━━━━━━━━━━━━━━

✅ *لتأكيد الطلب:*
${appUrl}/order-action?token=${order.confirmation_token}&action=confirm

❌ *لإلغاء الطلب:*
${appUrl}/order-action?token=${order.confirmation_token}&action=cancel

⏳ *لتأجيل الرد:*
${appUrl}/order-action?token=${order.confirmation_token}&action=delay

━━━━━━━━━━━━━━━

شكراً لثقتك بنا 🙏`;

    // Clean phone number
    let phone = order.customer_phone.replace(/[\s\-\(\)]/g, "");
    if (phone.startsWith("0")) {
      phone = "218" + phone.substring(1);
    }
    if (!phone.startsWith("+") && !phone.startsWith("218")) {
      phone = "218" + phone;
    }
    phone = phone.replace("+", "");

    // Send to WhatsApp server
    let sendStatus = "failed";
    let errorMsg = "";

    try {
      const res = await fetch(`${serverUrl}/send-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, message }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        sendStatus = "sent";
      } else {
        sendStatus = "failed";
        errorMsg = result.error || "Unknown error";
      }
    } catch (fetchErr: any) {
      sendStatus = "failed";
      errorMsg = fetchErr.message || "Connection failed";
    }

    // Log the message
    await supabase.from("whatsapp_messages").insert({
      order_id: order.id,
      phone: phone,
      message_text: message,
      status: sendStatus,
      sent_at: sendStatus === "sent" ? new Date().toISOString() : null,
    });

    // Update confirmation status
    if (sendStatus === "sent") {
      await supabase
        .from("orders")
        .update({ confirmation_status: "awaiting_confirmation" })
        .eq("id", order.id);
    }

    return new Response(
      JSON.stringify({
        success: sendStatus === "sent",
        status: sendStatus,
        error: errorMsg || undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
