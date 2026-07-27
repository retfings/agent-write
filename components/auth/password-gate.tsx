"use client";

import { useState, useEffect, type FC, type ReactNode } from "react";

const CORRECT_PASSWORD = "QW!#12sa";
const STORAGE_KEY = "auth_verified";

export const PasswordGate: FC<{ children: ReactNode }> = ({ children }) => {
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") {
      setIsVerified(true);
    }
    setIsLoading(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, "true");
      setIsVerified(true);
      setError("");
    } else {
      setError("密码错误，请重试");
      setPassword("");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">加载中...</div>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background px-4">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-6 shadow-lg"
        >
          <h1 className="mb-2 text-center text-xl font-semibold text-foreground">
            请输入访问密码
          </h1>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            请输入密码以继续使用
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            placeholder="输入密码"
            autoFocus
            className="mb-2 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-ring"
          />
          {error && (
            <p className="mb-2 text-sm text-destructive">{error}</p>
          )}
          <button
            type="submit"
            className="mt-2 w-full rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            确认
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
};