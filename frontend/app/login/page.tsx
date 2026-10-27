"use client";

import { useQueryClient } from "@tanstack/react-query";
import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { FullPageSpinner, Logo } from "@/components/common";
import { TermsConsent } from "@/components/terms-consent";
import { Button } from "@/components/ui/button";
import { AnimatePresence, FadeIn, motion, SlidingTabs } from "@/components/ui/motion";
import { Input, Label } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { auth, googleProvider } from "@/lib/firebase";
import { useAuth } from "@/lib/hooks/use-auth";
import { LEGAL_DOCS, TERMS_VERSION } from "@/lib/legal";
import { cn } from "@/lib/utils";

const AUTH_ERRORS: Record<string, string> = {
  "auth/invalid-credential": "E-posta ya da şifre hatalı.",
  "auth/invalid-email": "Geçerli bir e-posta adresi girin.",
  "auth/user-not-found": "Bu e-postayla kayıtlı hesap yok.",
  "auth/wrong-password": "E-posta ya da şifre hatalı.",
  "auth/email-already-in-use": "Bu e-posta zaten kayıtlı. Giriş yapmayı deneyin.",
  "auth/weak-password": "Şifre en az 6 karakter olmalı.",
  "auth/too-many-requests": "Çok fazla deneme yapıldı. Biraz sonra tekrar deneyin.",
  "auth/popup-closed-by-user": "Google penceresi kapatıldı.",
  "auth/network-request-failed": "Ağ hatası. Bağlantınızı kontrol edin.",
  "auth/user-disabled": "Bu hesap devre dışı bırakılmış.",
};

function authError(err: unknown) {
  if (err instanceof FirebaseError) return AUTH_ERRORS[err.code] ?? "Giriş yapılamadı. Tekrar deneyin.";
  return "Beklenmeyen bir hata oluştu.";
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38Z" />
    </svg>
  );
}

const AUTH_MODES = [
  { value: "signin", label: "Giriş yap" },
  { value: "signup", label: "Kayıt ol" },
] as const;

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"signin" | "signup">(
    params.get("mode") === "signup" ? "signup" : "signin",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"email" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const needsConsent = mode === "signup" && !consent;

  const rawNext = params.get("next");
  const next = rawNext?.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  useEffect(() => {
    if (!loading && user && busy === null) router.replace(next);
  }, [loading, user, busy, next, router]);

  async function recordConsent(uid: string) {
    try {
      const me = await api.acceptTerms(TERMS_VERSION);
      queryClient.setQueryData(["me", uid], me);
    } catch {
      // yoksay
    }
  }

  async function onGoogle() {
    setError(null);
    setBusy("google");
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      if (mode === "signup") await recordConsent(cred.user.uid);
    } catch (e) {
      setError(authError(e));
    } finally {
      setBusy(null);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy("email");
    try {
      if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
        await recordConsent(cred.user.uid);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (e) {
      setError(authError(e));
    } finally {
      setBusy(null);
    }
  }

  async function onReset() {
    if (!email) {
      setError("Şifre sıfırlama için önce e-posta adresinizi girin.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Şifre sıfırlama bağlantısı e-postanıza gönderildi.");
    } catch (e) {
      setError(authError(e));
    }
  }

  if (loading || user) return <FullPageSpinner />;

  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <FadeIn className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <SlidingTabs
            layoutId="login-mode"
            variant="surface"
            options={AUTH_MODES}
            value={mode}
            onChange={(m) => {
              setMode(m);
              setError(null);
            }}
            className="grid w-full grid-cols-2"
          />

          <h1 className="mt-7 text-2xl font-semibold tracking-tight text-ink-900">
            {mode === "signin" ? "Tekrar hoş geldin" : "Hesap oluştur"}
          </h1>

          <AnimatePresence initial={false}>
            {mode === "signup" && (
              <motion.div
                key="consent"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-5 rounded-xl border border-ink-200/70 bg-ink-50/40 p-3.5">
                  <TermsConsent checked={consent} onChange={setConsent} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            variant="outline"
            size="lg"
            className="mt-5 w-full"
            onClick={onGoogle}
            loading={busy === "google"}
            disabled={busy !== null || needsConsent}
          >
            {busy !== "google" && <GoogleIcon />}
            Google ile devam et
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs text-ink-400">
            <span className="h-px flex-1 bg-ink-100" />
            veya e-posta ile
            <span className="h-px flex-1 bg-ink-100" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <AnimatePresence initial={false}>
              {mode === "signup" && (
                <motion.div
                  key="name"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="pb-1">
                    <Label htmlFor="name">Ad soyad</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="ornek@eposta.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Şifre</Label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={onReset}
                    className="mb-1.5 cursor-pointer text-xs font-medium text-brand-600 hover:underline"
                  >
                    Şifremi unuttum
                  </button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="rounded-xl bg-accent-50 px-3.5 py-2.5 text-sm text-accent-700 ring-1 ring-inset ring-accent-200/60"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              loading={busy === "email"}
              disabled={busy !== null || needsConsent}
            >
              {mode === "signin" ? "Giriş yap" : "Kayıt ol"}
            </Button>
          </form>

          <nav className="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-ink-400">
            {LEGAL_DOCS.map((d) => (
              <a key={d.slug} href={`/legal/${d.slug}`} target="_blank" className="transition-colors hover:text-ink-700">
                {d.title}
              </a>
            ))}
          </nav>
        </FadeIn>
      </div>

      <div className="relative hidden overflow-hidden bg-ink-900 lg:block">
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 animate-aurora rounded-full bg-brand-500/35 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-10 size-80 animate-aurora rounded-full bg-accent-500/25 blur-3xl [animation-delay:-6s]" />
        <div className="relative flex h-full flex-col justify-end p-14">
          <div className="w-fit rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
            <div className="flex h-16 items-end gap-1.5">
              {[30, 55, 40, 80, 62, 95, 70, 45, 85, 50, 66, 38, 74, 58, 90, 42, 60, 35].map((h, i) => (
                <span
                  key={i}
                  className={cn(
                    "w-2 origin-bottom animate-wave rounded-full",
                    i % 5 === 3 ? "bg-accent-400" : "bg-brand-400",
                  )}
                  style={{ height: `${h}%`, animationDelay: `${(i % 6) * -0.23}s` }}
                />
              ))}
            </div>
          </div>
          <p className="mt-8 max-w-md text-3xl font-semibold leading-tight tracking-tight text-white">
            “Bir saatlik röportajı yazıya dökmek artık bir kahve molası kadar sürüyor.”
          </p>
          <p className="mt-3 text-sm text-ink-300">Zaman damgalı · Aranabilir · İndirilebilir</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <LoginForm />
    </Suspense>
  );
}
