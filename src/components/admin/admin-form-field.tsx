"use client";

import type { ReactNode } from "react";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

type ControlA11y = { id: string; name: string; "aria-invalid": true | undefined; "aria-describedby": string | undefined };

function AdminFormField({ name, label, description, error, children }: {
  name: string;
  label: string;
  description?: string;
  error?: string;
  children: (props: ControlA11y) => ReactNode;
}) {
  const descriptionId = description ? `${name}-description` : null;
  const errorId = error ? `${name}-error` : null;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return <Field data-invalid={Boolean(error)}>
    <FieldLabel htmlFor={name}>{label}</FieldLabel>
    {children({ id: name, name, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
    {description ? <FieldDescription id={descriptionId!}>{description}</FieldDescription> : null}
    {error ? <FieldError id={errorId!}>{error}</FieldError> : null}
  </Field>;
}

export function AdminInputField({ name, label, description, error, ...props }: {
  name: string; label: string; description?: string; error?: string;
} & Omit<React.ComponentProps<typeof Input>, "id" | "name" | "aria-invalid" | "aria-describedby">) {
  return <AdminFormField name={name} label={label} description={description} error={error}>
    {(a11y) => <Input {...props} {...a11y} />}
  </AdminFormField>;
}

export function AdminNativeSelectField({ name, label, description, error, children, ...props }: {
  name: string; label: string; description?: string; error?: string; children: ReactNode;
} & Omit<React.ComponentProps<typeof NativeSelect>, "id" | "name" | "aria-invalid" | "aria-describedby" | "children">) {
  return <AdminFormField name={name} label={label} description={description} error={error}>
    {(a11y) => <NativeSelect {...props} {...a11y}>{children}</NativeSelect>}
  </AdminFormField>;
}
