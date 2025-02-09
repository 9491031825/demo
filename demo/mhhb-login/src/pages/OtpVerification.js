import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const OtpVerification = () => {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/user/login/otpverification",
        { otp }
      );

      localStorage.setItem("access_token", response.data.access_token);
      localStorage.setItem("refresh_token", response.data.refresh_token);
      alert("OTP Verified Successfully!");
      navigate("/home");
    } catch (error) {
      setError(error.response?.data?.error || "Invalid OTP. Try again.");
    }
  };

  return (
    <div>
      <h2>OTP Verification</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleOtpSubmit}>
        <input
          type="text"
          placeholder="Enter OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          required
        />
        <button type="submit">Verify OTP</button>
      </form>
    </div>
  );
};

export default OtpVerification;
