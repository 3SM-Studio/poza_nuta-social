import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminEmpty } from "./admin-empty";
import { AdminNotice } from "./admin-notice";
import { ReadUnavailable } from "./read-unavailable";

describe("Admin feedback", () => {
  it("announces an operational error without presenting a failed read as empty data", () => {
    const html = renderToStaticMarkup(<ReadUnavailable title="kampanii" />);
    expect(html).toContain('data-slot="alert"');
    expect(html).toContain('role="alert"');
    expect(html).toContain('role="heading" aria-level="1"');
    expect(html).toContain("Brak odczytu nie oznacza pustej listy ani zerowej aktywności");
  });

  it("uses a polite status for success and no alert role for static information", () => {
    const success = renderToStaticMarkup(<AdminNotice tone="success">Zaproszenie zapisano.</AdminNotice>);
    const info = renderToStaticMarkup(<AdminNotice tone="info">Dostęp tylko do odczytu.</AdminNotice>);
    expect(success).toContain('role="status"');
    expect(success).not.toContain('role="alert"');
    expect(info).not.toContain('role="alert"');
    expect(info).not.toContain('role="status"');
  });

  it("gives a meaningful empty state a heading, explanation and semantic action", () => {
    const html = renderToStaticMarkup(<AdminEmpty title="Brak kampanii" description="Utwórz kampanię w katalogu." action={<a href="/admin/campaigns">Przejdź do kampanii</a>} />);
    expect(html).toContain('data-slot="empty"');
    expect(html).toContain('role="heading" aria-level="3"');
    expect(html).toContain("Utwórz kampanię w katalogu.");
    expect(html).toContain('href="/admin/campaigns"');
  });
});
