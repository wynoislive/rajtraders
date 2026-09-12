import pg from "pg";
import nodemailer from "nodemailer";

const rawDbUrl = "postgresql://postgres.hbwwbapappmsbdsjaasm:jooPR0L9GDu6R7sM@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";
const pool = new pg.Pool({ connectionString: rawDbUrl, ssl: { rejectUnauthorized: false } });

async function runTest() {
  const res = await pool.query("SELECT * FROM shop_settings WHERE id = 'default_shop'");
  const s = res.rows[0];

  console.log("--- 1. Testing Hostinger REST API ---");
  const apiToken = s.hostinger_api_token;
  const senderEmail = s.smtp_user || "wyno@justbuyme.in";

  let resourceId = s.hostinger_mailbox_resource_id;
  if (!resourceId && apiToken) {
    try {
      const meRes = await fetch("https://api.mail.hostinger.com/api/v1/me", {
        headers: { "Authorization": `Bearer ${apiToken}` }
      });
      console.log("Hostinger /me status:", meRes.status);
      if (meRes.ok) {
        const meData = await meRes.json();
        console.log("Hostinger /me data:", JSON.stringify(meData));
        const mailboxes = meData?.data?.mailboxes || meData?.mailboxes || [];
        const match = mailboxes.find(m => m.address?.toLowerCase() === senderEmail.toLowerCase()) || mailboxes[0];
        if (match) resourceId = match.resourceId || match.id;
      }
    } catch (e) {
      console.error("Hostinger /me fetch error:", e.message);
    }
  }

  console.log("Resolved Hostinger Resource ID:", resourceId);

  if (resourceId && apiToken) {
    try {
      const sendRes = await fetch(`https://api.mail.hostinger.com/api/v1/mailboxes/${resourceId}/send`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: ["babykidollhe@gmail.com"],
          displayName: "RAJ TRADERS",
          subject: "Test Registration OTP via Hostinger API",
          html: "<h1>Your OTP code is 987654</h1>",
        }),
      });
      console.log("Hostinger send status:", sendRes.status);
      const text = await sendRes.text();
      console.log("Hostinger send response:", text);
    } catch (e) {
      console.error("Hostinger send error:", e.message);
    }
  }

  console.log("\n--- 2. Testing Primary Hostinger SMTP (wyno@justbuyme.in) ---");
  try {
    const tPrimary = nodemailer.createTransport({
      host: s.smtp_host || "smtp.hostinger.com",
      port: s.smtp_port || 465,
      secure: (s.smtp_port || 465) === 465,
      auth: { user: s.smtp_user, pass: s.smtp_pass },
      tls: { rejectUnauthorized: false }
    });
    const infoPrimary = await tPrimary.sendMail({
      from: s.smtp_from || `RAJ TRADERS <${s.smtp_user}>`,
      to: "babykidollhe@gmail.com",
      subject: "Test Registration OTP via Hostinger SMTP",
      html: "<h1>Your OTP code is 123456</h1>"
    });
    console.log("Hostinger SMTP Success! MessageId:", infoPrimary.messageId);
  } catch (e) {
    console.error("Hostinger SMTP Error:", e.message);
  }

  console.log("\n--- 3. Testing Notification Gmail SMTP (notifications.rajtraders@gmail.com) ---");
  try {
    const tNotif = nodemailer.createTransport({
      host: s.notification_smtp_host || "smtp.gmail.com",
      port: s.notification_smtp_port || 465,
      secure: true,
      auth: { user: s.notification_smtp_user, pass: s.notification_smtp_pass },
      tls: { rejectUnauthorized: false }
    });
    const infoNotif = await tNotif.sendMail({
      from: s.notification_smtp_from || `RAJ TRADERS Notifications <${s.notification_smtp_user}>`,
      to: "babykidollhe@gmail.com",
      subject: "Test Registration OTP via Gmail Notifications",
      html: "<h1>Your OTP code is 654321</h1>"
    });
    console.log("Gmail SMTP Success! MessageId:", infoNotif.messageId);
  } catch (e) {
    console.error("Gmail SMTP Error:", e.message);
  }

  await pool.end();
}

runTest();
