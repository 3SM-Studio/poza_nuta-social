import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminInputField, AdminNativeSelectField } from "./admin-form-field";
import { NativeSelectOption } from "@/components/ui/native-select";

describe("Admin form fields", () => {
  it("associates label, description and validation error with an input", () => {
    const html = renderToStaticMarkup(<AdminInputField name="slug" label="Slug" description="Identyfikator kampanii" error="Niepoprawny slug" defaultValue="!" />);
    expect(html).toContain('for="slug"');
    expect(html).toContain('id="slug"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="slug-description slug-error"');
    expect(html).toContain('id="slug-error"');
    expect(html).toContain('role="alert"');
    expect(html).toContain('value="!"');
  });

  it("keeps a native select and gives it the same error contract", () => {
    const html = renderToStaticMarkup(<AdminNativeSelectField name="channelGroup" label="Kanał" error="Wybierz kanał" defaultValue="offline">
      <NativeSelectOption value="offline">Offline</NativeSelectOption>
    </AdminNativeSelectField>);
    expect(html).toContain('data-slot="native-select"');
    expect(html).toContain('for="channelGroup"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="channelGroup-error"');
    expect(html).toContain('role="alert"');
  });

  it("does not mark a valid control invalid", () => {
    const html = renderToStaticMarkup(<AdminInputField name="name" label="Nazwa" />);
    expect(html).not.toContain('aria-invalid="true"');
    expect(html).not.toContain('role="alert"');
  });
});
