/**
 * Turns any thrown value into a message that is safe to show a user.
 *
 * Errors coming back from the database or the auth service carry internal detail
 * (table and column names, constraint names, policy behaviour), so they are logged
 * for the developer and never rendered. The caller supplies the sentence the user
 * should see instead.
 */
export function toUserMessage(err: unknown, fallback: string): string {
  console.error(fallback, err);
  return fallback;
}
