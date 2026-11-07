import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/room-advisor")({
  server: { handlers: { POST: async ({ request }) => {
    const { handleRoomAdvisor } = await import("@/lib/room-ai/handler.server");
    return handleRoomAdvisor(request);
  } } },
});