import { failure, type ActionState } from "@naruto-ccg/shared";
import { ServiceError } from "./client";

/**
 * Wrap a Server Action body: expected ServiceErrors become form errors; anything else
 * (including Next's redirect/notFound signals) is re-thrown untouched.
 */
export async function guard(fn: () => Promise<NonNullable<ActionState>>): Promise<NonNullable<ActionState>> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ServiceError) return failure(e.message, e.field ? { [e.field]: e.message } : undefined);
    throw e;
  }
}
