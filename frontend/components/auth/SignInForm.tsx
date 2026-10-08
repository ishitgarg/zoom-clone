"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { Button } from "@/components/ui/Button";
import { Field, FormError, TextInput } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/Toast";
import { authApi } from "@/lib/api/auth";
import { errorMessage } from "@/lib/api/client";
import { safeNextPath } from "@/lib/auth/redirect";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const { signIn } = useCurrentUser();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const found = {
      email: email.trim() ? undefined : "Please enter your email address.",
      password: password ? undefined : "Please enter your password.",
    };
    setErrors(found);
    if (found.email || found.password) return;

    setSubmitting(true);
    try {
      const result = await authApi.signIn({ email: email.trim(), password });
      await signIn(result.token);
      toast(`Signed in as ${result.user.name}`, "success");
      router.push(next);
    } catch (error) {
      setFormError(errorMessage(error));
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Sign In"
      subtitle="Use your account to host and manage your own meetings."
      footer={
        <>
          New here?{" "}
          <Link href={`/signup${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand hover:underline">
            Sign Up Free
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormError message={formError} />
        <Field label="Email address" htmlFor="signin-email" error={errors.email}>
          <TextInput
            id="signin-email"
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            invalid={Boolean(errors.email)}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password" htmlFor="signin-password" error={errors.password}>
          <PasswordInput
            id="signin-password"
            autoComplete="current-password"
            value={password}
            invalid={Boolean(errors.password)}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={submitting} loadingText="Signing in...">
          Sign In
        </Button>
        <p className="rounded-lg bg-canvas px-3 py-2 text-[12px] text-muted">
          Demo account: <span className="font-medium text-ink-2">alex.morgan@example.com</span> /{" "}
          <span className="font-medium text-ink-2">zoomdemo123</span>
        </p>
      </form>
    </AuthLayout>
  );
}
