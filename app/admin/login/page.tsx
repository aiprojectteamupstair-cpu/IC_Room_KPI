import { Brand } from "@/components/layout/brand";
import { BackButton } from "@/components/layout/back-button";
import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "@/components/admin/login-form";
import { ShieldCheck } from "lucide-react";
export default function Login() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-12">
      <div className="pt-5">
        <BackButton href="/schedule" label="Back to calendar" />
      </div>
      <div className="my-auto py-10">
        <div className="mb-10 flex justify-center">
          <Brand />
        </div>
        <Card>
          <CardContent className="p-6 sm:p-8">
            <span className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff0ed] text-primary">
              <ShieldCheck size={24} />
            </span>
            <p className="mb-2 text-sm text-muted-foreground">Welcome back</p>
            <h1 className="text-3xl font-semibold tracking-tight">Admin sign in</h1>
            <p className="mb-7 mt-3 text-sm leading-6 text-muted-foreground">
              A little less admin. A little more possibility.
            </p>
            <LoginForm />
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Your centre. Everything in one place.
        </p>
      </div>
    </main>
  );
}
