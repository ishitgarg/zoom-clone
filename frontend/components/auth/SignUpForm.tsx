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

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

interface Errors {
  name?: string;
  email?: string;
  password?: string;
}

function validate(name: string, email: string, password: string): Errors {
  const errors: Errors = {};
  if (!name.trim()) errors.name = "Please enter your name.";
  if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Please enter a valid email address.";
  if (password.length < 8) errors.password = "Password must be at least 8 characters.";
  else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    errors.password = "Password must contain at least one letter and one number.";
  }
  return errors;
}

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const { signIn } = useCurrentUser();
  const toast = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const found = validate(name, email, password);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      const result = await authApi.signUp({ name: name.trim(), email: email.trim(), password });
      await signIn(result.token);
      toast(`Welcome, ${result.user.name}! Your account is ready.`, "success");
      router.push(next);
    } catch (error) {
      setFormError(errorMessage(error));
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Sign Up Free"
      subtitle="Create an account to schedule and host your own meetings."
      footer={
        <>
          Already have an account?{" "}
          <Link href={`/signin${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand hover:underline">
            Sign In
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormError message={formError} />
        <Field label="Full name" htmlFor="signup-name" error={errors.name}>
          <TextInput
            id="signup-name"
            autoComplete="name"
            autoFocus
            maxLength={80}
            value={name}
            invalid={Boolean(errors.name)}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Email address" htmlFor="signup-email" error={errors.email}>
          <TextInput
            id="signup-email"
            type="email"
            autoComplete="email"
            maxLength={255}
            value={email}
            invalid={Boolean(errors.email)}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password" htmlFor="signup-password" error={errors.password} hint="At least 8 characters, with a letter and a number.">
          <PasswordInput
            id="signup-password"
            autoComplete="new-password"
            maxLength={128}
            value={password}
            invalid={Boolean(errors.password)}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={submitting} loadingText="Creating account...">
          Sign Up
        </Button>
      </form>
    </AuthLayout>
  );
}
