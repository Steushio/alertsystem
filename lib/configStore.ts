import { getKv } from "./kv";

export type AlertConfig = {
  font: string;
  color: string;
  duration: number;
  template: string;
  gif?: string;
  sound?: string;
};

export const DEFAULT_CONFIG: AlertConfig = {
  font: "Poppins",
  color: "#ffffff",
  duration: 5,
  template: "{name} tipped ₹{amount}",
  gif: "/gifs/anya.gif",
  sound: "/sounds/anya.wav",
};

function normalizeConfig(raw: unknown): AlertConfig {
  if (!raw) return DEFAULT_CONFIG;

  const parsed = (typeof raw === "string" ? JSON.parse(raw) : raw) as Record<
    string,
    unknown
  >;

  return {
    font: String(parsed.font || parsed.fontFamily || DEFAULT_CONFIG.font),
    color: String(parsed.color || DEFAULT_CONFIG.color),
    duration: Number(parsed.duration) || DEFAULT_CONFIG.duration,
    template: String(parsed.template || parsed.alertText || DEFAULT_CONFIG.template),
    gif: parsed.gif ? String(parsed.gif) : DEFAULT_CONFIG.gif,
    sound: parsed.sound ? String(parsed.sound) : DEFAULT_CONFIG.sound,
  };
}

export async function getConfig(userId: string): Promise<AlertConfig> {
  try {
    const config = await getKv().get(`config:${userId}`);

    if (!config) {
      return DEFAULT_CONFIG;
    }

    return normalizeConfig(config);
  } catch (err) {
    console.error("Failed to read alert config from KV:", err);
    return DEFAULT_CONFIG;
  }
}

export async function saveConfig(userId: string, config: AlertConfig) {
  await getKv().set(`config:${userId}`, normalizeConfig(config));
}
