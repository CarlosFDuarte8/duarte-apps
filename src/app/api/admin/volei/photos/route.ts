import {
  mobilePhotoPreflight,
  serveMobilePhotos,
} from "@/lib/volei/mobile-photos";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  return serveMobilePhotos(request);
}
export function OPTIONS(request: Request) {
  return mobilePhotoPreflight(request);
}
