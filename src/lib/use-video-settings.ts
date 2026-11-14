import { useQuery } from "@tanstack/react-query";
import { getVideoSettings } from "./video-settings.functions";
export const videoSettingsKey = ["video-settings"] as const;
export function useVideoSettings() {
  return useQuery({ queryKey: videoSettingsKey, queryFn: () => getVideoSettings(), staleTime: 15000, refetchInterval: 30000, refetchOnWindowFocus: true });
}