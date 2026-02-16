"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Register() {
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const router = useRouter();

  async function submit() {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) router.push("/login");
    else alert("Registration failed");
  }

  return (
    <div style={box}>
      <h2>Create account</h2>

      <input placeholder="Username" onChange={e => setU(e.target.value)} />
      <input type="password" placeholder="Password" onChange={e => setP(e.target.value)} />

      <button onClick={submit}>Register</button>
    </div>
  );
}

const box = {
  maxWidth: 300,
  margin: "100px auto",
  display: "flex",
  flexDirection: "column",
  gap: 10,
};
