import React, { useState } from "react";
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from "./firebase";

const OTPLogin = () => {
  const [phone] = useState("+918008562381"); // Admin's phone number
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);

  const sendOTP = async () => {
    try {
      window.recaptchaVerifier = new RecaptchaVerifier(
        "recaptcha-container",
        { size: "invisible" },
        auth
      );

      const confirmation = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
      setConfirmationResult(confirmation);
      alert("OTP sent to " + phone);
    } catch (error) {
      console.error("Error sending OTP:", error);
    }
  };

  const verifyOTP = async () => {
    try {
      await confirmationResult.confirm(otp);
      alert("OTP verified successfully!");
    } catch (error) {
      alert("Invalid OTP. Try again.");
    }
  };

  return (
    <div>
      <h2>Admin OTP Login</h2>
      <div id="recaptcha-container"></div>
      <button onClick={sendOTP}>Send OTP</button>

      {confirmationResult && (
        <>
          <input type="text" placeholder="Enter OTP" onChange={(e) => setOtp(e.target.value)} />
          <button onClick={verifyOTP}>Verify OTP</button>
        </>
      )}
    </div>
  );
};

export default OTPLogin;
