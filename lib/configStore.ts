import { kv } from "@vercel/kv";

export type AlertConfig = {
  font: string;
  color: string;
  duration: number;
  template: string;
  gif?: string;
  sound?: string;
};

export async function getConfig(userId: string): Promise<AlertConfig> {
  const config = await kv.get<any>(`config:${userId}`);

  if (!config) {
    return {
      font: "Poppins",
      color: "#ffffff",
      duration: 5,
      template: "{name} tipped ₹{amount}",
    };
  }

  // Legacy migration
  return {
    font: config.font || config.fontFamily || "Poppins",
    color: config.color || "#ffffff",
    duration: config.duration || 5,
    template: config.template || config.alertText || "{name} tipped ₹{amount}",
    gif: config.gif || "/gifs/anya.gif",
    sound: config.sound || "/sounds/anya.wav",
  };
}

export async function saveConfig(userId: string, config: AlertConfig) {
  await kv.set(`config:${userId}`, config);
}
