"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  Users,
  CalendarDays,
  BarChart3,
  Cloud,
  LoaderCircle,
} from "lucide-react";

const features = [
  { icon: Users, line1: "Employee", line2: "Management" },
  { icon: CalendarDays, line1: "Salary", line2: "Processing" },
  { icon: BarChart3, line1: "Reports &", line2: "Analytics" },
  { icon: ShieldCheck, line1: "Secure &", line2: "Reliable" },
  { icon: Cloud, line1: "Streamlined", line2: "Operations" },
];

function PayrollXMark() {
  return (
    <svg className="px-mark" viewBox="0 0 64 80" aria-hidden="true">
      <defs>
        <linearGradient id="pxg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#18cfff" />
          <stop offset="0.55" stopColor="#2f6bff" />
          <stop offset="1" stopColor="#7950ff" />
        </linearGradient>
      </defs>
      <path
        d="M6 78 L6 14 Q6 4 16 4 H44 Q60 4 60 22 Q60 40 44 40 H26 V30 H42 Q48 30 48 22 Q48 14 42 14 H20 L20 78 Z"
        fill="url(#pxg)"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success" | "info">(
    "info"
  );
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoading) return;

    setMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          username: username.trim(),
          password,
          remember,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setMessageType("error");
        setMessage(data.message || "Invalid username or password.");
        return;
      }

      setMessageType("success");
      setMessage("Login successful. Redirecting...");

      setPassword("");

      router.replace(
        typeof data.redirectTo === "string" &&
          data.redirectTo.startsWith("/") &&
          !data.redirectTo.startsWith("//")
          ? data.redirectTo
          : "/dashboard"
      );

      router.refresh();
    } catch {
      setMessageType("error");
      setMessage(
        "Unable to connect to the server. Please check your connection and try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleForgotPassword() {
    setMessageType("info");
    setMessage(
      "Please contact your system administrator to reset your password."
    );
  }

  return (
    <main className="login-page">
      <section className="brand-panel">
        <div className="brand-top">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="amrita-logo"
            src="/images/amrita-logo.png"
            alt="Amrita Hospital Kochi"
          />

          <p className="institute-name">
            Amrita Institute of Science and Technology
          </p>
        </div>

        <div className="brand-content">
          <h1 className="wordmark">
            PAYROLL<span>X</span>
          </h1>

          <p className="tagline">
            Smart Payroll Management for a Stronger Tomorrow
          </p>

          <div className="accent-line" />

          <ul className="feature-row">
            {features.map(({ icon: Icon, line1, line2 }) => (
              <li className="feature" key={line1}>
                <span className="feature-icon">
                  <Icon size={24} strokeWidth={1.8} />
                </span>
                <span>{line1}</span>
                <span>{line2}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="brand-footer">
          <p>AMRITA INSTITUTE OF SCIENCE AND TECHNOLOGY</p>

          <div className="footer-motto">
            <i />
            <span>EDUCATION FOR A BETTER TOMORROW</span>
            <i />
          </div>
        </div>
      </section>

      <section className="form-panel">
        <div className="login-card">
          <div className="secure-label">
            <Lock size={14} />
            <span>Secure Login</span>
          </div>

          <div className="product-brand">
            <PayrollXMark />

            <div>
              <h2>
                PAYROLL<span>X</span>
              </h2>
              <p>Payroll Management System</p>
              <small>Amrita Institute of Science and Technology</small>
            </div>
          </div>

          <div className="welcome-section">
            <h1>Welcome Back</h1>
            <p>Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="username">Username</label>

              <div className="input-wrapper">
                <User className="input-icon" size={20} strokeWidth={1.6} />

                <input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  maxLength={100}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>

              <div className="input-wrapper">
                <Lock className="input-icon" size={20} strokeWidth={1.6} />

                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  maxLength={1024}
                  required
                  disabled={isLoading}
                />

                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  disabled={isLoading}
                />

                <span className="checkbox-box" aria-hidden="true">
                  ✓
                </span>

                Remember me
              </label>

              <button
                type="button"
                className="forgot-button"
                onClick={handleForgotPassword}
                disabled={isLoading}
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={isLoading}
            >
              {isLoading ? (
                <LoaderCircle className="animate-spin" size={22} />
              ) : (
                <LogIn size={22} />
              )}

              <span>{isLoading ? "Signing In..." : "Log In"}</span>
            </button>

            {message && (
              <div
                className="login-message"
                role={messageType === "error" ? "alert" : "status"}
                aria-live="polite"
                data-type={messageType}
              >
                {message}
              </div>
            )}
          </form>

          <div className="security-footer">
            <ShieldCheck size={30} strokeWidth={1.4} />

            <div>
              <p>This system is for authorized users only.</p>
              <span>Amrita Institute of Science and Technology</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}