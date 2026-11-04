import { mobilePhotoUpload } from "@/lib/volei/mobile-photo-upload";
import { mobileOptions } from "@/lib/volei/mobile-auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = mobilePhotoUpload;
export const DELETE = mobilePhotoUpload;
export const OPTIONS = mobileOptions;
