import React, { useState } from "react";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import AuthLayout from "../../components/layout/AuthLayout";
import { Mail, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { LoginFormData } from "../../types";

const Login: React.FC = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState<LoginFormData>({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // 🔥 Simulation backend success
    navigate("/otp");
  };

  return (
    <AuthLayout>
      <Card>
        <h2 className="text-2xl font-bold mb-6 text-center">
          Connexion Agent Officiel
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            name="email"
            type="email"
            icon={Mail}
            placeholder="exemple@gouv.sn"
            onChange={handleChange}
          />

          <Input
            label="Mot de passe"
            name="password"
            type="password"
            icon={Lock}
            placeholder="********"
            onChange={handleChange}
          />

          <Button type="submit">Se connecter</Button>
        </form>
      </Card>
    </AuthLayout>
  );
};

export default Login;