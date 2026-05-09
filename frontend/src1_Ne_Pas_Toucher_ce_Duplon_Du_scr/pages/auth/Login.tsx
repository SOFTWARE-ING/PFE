
// =============================
// Login Page (ICONS ADDED)
// =============================
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Mail, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  return (
    <AuthLayout>
      <Card>
        <h2 className="text-2xl font-bold text-center text-text-primaryLight dark:text-text-primaryDark">
          Secure Access Portal
        </h2>

        <p className="text-center text-sm text-text-secondaryLight dark:text-text-secondaryDark">
          Enter your credentials to continue
        </p>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            navigate("/otp");
          }}
        >
          <Input label="Email" icon={Mail} type="email" placeholder="agent@gov.org" name={""} />
          <Input label="Password" icon={Lock} type="password" placeholder="********" name={""} />

          <button className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition">
            Login
          </button>
        </form>
      </Card>
    </AuthLayout>
  );
}