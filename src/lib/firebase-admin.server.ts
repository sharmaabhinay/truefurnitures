/**
 * Edge-safe Firebase Admin access.
 *
 * The Worker runtime cannot run the `firebase-admin` npm package, so this talks
 * to the Firestore + Identity Toolkit REST APIs and signs its own service-account
 * JWT with WebCrypto (RS256).
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPES = [
  "https://www.googleapis.com/auth/datastore",
  "https://www.googleapis.com/auth/identitytoolkit",
  "https://www.googleapis.com/auth/firebase",
].join(" ");

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function projectId(): string {
  return env("FIREBASE_PROJECT_ID");
}

const b64url = (input: ArrayBuffer | string) => {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

function pemToPkcs8(pem: string): ArrayBuffer {
  const body = pem
    .replace(/\\n/g, "\n")
    .replace(/-----[A-Z ]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(body);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/** OAuth access token for the service account (cached until ~1 min before expiry). */
export async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;

  const clientEmail = env("FIREBASE_CLIENT_EMAIL");
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: clientEmail,
      scope: SCOPES,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(env("FIREBASE_PRIVATE_KEY")),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${header}.${claims}`),
  );
  const assertion = `${header}.${claims}.${b64url(signature)}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const json = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!json.access_token) throw new Error(`Firebase auth failed: ${json.error ?? res.status}`);
  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 - 60_000,
  };
  return cachedToken.token;
}

// ---- Firestore value (de)serialisation ----

type FsValue = Record<string, unknown>;

export function toFs(value: unknown): FsValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFs) } };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  switch (typeof value) {
    case "boolean":
      return { booleanValue: value };
    case "number":
      return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
    case "object":
      return {
        mapValue: {
          fields: Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, toFs(v)]),
          ),
        },
      };
    default:
      return { stringValue: String(value) };
  }
}

export function fromFs(value: FsValue | undefined): JsonValue {
  if (!value) return null;
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value['stringValue'] as string;
  if ("booleanValue" in value) return value['booleanValue'] as boolean;
  if ("integerValue" in value) return Number(value['integerValue']);
  if ("doubleValue" in value) return value['doubleValue'] as number;
  if ("timestampValue" in value) return value['timestampValue'] as string;
  if ("arrayValue" in value) {
    const arr = (value['arrayValue'] as { values?: FsValue[] }).values ?? [];
    return arr.map(fromFs);
  }
  if ("mapValue" in value) {
    const fields = (value['mapValue'] as { fields?: Record<string, FsValue> }).fields ?? {};
    return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, fromFs(v)]));
  }
  return null;
}

function docsBase(): string {
  return `https://firestore.googleapis.com/v1/projects/${projectId()}/databases/(default)/documents`;
}

async function fsFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await accessToken();
  return fetch(`${docsBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

type Doc = Record<string, JsonValue> & { id: string };

function shape(doc: { name?: string; fields?: Record<string, FsValue> }): Doc {
  const id = (doc.name ?? "").split("/").pop() ?? "";
  const fields = Object.fromEntries(
    Object.entries(doc.fields ?? {}).map(([k, v]) => [k, fromFs(v)]),
  ) as Record<string, JsonValue>;
  return { ...fields, id };
}

/** Read one document (server-side, bypasses security rules). */
export async function adminGetDoc(col: string, id: string): Promise<Doc | null> {
  const res = await fsFetch(`/${col}/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore read failed: ${await res.text()}`);
  return shape((await res.json()) as { name?: string; fields?: Record<string, FsValue> });
}

/** Query a collection by simple field equality. */
export async function adminQuery(
  col: string,
  filters: Array<{ field: string; op?: string; value: unknown }> = [],
  opts: { limit?: number; orderBy?: { field: string; desc?: boolean } } = {},
): Promise<Doc[]> {
  const where =
    filters.length === 1
      ? {
          fieldFilter: {
            field: { fieldPath: filters[0]!.field },
            op: filters[0]!.op ?? "EQUAL",
            value: toFs(filters[0]!.value),
          },
        }
      : filters.length > 1
        ? {
            compositeFilter: {
              op: "AND",
              filters: filters.map((f) => ({
                fieldFilter: {
                  field: { fieldPath: f.field },
                  op: f.op ?? "EQUAL",
                  value: toFs(f.value),
                },
              })),
            },
          }
        : undefined;

  const res = await fsFetch(":runQuery", {
    method: "POST",
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: col }],
        ...(where ? { where } : {}),
        ...(opts.orderBy
          ? {
              orderBy: [
                {
                  field: { fieldPath: opts.orderBy.field },
                  direction: opts.orderBy.desc ? "DESCENDING" : "ASCENDING",
                },
              ],
            }
          : {}),
        ...(opts.limit ? { limit: opts.limit } : {}),
      },
    }),
  });
  if (!res.ok) throw new Error(`Firestore query failed: ${await res.text()}`);
  const rows = (await res.json()) as Array<{
    document?: { name?: string; fields?: Record<string, FsValue> };
  }>;
  return rows.filter((r) => r.document).map((r) => shape(r.document!));
}

/** Create or merge a document at a known id. */
export async function adminSetDoc(
  col: string,
  id: string,
  data: Record<string, unknown>,
): Promise<void> {
  const payload = { ...data, id };
  const mask = Object.keys(payload)
    .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join("&");
  const res = await fsFetch(`/${col}/${encodeURIComponent(id)}?${mask}`, {
    method: "PATCH",
    body: JSON.stringify({
      fields: Object.fromEntries(Object.entries(payload).map(([k, v]) => [k, toFs(v)])),
    }),
  });
  if (!res.ok) throw new Error(`Firestore write failed: ${await res.text()}`);
}

/** Create a document with a generated id; returns the id. */
export async function adminAddDoc(col: string, data: Record<string, unknown>): Promise<string> {
  const res = await fsFetch(`/${col}`, {
    method: "POST",
    body: JSON.stringify({
      fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toFs(v)])),
    }),
  });
  if (!res.ok) throw new Error(`Firestore create failed: ${await res.text()}`);
  const doc = shape((await res.json()) as { name?: string });
  await adminSetDoc(col, doc.id, { id: doc.id });
  return doc.id;
}

/** Verify a Firebase ID token and return its uid + claims. */
export async function verifyIdToken(
  idToken: string,
): Promise<{ uid: string; email?: string; role?: string }> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${projectId()}/accounts:lookup`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await accessToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idToken }),
    },
  );
  if (!res.ok) throw new Error("Invalid session");
  const json = (await res.json()) as {
    users?: Array<{ localId: string; email?: string; customAttributes?: string }>;
  };
  const user = json.users?.[0];
  if (!user) throw new Error("Invalid session");
  let role: string | undefined;
  try {
    role = user.customAttributes
      ? (JSON.parse(user.customAttributes) as { role?: string }).role
      : undefined;
  } catch {
    role = undefined;
  }
  return { uid: user.localId, email: user.email, role };
}

/** Set the `role` custom claim for a user (admin-only callers). */
export async function setUserRole(uid: string, role: "admin" | "staff" | "user"): Promise<void> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${projectId()}/accounts:update`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await accessToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ localId: uid, customAttributes: JSON.stringify({ role }) }),
    },
  );
  if (!res.ok) throw new Error(`Failed to set role: ${await res.text()}`);
}