/**
 * A do-nothing replacement for @supabase/realtime-js.
 *
 * WHY THIS EXISTS. supabase-js constructs a RealtimeClient in the
 * SupabaseClient constructor -- `this.realtime = this._initRealtimeClient(...)`
 * -- so the whole Phoenix-channels/WebSocket stack is reachable code and a
 * bundler cannot drop it, however unused it is. This app never opens a
 * realtime subscription: there is no .channel(), no .subscribe(), no
 * postgres_changes anywhere in the storefront OR the admin. The admin's
 * new-orders banner even says in its own comment that it polls precisely
 * to avoid introducing a websocket.
 *
 * next.config.ts aliases the package to this file, so that code stops
 * being shipped.
 *
 * WHAT SUPABASE ACTUALLY CALLS on the realtime client, checked against
 * supabase-js 2.110.7 rather than assumed -- the full list is five
 * methods: setAuth, channel, getChannels, removeChannel, removeAllChannels.
 * Only setAuth is ever reached in normal operation (on every auth state
 * change and token refresh), and supabase-js already wraps that call in
 * .catch(), so even a throwing stub could not break auth. The other four
 * are only reachable by calling the realtime API this app does not use.
 *
 * IF REALTIME IS EVER NEEDED: delete the alias in next.config.ts. Nothing
 * else has to change -- no application code imports this file directly.
 *
 * The named exports below mirror realtime-js's public surface because
 * supabase-js re-exports it wholesale (`export * from
 * "@supabase/realtime-js"`). Nothing in this app imports any of them; they
 * exist so the re-export resolves rather than failing a build later if
 * something does.
 *
 * Parameters are omitted throughout rather than typed as any[]:
 * JavaScript ignores extra arguments, so supabase-js passing its options
 * object to a zero-arg method is harmless, and it keeps the file free of
 * `any`.
 */

export class RealtimeClient {
  // The constructor signature is irrelevant -- supabase-js passes its
  // options object and never inspects the result beyond the methods below.
  constructor() {}

  /**
   * The only method reached in normal use. supabase-js calls it with the
   * current access token whenever auth state changes. A no-op is correct:
   * there is no socket to authenticate.
   */
  setAuth(): void {}

  /** Returns nothing subscribable, because nothing here subscribes. */
  getChannels(): unknown[] {
    return [];
  }

  removeChannel(): Promise<string> {
    return Promise.resolve("ok");
  }

  removeAllChannels(): Promise<string[]> {
    return Promise.resolve([]);
  }

  /**
   * Loud on purpose. Reaching this means somebody started using realtime
   * while the alias is still in place, and a silent no-op would be a
   * subscription that never fires -- far harder to diagnose than a throw.
   */
  channel(): never {
    throw new Error(
      "Supabase realtime is not bundled in this app (see lib/supabase/realtime-stub.ts). " +
        "Remove the resolveAlias in next.config.ts to use channels.",
    );
  }

  connect(): void {}
  disconnect(): void {}
}

// Re-export surface, so `export * from "@supabase/realtime-js"` inside
// supabase-js still resolves. Values, not types, because the real package
// exports these as runtime values too.
export class RealtimeChannel {}
export class RealtimePresence {}
export class RealtimePostgresFilterBuilder {}
export class WebSocketFactory {}

export const postgresChangesFilter = () => ({});

export const REALTIME_LISTEN_TYPES = {} as Record<string, string>;
export const REALTIME_POSTGRES_CHANGES_LISTEN_EVENT = {} as Record<string, string>;
export const REALTIME_PRESENCE_LISTEN_EVENTS = {} as Record<string, string>;
export const REALTIME_SUBSCRIBE_STATES = {} as Record<string, string>;
export const REALTIME_CHANNEL_STATES = {} as Record<string, string>;
