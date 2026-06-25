import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LockKeyhole } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/hooks/use-auth";

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const { loading, error, signInWithPassword } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const success = await signInWithPassword(email.trim(), password);
    if (success) await navigate({ to: "/admin" });
  };

  return (
    <AppShell
      title="관리자 로그인"
      subtitle="농업기술센터 관리자 계정"
      right={
        <Link to="/" className="text-sm font-medium text-primary hover:underline">
          홈으로
        </Link>
      }
    >
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-8">
        <Card className="w-full">
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <LockKeyhole className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg">관리자 계정</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="admin-email">이메일</Label>
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">비밀번호</Label>
                <Input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </div>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "확인 중" : "로그인"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
};

export const Route = createFileRoute("/login")({
  component: AdminLoginPage,
});
