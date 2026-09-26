import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { Analytics } from "@/lib/analytics";

// Next's route segment config must be a statically analyzable literal.
export const revalidate = 60;

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-svh w-full flex-col">
      <Analytics />
      <PublicHeader />
      {children}
      <PublicFooter />
    </div>
  );
}
