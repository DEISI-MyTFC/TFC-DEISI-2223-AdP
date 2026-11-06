import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { Mail, User } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import AuthShell from "../components/AuthShell";
import AuthInput from "../components/auth/AuthInput";
import AuthPrimaryButton from "../components/auth/AuthPrimaryButton";
import AuthSocialButton from "../components/auth/AuthSocialButton";
import AuthDivider from "../components/auth/AuthDivider";

export default function Register() {
  const googleEnabled = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const navigate = useNavigate();
  const { requestRegisterCode, loginWithGoogle } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleGoogleLogin = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/register`;
    const scope = "openid profile email";
    const nonce = Math.random().toString(36).slice(2);

    const googleAuthUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=token%20id_token` +
      `&response_mode=fragment` +
      `&scope=${encodeURIComponent(scope)}` +
      `&nonce=${encodeURIComponent(nonce)}` +
      `&prompt=select_account`;

    window.location.href = googleAuthUrl;
  };

  useEffect(() => {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    const params = new URLSearchParams(hash);
    const token = params.get("id_token") || params.get("access_token");

    if (!token) return;

    (async () => {
      setSocialLoading("google");
      const ok = await loginWithGoogle(token);
      setSocialLoading(null);
      window.history.replaceState(null, "", "/register");

      if (ok) navigate("/dashboard", { replace: true });
    })();
  }, [loginWithGoogle, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedFirstName || !normalizedLastName || !normalizedEmail) {
      setError("Preencha o nome, apelido e email.");
      return;
    }

    try {
      setLoading(true);

      const challenge = await requestRegisterCode({
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        email: normalizedEmail,
      });

      if (!challenge?.verificationToken) {
        if (challenge?.error) {
          setError(challenge.error);
          return;
        }

        setError("Nao foi possivel criar a conta.");
        return;
      }

      navigate(
          `/verify-code?token=${encodeURIComponent(challenge.verificationToken)}&email=${encodeURIComponent(challenge.email ?? normalizedEmail)}&purpose=register&first_name=${encodeURIComponent(normalizedFirstName)}&last_name=${encodeURIComponent(normalizedLastName)}`,
          { replace: true }
      );
    } catch {
      setError("Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      subtitle="Crie a sua conta para aceder ao dashboard"
      footer={
        <div className="text-center">
          <Link to="/login" className="text-[14px] text-[#2d6a4f] hover:underline font-semibold">
            Já tem conta Entrar
          </Link>
        </div>
      }
    >
      {googleEnabled && <div className="space-y-3 mb-6">
        <AuthSocialButton
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading || !!socialLoading}
          icon={
            socialLoading === "google" ? (
              <div className="w-5 h-5 border-2 border-[#2d6a4f] border-t-transparent rounded-full animate-spin" />
            ) : (
              <FcGoogle className="w-5 h-5" />
            )
          }
        >
          <span>Continuar com Google</span>
        </AuthSocialButton>
      </div>}

      {googleEnabled && <AuthDivider />}

      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
        <AuthInput
          icon={<User className="w-5 h-5" />}
          type="text"
          name="firstName"
          autoComplete="given-name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Primeiro nome"
        />

        <AuthInput
          icon={<User className="w-5 h-5" />}
          type="text"
          name="lastName"
          autoComplete="family-name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Último nome"
        />

        <AuthInput
          icon={<Mail className="w-5 h-5" />}
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-full px-4 py-3 text-[13px] text-red-700 dark:text-red-400 text-center">
            {error}
          </div>
        )}

        <AuthPrimaryButton
          type="submit"
          disabled={loading || !!socialLoading}
          loadingLabel="A enviar código..."
        >
          Continuar
        </AuthPrimaryButton>
      </form>
    </AuthShell>
  );
}

