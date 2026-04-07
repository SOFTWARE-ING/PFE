import React, { useRef, useState, useEffect } from "react";
import Card from "../../components/ui/Card";
import { AuthLayout } from "../../components/layout/AuthLayout";

const OTP_LENGTH = 6;

const Otp: React.FC = () => {
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const inputsRef = useRef<HTMLInputElement[]>([]);

  const [timer, setTimer] = useState(180);

  // Countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev === 0) return 180; // resend simulation
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleChange = (value: string, index: number) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move forward
    if (value && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  return (
    <AuthLayout>
      <Card>
        <h2 className="text-xl font-bold text-center mb-2 text-text-primaryLight dark:text-text-primaryDark">
          Two-Factor Authentication
        </h2>

        <p className="text-center text-sm mb-6 text-text-secondaryLight dark:text-text-secondaryDark">
          Enter the verification code sent to your email.
        </p>

        {/* OTP Inputs */}
        <div className="flex justify-between gap-2 mb-6">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { if (el) inputsRef.current[index] = el;}}
              value={digit}
              onChange={(e) => handleChange(e.target.value, index)}
              maxLength={1}
              className="
                w-12 h-14 text-center text-lg font-semibold
                rounded-xl
                bg-white/80 dark:bg-slate-800/80
                border border-border-light dark:border-border-dark
                focus:ring-2 focus:ring-blue-500
                outline-none
              "
            />
          ))}
        </div>

        {/* Timer */}
        <p className="text-center text-sm text-text-secondaryLight dark:text-text-secondaryDark">
          Code expires in{" "}
          <span className="font-semibold text-blue-500">
            {Math.floor(timer / 60)}:
            {(timer % 60).toString().padStart(2, "0")}
          </span>
        </p>
      </Card>
    </AuthLayout>
  );
};

export default Otp;