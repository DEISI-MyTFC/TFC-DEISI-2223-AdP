import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { Mail } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import AuthShell from '../components/AuthShell';
import AuthInput from '../components/auth/AuthInput';
import AuthPrimaryButton from '../components/auth/AuthPrimaryButton';
import AuthSocialButton from '../components/auth/AuthSocialButton';
import AuthDivider from '../components/auth/AuthDivider';

export default function Login() {
  const googleEnabled = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const navigate = useNavigate();
  const { requestLoginCode, loginWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const handleGoogleLogin = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/login`;
    const scope = 'openid profile email';
    const nonce = Math.random().toString(36).slice(2);

    const googleAuthUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=${encodeURIComponent('token id_token')}` +
        `&response_mode=fragment` +
        `&scope=${encodeURIComponent(scope)}` +
        `&nonce=${encodeURIComponent(nonce)}` +
        `&prompt=select_account`;

    window.location.href = googleAuthUrl;
  };

  useEffect(() => {
    const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : '';

    const params = new URLSearchParams(hash);
    const token = params.get('id_token');

    if (!token) return;

    (async () => {
      setError('');
      setSocialLoading('google');

      const ok = await loginWithGoogle(token);

      setSocialLoading(null);
      window.history.replaceState(null, '', '/login');

      if (ok) {
        navigate('/dashboard', { replace: true });
      } else {
        setError('Não foi possível entrar com Google');
      }
    })();
  }, [loginWithGoogle, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();
    const challenge = await requestLoginCode(normalizedEmail);

    if (challenge?.verificationToken) {
      navigate(
          `/verify-code?token=${encodeURIComponent(
              challenge.verificationToken
          )}&email=${encodeURIComponent(challenge.email ?? normalizedEmail)}&purpose=login`,
          { replace: true }
      );
      return;
    }

    setLoading(false);

    if (challenge?.error) {
      setError(challenge.error);
      return;
    }

    setError('Não foi possível enviar o código. Confirma o email.');
  };

  return (
      <AuthShell
          subtitle="Faça login para aceder ao dashboard"
          footer={
            <div className="text-center">
              <Link
                  to="/register"
                  className="text-[14px] text-[#2d6a4f] hover:underline font-semibold"
              >
                Ainda não tem conta? Registe-se
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
                socialLoading === 'google' ? (
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

          <AuthPrimaryButton type="submit" disabled={loading || !!socialLoading} loadingLabel="A enviar código...">
            Continuar
          </AuthPrimaryButton>
        </form>
      </AuthShell>
  );
}
