import React, { useRef, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import AuthLayout from "../../components/layout/AuthLayout";
import type { OTPCode } from "../../types";

const OTP: React.FC = () => {
  const [otp, setOtp] = useState<OTPCode>(["", "", "", "", "", ""]);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (value: string, index: number) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // auto focus next
    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const code = otp.join("");
    console.log("OTP:", code);
  };

  return (
    <AuthLayout>
      <Card>
        <h2 className="text-xl font-bold text-center mb-4 text-gray-900 dark:text-white">
          Vérification 2FA
        </h2>

        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
          Code envoyé par email (expire en 5 minutes)
        </p>

        <form onSubmit={handleSubmit}>
          <div className="flex justify-between gap-2 mb-6">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  if (el) inputsRef.current[index] = el;
                }}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(e.target.value, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className="w-12 h-12 text-center border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            ))}
          </div>

          <Button type="submit">Vérifier</Button>
        </form>
      </Card>
    </AuthLayout>
  );
};

export default OTP;