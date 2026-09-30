import { permanentRedirect } from "next/navigation";
import { publicPage } from "@/lib/public-paths";

export default function LegacyPrivacyRedirect() {
  permanentRedirect(publicPage.privacy);
}
