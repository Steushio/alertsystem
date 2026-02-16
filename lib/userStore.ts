import { kv } from "@vercel/kv";
import crypto from "crypto";

export type User = {
  id: string;
  username: string;
  password: string;
  token: string;
};

export async function createUser(username: string, password: string) {
  const exists = await kv.exists(`user:${username}`);
  if (exists) {
    throw new Error("User already exists");
  }

  const user: User = {
    id: username,
    username,
    password,
    token: crypto.randomUUID(), // ✅ ALWAYS GENERATED
  };

  await kv.set(`user:${username}`, user);
  await kv.set(`token:${user.token}`, username); // 👈 INDEX TOKEN TO USER
}

export async function getUserByToken(token: string): Promise<User | null> {
  const username = await kv.get<string>(`token:${token}`);
  if (!username) return null;
  return getUser(username);
}

export async function getUser(username: string): Promise<User | null> {
  const user = await kv.get<User>(`user:${username}`);
  return user;
}
