"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function Login() {
  const [username, setU] = useState("");
  const [password, setP] = useState("");

  return (
    <div style={box}>
      <h2>Login</h2>

      <input placeholder="Username" onChange={e => setU(e.target.value)} />
      <input type="password" placeholder="Password" onChange={e => setP(e.target.value)} />

      <button
        onClick={() =>
          signIn("credentials", {
            username,
            password,
            callbackUrl: "/dashboard",
          })
        }
      >
        Login
      </button>

      <a href="/register">Create account</a>
    </div>
  );
}

const box: React.CSSProperties = {
  maxWidth: 400,
  margin: "40px auto",
  display: "flex",
  flexDirection: "column",
  gap: 20,
};
