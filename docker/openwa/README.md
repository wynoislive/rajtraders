# 🚀 OpenWA Self-Hosted WhatsApp API Gateway Setup Guide

This directory contains the Docker configuration for running [OpenWA](https://github.com/rmyndharis/OpenWA) as a high-speed, self-hosted WhatsApp Gateway for **RAJ TRADERS**.

---

## 📋 Features in Raj Traders Integration
1. **Dynamic Setup via Admin Web**:
   - Configure Gateway Server URL, API Key, Session ID, and Sender Number directly from **Store Settings** in `https://sundarvan.xyz/admin` without redeploying code.
2. **Order Lifecycle WhatsApp Alerts**:
   - 🧾 **Order Confirmation**: Clean branded receipt with Order ID, Items summary, total amount, and delivery/pickup address.
   - 🚴 **Out for Delivery**: Notification with assigned rider name, mobile number, and live tracking link.
   - 🏪 **Ready for Store Pickup**: Notification with store address (`Thana Rd, beside NAGAR PALIKA, BIRSINGPUR, Pali Birsinghpur, Madhya Pradesh 484551`).
   - ✅ **Delivered & ❌ Cancelled**: Immediate status confirmations with refund details.
3. **Customer Auth OTP**:
   - Customers can select **💬 WhatsApp** or **✉️ Email** to receive 6-digit login verification codes and password recovery links.
4. **1-Click Diagnostic Tester**:
   - Built-in live WhatsApp ping button in Admin Web to verify container connectivity and message delivery.

---

## 🛠️ Step 1: Start OpenWA Container

On your local machine or Ubuntu VPS:

```bash
cd docker/openwa

# 1. Create your environment config
cp .env.example .env

# 2. Start the OpenWA container in the background
docker compose up -d
```

---

## 📲 Step 2: Scan QR Code with WhatsApp

1. View the OpenWA startup logs to display the terminal QR code:
```bash
docker compose logs -f openwa
```

2. Open WhatsApp on your phone:
   - Go to **Settings** > **Linked Devices** > **Link a Device**.
   - Scan the QR code displayed in the terminal.

3. Once connected, OpenWA will output:
```
Client is ready! Authenticated session 'default' active.
```

---

## ⚙️ Step 3: Connect to Raj Traders Admin Web

1. Log in to Raj Traders Admin Console:
   - URL: `https://sundarvan.xyz/admin`
2. Navigate to **Store Settings** > **OpenWA WhatsApp API Gateway**.
3. Fill in your gateway details:
   - **Gateway Server URL**: `http://<YOUR_IP>:3000` (or your domain with HTTPS reverse proxy)
   - **API Key**: The value set in `WA_API_KEY` (e.g. `rajtraders_secret_wa_api_key_2026`)
   - **Session ID**: `default`
   - **Sender Number**: Your store WhatsApp number (e.g. `+919876543210`)
   - ✅ Check **Enable WhatsApp Order Notifications**
   - ✅ Check **Enable WhatsApp Customer Auth OTP**
4. Click **Save Settings**.

---

## 🧪 Step 4: Test Delivery

In the **1-Click Live WhatsApp Gateway Tester** panel inside Admin Web:
1. Enter your mobile number (e.g. `9876543210`).
2. Click **⚡ Send Test WhatsApp**.
3. You will receive an instant test message confirming live connectivity.
