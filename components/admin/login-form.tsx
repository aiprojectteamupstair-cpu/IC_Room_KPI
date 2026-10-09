"use client";
import { useState, useTransition } from "react";
import { login } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
export function LoginForm() {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      action={(form) =>
        start(async () => {
          setError("");
          const result = await login(form);
          if (result) setError(result.error);
        })
      }
      className="space-y-5"
    >
      <div>
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="admin@your-centre.org"
          required
        />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <Button disabled={pending} type="submit" className="w-full">
        {pending ? "Signing in…" : "Sign in to dashboard"}
        <ArrowRight size={16} />
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Administrator access only. Contact your centre operator for account support.
      </p>
    </form>
  );
}
