import { getKv } from "./kv";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export type User = {
  id: string;
  username: string;
  password: string;
  token: string;
};

export async function createUser(username: string, password: string) {
  const exists = await getKv().exists(`user:${username}`);
  if (exists) {
    throw new Error("User already exists");
  }

  const user: User = {
    id: username,
    username,
    password: await bcrypt.hash(password, 10),
    token: crypto.randomUUID(),
  };

  await getKv().set(`user:${username}`, user);
  await getKv().set(`token:${user.token}`, username); // index token -> user
}

/**
 * Supports both bcrypt hashes and legacy plaintext records so existing
 * accounts keep working after the upgrade.
 */
export async function verifyPassword(user: User, password: string) {
  if (!user.password) return false;
  if (user.password.startsWith("$2")) {
    return bcrypt.compare(password, user.password);
  }
  return user.password === password;
}

/** Re-hash a legacy plaintext password after a successful login. */
export async function upgradePassword(user: User, password: string) {
  if (user.password.startsWith("$2")) return;
  await getKv().set(`user:${user.username}`, {
    ...user,
    password: await bcrypt.hash(password, 10),
  });
}

export async function getUserByToken(token: string): Promise<User | null> {
  const username = await getKv().get<string>(`token:${token}`);
  if (!username) return null;
  return getUser(username);
}

export async function getUser(username: string): Promise<User | null> {
  return getKv().get<User>(`user:${username}`);
}
