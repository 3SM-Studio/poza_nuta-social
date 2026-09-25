export type AdminFormState<Field extends string = string> = {
  status: "idle" | "invalid" | "saved";
  submission: number;
  values: Partial<Record<Field, string>>;
  fieldErrors: Partial<Record<Field, string>>;
  formError: string | null;
};

export const initialAdminFormState: AdminFormState = {
  status: "idle",
  submission: 0,
  values: {},
  fieldErrors: {},
  formError: null,
};

export function invalidAdminForm<Field extends string>(
  previous: AdminFormState<Field>,
  values: Partial<Record<Field, string>>,
  fieldErrors: Partial<Record<Field, string>>,
  formError: string | null = null,
): AdminFormState<Field> {
  return { status: "invalid", submission: previous.submission + 1, values, fieldErrors, formError };
}

export function savedAdminForm<Field extends string>(previous: AdminFormState<Field>): AdminFormState<Field> {
  return { status: "saved", submission: previous.submission + 1, values: {}, fieldErrors: {}, formError: null };
}
