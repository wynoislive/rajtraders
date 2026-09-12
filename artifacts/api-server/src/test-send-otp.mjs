import { sendVerificationOtpEmail, sendEmail } from "./utils/mailer.js";

async function testSend() {
  console.log("Testing OTP email dispatch...");
  
  // Test auto sendEmail
  const res1 = await sendEmail("babykidollhe@gmail.com", "Test Registration OTP", "<p>Your OTP code is 123456</p>");
  console.log("sendEmail result:", res1);
}

testSend();
