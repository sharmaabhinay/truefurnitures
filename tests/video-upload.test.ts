import { expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate: (data: unknown) => unknown = data => data;
    const builder = {
      middleware: () => builder,
      validator: (fn: typeof validate) => { validate = fn; return builder; },
      handler: () => (data: unknown) => validate(data),
    };
    return builder;
  },
}));
vi.mock("../src/lib/auth/firebase-auth-middleware", () => ({ requireFirebaseAuth: {} }));

import { signCloudinaryUpload } from "../src/lib/upload.functions";

it("accepts the video resource type sent by computer uploads for all three homepage slots", () => {
  const validate = signCloudinaryUpload as unknown as (data: unknown) => unknown;
  expect(validate({ folder: "page-sections/hero-video", resourceType: "video" })).toEqual({
    folder: "page-sections/hero-video", resourceType: "video",
  });
  expect(() => validate({ folder: "page-sections/hero-video", resourceType: "executable" })).toThrow();
});