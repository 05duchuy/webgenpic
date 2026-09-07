export interface GeneratedImage {
  id: string;
  base64: string;
  prompt: string;
  createdAt: Date;
}

// FIX: Removed unsupported aspect ratios ("2:3", "21:9").
export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
