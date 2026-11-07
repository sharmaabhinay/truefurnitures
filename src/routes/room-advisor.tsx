import { createFileRoute } from "@tanstack/react-router";
import { RoomAdvisor } from "@/components/room-advisor";

export const Route = createFileRoute("/room-advisor")({
  head: () => ({ meta: [
    { title: "Room & Sofa Advisor — True Furniture" },
    { name: "description", content: "Find sofas and recorded customizations from True Furniture’s catalogue to complement your room photo and preferences." },
    { property: "og:title", content: "Room & Sofa Advisor — True Furniture" },
    { property: "og:description", content: "Personal room-photo styling recommendations from our sofa catalogue." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: RoomAdvisor,
});