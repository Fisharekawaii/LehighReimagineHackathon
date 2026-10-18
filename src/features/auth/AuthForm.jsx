import React, { useState } from "react";
import { Button, Field, ErrorMessage } from "../../components/UI";
import { api } from "../../lib/api";
import { formData } from "../../lib/format";
export default function AuthForm({ onSignedIn }) {
  const [register, setRegister] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="form-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const u = await api(
            register ? "/auth/register" : "/auth/login",
            "POST",
            formData(e),
          );
          await onSignedIn(u);
        } catch (e) {
          setError(e.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {register && (
        <Field label="Your name">
          <input
            name="name"
            required
            maxLength={80}
            autoComplete="name"
            placeholder="How should we call you?"
          />
        </Field>
      )}
      <Field label="Username">
        <input
          name="username"
          required
          minLength={3}
          maxLength={40}
          pattern="[a-zA-Z0-9_.\-]+"
          autoComplete="username"
          placeholder="your.travel.name"
        />
      </Field>
      <Field label="Password">
        <input
          name="password"
          type="password"
          required
          minLength={8}
          maxLength={128}
          autoComplete={register ? "new-password" : "current-password"}
        />
      </Field>
      <ErrorMessage error={error} />
      <Button type="submit" busy={busy}>
        {register ? "Create your account" : "Welcome back. Sign in"}
      </Button>
      <button
        type="button"
        className="text-link"
        onClick={() => {
          setRegister(!register);
          setError("");
        }}
      >
        {register
          ? "Already have an account? Sign in"
          : "New around here? Create an account"}
      </button>
      <p className="fine-print">
        Your plans, saved across devices. Payments happen outside DayTripper.
      </p>
    </form>
  );
}
