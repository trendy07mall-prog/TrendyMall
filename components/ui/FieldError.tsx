// A shared error-message primitive so `role="alert"` lands consistently
// everywhere a validation/submission error can appear, instead of the
// same plain, silent-to-screen-readers paragraph being repeated at each
// call site.
export function FieldError({ id, message }: { id?: string; message: string }) {
  return (
    <p id={id} role="alert" className="text-xs text-red-600">
      {message}
    </p>
  );
}
