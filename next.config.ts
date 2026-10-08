import type { NextConfig } from "next";
import os from "node:os";

// גישה מהטלפון ברשת הביתית (החלטה 11): Next חוסם בפיתוח origins שאינם
// localhost. מתירים את כל כתובות ה-IP המקומיות של המחשב וגם את שם ה-mDNS
// שלו (macbook-air.local — הכתובת היציבה מהטלפון) — מחושב דינמית, כך
// שהחלפת כתובת ב-DHCP או שינוי שם המחשב לא שוברים את הגישה.
function localDevOrigins(): string[] {
  const origins = new Set<string>(["localhost", "127.0.0.1"]);
  const host = os.hostname();
  origins.add(host);
  origins.add(host.toLowerCase());
  // Cloud runner supplies one exact preview host; no wildcard access to other workspaces.
  const cloudOrigin = process.env.FORCEAPP_DEV_ORIGIN;
  if (cloudOrigin && /^[a-z0-9.-]+$/i.test(cloudOrigin)) origins.add(cloudOrigin);
  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const iface of interfaces ?? []) {
      if (iface.family === "IPv4") origins.add(iface.address);
    }
  }
  return [...origins];
}

const nextConfig: NextConfig = {
  // Isolated local QA can use a separate build cache. Production keeps the default.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  allowedDevOrigins: localDevOrigins(),
  // לקוח Prisma ומנהל החיבורים ל-Postgres נטענים מ-node_modules בזמן ריצה
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
};

export default nextConfig;
