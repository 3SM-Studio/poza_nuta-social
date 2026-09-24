import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { Analytics } from "@/lib/analytics";

// Next's route segment config must be a statically analyzable literal.
export const revalidate = 60;

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col px-5 pt-2 sm:px-8 lg:px-10">
      <Analytics />
      <PublicHeader />
      {children}
      <PublicFooter />
    </div>
  );
}
