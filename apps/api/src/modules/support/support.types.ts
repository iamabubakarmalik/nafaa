/**
 * Nafaa Live Support: the shared contract between the API, the admin app and
 * the merchant web app. Plain TypeScript only (no Nest or Prisma imports), so
 * the clients can copy or mirror it as it is.
 *
 * Transport:
 *   - REST for everything that changes data (send, edit, rate, settings).
 *     Merchant endpoints live under /api/support, admin ones under
 *     /api/admin/support (see SUPPORT_REST below).
 *   - socket.io namespace `/realtime` (the existing app socket, same JWT) for
 *     live updates, typing, read receipts, presence and call signalling.
 *     Event names are in SUPPORT_EVENTS.
 *
 * Dates are ISO strings in every payload.
 */

/* ───────────────────────── enums ───────────────────────── */

export const SUPPORT_STATUSES = ['BOT', 'WAITING', 'OPEN', 'PENDING_MERCHANT', 'RESOLVED', 'CLOSED'] as const;
/**
 * BOT              Nafaa AI is answering; no person involved yet.
 * WAITING          The merchant asked for a person; nobody has replied yet.
 * OPEN             A team member is on it and the merchant wrote last (needs a reply).
 * PENDING_MERCHANT The team replied last; waiting on the merchant.
 * RESOLVED         Marked solved. A new merchant message reopens it.
 * CLOSED           Finished for good. A new merchant message starts a new conversation.
 */
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export const SUPPORT_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
export type SupportPriority = (typeof SUPPORT_PRIORITIES)[number];

export const SUPPORT_SENDERS = ['MERCHANT', 'ADMIN', 'BOT', 'SYSTEM'] as const;
export type SupportSender = (typeof SUPPORT_SENDERS)[number];

export const SUPPORT_MESSAGE_KINDS = ['TEXT', 'IMAGE', 'FILE', 'VOICE', 'CALL_EVENT', 'SYSTEM'] as const;
export type SupportMessageKind = (typeof SUPPORT_MESSAGE_KINDS)[number];

export const SUPPORT_SOURCES = ['web', 'mobile', 'admin-started', 'proactive'] as const;
export type SupportSource = (typeof SUPPORT_SOURCES)[number];

/** Merchant app languages: English, Urdu script, Roman Urdu. */
export type SupportLang = 'en' | 'ur' | 'roman';

/** A merchant-facing text in all three languages (settings store these). */
export interface SupportLocalized { en: string; ur: string; roman: string }

/** Presence of the support team as the merchant sees it. */
export type SupportAgentState = 'online' | 'away' | 'offline';

/* ───────────────────────── limits ───────────────────────── */

export const SUPPORT_LIMITS = {
  /** Largest attachment (images, PDFs, voice notes). */
  maxFileBytes: 15 * 1024 * 1024,
  /** Largest call or screen recording file (longer recordings arrive in several parts). */
  maxRecordingBytes: 95 * 1024 * 1024,
  /** Longest voice note. */
  maxVoiceSec: 120,
  /** Longest text message. */
  maxTextChars: 4000,
  /** Attachments on one message. */
  maxAttachments: 5,
  /** A message can be edited by its sender for this long. */
  editWindowMinutes: 15,
  /** Send rate per person: burst and per-minute caps (HTTP 429 above them). */
  rate: { burstMax: 5, burstWindowMs: 5_000, minuteMax: 30 },
} as const;

/** Upload types the server accepts (codec parameters such as ";codecs=opus" are ignored). Anything else (executables, archives, scripts) is refused. */
export const SUPPORT_ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/wav', 'audio/x-m4a',
  'video/webm', // MediaRecorder in some browsers labels audio-only recordings as video/webm
] as const;

/* ───────────────────────── messages ───────────────────────── */

export interface SupportAttachment {
  url: string;
  name: string;
  mime: string;
  bytes: number;
  width?: number | null;
  height?: number | null;
  /** Voice notes. */
  durationSec?: number | null;
  /** Voice notes: 0..1 bar heights for the preview (at most 64 values). */
  waveform?: number[] | null;
  /**
   * Call recordings on a CALL_EVENT line (admin view only; never sent to shops):
   * 'call' = the mixed audio of both sides, 'screen' = the shared screen with that audio.
   */
  recording?: 'call' | 'screen' | null;
  /** Recordings: when this part started (ISO). */
  startedAt?: string | null;
}

/** An earlier version of an edited message (admin view only). */
export interface SupportMessageVersion {
  text: string | null;
  /** When this version was written (the message time, or the previous edit). */
  at: string;
  /** User id of the person who wrote this version. */
  by: string | null;
}

/**
 * Machine codes for SYSTEM messages, so each app can show them in its own
 * language. The server also writes `text` in the merchant's language
 * (their language setting), so showing `text` as-is is fine.
 */
export type SupportSystemCode =
  | 'agent_joined'      // params.name: "Ahmed (Nafaa team) chat mein shamil ho gaye"
  | 'handover'          // merchant asked for the support team (never say "human" / "insaan")
  | 'transferred'       // params.name: new agent
  | 'resolved'
  | 'reopened'
  | 'closed'
  | 'away'              // nobody online: away message + expected reply time in text
  | 'welcome'
  | 'rated';            // params.rating: 'up' | 'down'

export type SupportCallMedia = 'voice' | 'screen';
export type SupportCallOutcome = 'completed' | 'missed' | 'declined' | 'failed';

export interface SupportMessageMeta {
  /** SYSTEM messages. */
  code?: SupportSystemCode;
  params?: Record<string, string | number | null>;
  /** CALL_EVENT messages. */
  call?: {
    callId: string;
    media: SupportCallMedia;
    outcome: SupportCallOutcome;
    startedBy: 'MERCHANT' | 'ADMIN';
    durationSec: number;
    startedAt: string;
    endedAt: string;
    /** The team recorded this call (audio) and/or a shared screen. Files are on the line's attachments (admin view). */
    recorded?: { audio: boolean; screen: boolean };
  };
  /** BOT and proactive messages: chips to show under the message. Tapping one sends its text. */
  chips?: string[];
  /**
   * Proactive team message (welcome, trial reminders …): pop a preview once.
   * Phones get a push for team and proactive messages while no app of the shop is
   * connected: data { kind: 'support', link: '/support', conversationId },
   * Android channel "nafaa-support", iOS sound "bell.wav" (silent in the person's quiet hours).
   */
  proactive?: SupportProactiveKey;
  /** Display name to show instead of the sender's own (proactive messages use the configured agent name). */
  senderName?: string;
  /** BOT messages: the AI could not answer; show the "Talk to our team" button prominently. */
  offerHandover?: boolean;
}

export interface SupportReplyPreview {
  id: string;
  sender: SupportSender;
  kind: SupportMessageKind;
  /** First 140 characters, or null for attachments only. */
  text: string | null;
  deleted: boolean;
}

export interface SupportMessage {
  id: string;
  conversationId: string;
  sender: SupportSender;
  senderUserId: string | null;
  /** Display name: the agent's first name for ADMIN, the user's name for MERCHANT, null for BOT/SYSTEM. */
  senderName: string | null;
  kind: SupportMessageKind;
  /** Null when deleted. */
  text: string | null;
  attachments: SupportAttachment[];
  replyTo: SupportReplyPreview | null;
  meta: SupportMessageMeta | null;
  /** Echo of the sender's temporary id, so the sending client can swap its optimistic bubble. */
  clientId: string | null;
  /** Ticks: sent = createdAt, delivered = deliveredAt, read = readAt (set by the other side). */
  deliveredAt: string | null;
  readAt: string | null;
  editedAt: string | null;
  deletedAt: string | null;
  /** Admin-only note. Never sent to merchants. */
  internal: boolean;
  createdAt: string;

  /* Admin view only (never in merchant payloads). In the admin view a deleted
     message keeps its text and attachments until a super admin purges it. */
  /** Earlier versions of an edited message, oldest first. */
  history?: SupportMessageVersion[];
  deletedBy?: 'MERCHANT' | 'ADMIN' | null;
  deletedByName?: string | null;
  /** Content removed for good by a super admin: only this tombstone remains. */
  purgedAt?: string | null;
  purgedByName?: string | null;
}

/* ───────────────────────── conversations ───────────────────────── */

export interface SupportAgentRef {
  id: string;
  /** First name only for merchants. */
  name: string;
  avatarUrl: string | null;
  state: SupportAgentState;
  lastSeenAt: string | null;
}

/** A conversation as the merchant sees it. */
export interface SupportConversation {
  id: string;
  tenantId: string;
  shopId: string | null;
  subject: string | null;
  status: SupportStatus;
  source: SupportSource;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  /** Unread for the viewer's side. */
  unread: number;
  assignedAgent: SupportAgentRef | null;
  rating: 'up' | 'down' | null;
  ratingNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

/** A conversation as an admin sees it (list rows and the open view). */
export interface SupportAdminConversation extends SupportConversation {
  priority: SupportPriority;
  tags: string[];
  assignedAdminId: string | null;
  unreadForMerchant: number;
  unreadForAdmin: number;
  /** Start of the current wait for a team reply (WAITING / OPEN); null when the team replied last. */
  waitingSince: string | null;
  firstResponseAt: string | null;
  tenant: { id: string; name: string; phone: string | null; businessType: string | null; status: string };
  openedBy: { id: string; name: string; email: string | null; phone: string | null } | null;
  /** A merchant socket of this shop is connected right now. */
  merchantOnline: boolean;
}

export interface SupportPage<T> {
  items: T[];
  /** Pass as `before` (messages) or `cursor` (conversations) for the next page; null at the end. */
  nextCursor: string | null;
}

export interface SupportAdminListCounts {
  /** Conversations needing a human reply (WAITING + OPEN). */
  needsReply: number;
  waiting: number;
  mine: number;
  unassigned: number;
  /** Conversations with unread merchant messages. */
  unread: number;
}

/* ───────────────────────── merchant status ───────────────────────── */

/** RTCIceServer as the browser expects it. */
export interface SupportIceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

/** GET /support/status: everything the chat widget needs before the first message. */
export interface SupportStatusInfo {
  team: { state: SupportAgentState; online: number; away: number; lastSeenAt: string | null };
  withinHours: boolean;
  /** e.g. "Mon–Sat 09:00–21:00 (PKT)". */
  hoursText: string;
  /** Language the texts below are in (the merchant's language setting). */
  lang: SupportLang;
  /** Already in `lang`. */
  welcomeMessage: string;
  /** Already in `lang`. Shown when team.state is not online or outside hours. */
  awayMessage: string;
  /** Short status line in `lang`, e.g. "Team online hai, abhi reply milega". */
  teamLine: string;
  /** Typical first reply time in minutes during working hours. */
  expectedReplyMinutes: number;
  aiEnabled: boolean;
  /** Quick-reply chips (common questions) for an empty chat, in `lang`. Sending a chip = sending its label as text. */
  quickReplies: Array<{ id: string; label: string }>;
  iceServers: SupportIceServer[];
  /** From Support settings; empty string = do not show. */
  supportPhone: string;
  /** Digits for https://wa.me/<digits>; empty string = do not show. */
  supportWhatsapp: string;
  limits: typeof SUPPORT_LIMITS;
  allowedMime: readonly string[];
  /** Total unread across the merchant's conversations (badge). */
  unread: number;
  /**
   * Newest unread message from the team (or Nafaa AI), for the bubble to pop a
   * preview once (remember the id on the client). `proactive` is true for
   * welcome / check-in messages the team system sent first.
   */
  latestUnread: { conversationId: string; message: SupportMessage; proactive: boolean } | null;
  /** The shop turned proactive check-ins off (PUT support/proactive). */
  proactiveOff: boolean;
}

/* ───────────────────────── proactive messages ───────────────────────── */

export const SUPPORT_PROACTIVE_KEYS = ['welcome', 'day1_no_products', 'first_sale', 'inactive_3d', 'trial_ending', 'trial_ended'] as const;
/**
 * welcome           first dashboard visit, or 2 minutes after sign-up
 * day1_no_products  a day after sign-up with no product yet
 * first_sale        the shop's first sale (in the last 3 days)
 * inactive_3d       on trial and not seen for 3 days
 * trial_ending      trial ends within 2 days
 * trial_ended       trial ended (last 14 days), not paid
 * Each goes once per shop, at most one per day, never 22:00–09:00 PKT (queued),
 * never to suspended or paused shops, and check-ins stop when the shop turns them off.
 */
export type SupportProactiveKey = (typeof SUPPORT_PROACTIVE_KEYS)[number];

/** Template variables: {{owner}} {{agent}} {{shop}} {{products}} {{bills}} {{customers}} {{trialEnd}} {{planLink}} {{days}} */
export interface SupportProactiveMessage {
  enabled: boolean;
  template: SupportLocalized;
  /** Chips under the message, per language. */
  chips: SupportLocalized[];
}

export interface SupportProactiveSettings {
  enabled: boolean;
  /** Team member the messages come from (default: the first super admin). */
  agentUserId: string | null;
  /** Name shown on the messages and used for {{agent}}; empty = the agent's own first name. */
  agentName: string | null;
  /** No proactive messages in this window (PKT); they wait until it ends. */
  quietHours: { start: string; end: string };
  /** Welcome only shops created within this many days (so older shops are not welcomed again). */
  welcomeMaxAgeDays: number;
  messages: Record<SupportProactiveKey, SupportProactiveMessage>;
}

export interface SupportProactiveStats {
  key: SupportProactiveKey;
  sent: number;
  replied: number;
  /** Shops that started a paid plan within 14 days of the message. */
  converted: number;
  lastSentAt: string | null;
}

/* ───────────────────────── settings (admin) ───────────────────────── */

export interface SupportWorkingHours {
  /** Days the team works, 0 = Sunday … 6 = Saturday (Pakistan time). */
  days: number[];
  /** "HH:MM" Pakistan time. */
  start: string;
  end: string;
}

export interface SupportSettings {
  workingHours: SupportWorkingHours;
  welcomeMessage: SupportLocalized;
  awayMessage: SupportLocalized;
  expectedReplyMinutes: number;
  aiFirstResponder: boolean;
  /** none: agents pick conversations; round_robin: among agents online right now. */
  autoAssign: 'none' | 'round_robin';
  /** Email the merchant when an agent replies and they are not in the app. */
  offlineEmail: boolean;
  /** Admin app sounds. */
  sounds: { newConversation: boolean; newMessage: boolean };
  /** Admin auto-away after this many idle minutes. */
  autoAwayMinutes: number;
  /** Shown to shops (call us). Empty = hidden. */
  supportPhone: string;
  /** Digits for wa.me, e.g. 923241772933. Empty = hidden. */
  supportWhatsapp: string;
  /** The admin app records the audio of every support call (both sides are told). */
  recordCalls: boolean;
  proactive: SupportProactiveSettings;
}

export interface SupportCannedReply {
  id: string;
  title: string;
  text: string;
  tags: string[];
  language: SupportLang;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ───────────────────────── request bodies ───────────────────────── */

export interface SupportStartBody {
  /** First message (optional: the chat may open empty). */
  text?: string;
  subject?: string;
  source?: 'web' | 'mobile';
  /** Merchant asked for the support team right away (skips the AI). */
  human?: boolean;
}

export interface SupportSendBody {
  text?: string;
  /** Defaults from the attachments: VOICE for audio, IMAGE for images, FILE otherwise, TEXT when none. */
  kind?: 'TEXT' | 'IMAGE' | 'FILE' | 'VOICE';
  attachments?: SupportAttachment[];
  replyToId?: string;
  clientId?: string;
  /** Admin only: internal note. */
  internal?: boolean;
}

export interface SupportRateBody { rating: 'up' | 'down'; note?: string }

export interface SupportAdminUpdateBody {
  status?: SupportStatus;
  priority?: SupportPriority;
  tags?: string[];
  /** null = unassign. */
  assignedAdminId?: string | null;
  subject?: string | null;
}

/* ───────────────────────── socket events ───────────────────────── */

/**
 * Rooms (joined by the server, never by name from the client):
 *   support:tenant:<tenantId>   every merchant socket of the shop (auto on connect)
 *   support:agents              every admin socket with support.view (auto on connect)
 *   support:conv:<id>           sockets that opened the conversation (support:join)
 */
export const SUPPORT_EVENTS = {
  /* client → server (all reply with an ack { ok, error? }) */
  join: 'support:join',                 // { conversationId } → ack { ok, presence?: SupportPresenceEvent }
  leave: 'support:leave',               // { conversationId }
  typing: 'support:typing',             // { conversationId, typing: boolean }
  read: 'support:read',                 // { conversationId }   marks the other side's messages read
  delivered: 'support:delivered',       // { conversationId }   marks the other side's messages delivered
  setPresence: 'support:presence:set',  // admin only: { state: 'online' | 'away' }

  /* call signalling (client → server → the other side in the conversation room) */
  callInvite: 'support:call:invite',    // SupportCallInvite
  callAccept: 'support:call:accept',    // { conversationId, callId }
  callDecline: 'support:call:decline',  // { conversationId, callId }
  callCancel: 'support:call:cancel',    // { conversationId, callId }  caller hung up before answer (missed)
  callSignal: 'support:call:signal',    // SupportCallSignal (offer / answer / ice)
  callMedia: 'support:call:media',      // { conversationId, callId, screen: boolean, muted: boolean }
  callEnd: 'support:call:end',          // { conversationId, callId }
  callRecording: 'support:call:recording', // admin only: SupportCallRecording → the shop side of the call (show the notice)

  /* server → client */
  message: 'support:message',           // SupportMessageEvent
  messageUpdated: 'support:message:updated', // SupportMessageEvent (edit / delete)
  conversation: 'support:conversation', // SupportConversationEvent (status, assignment, unread, preview)
  typingEvent: 'support:typing',        // SupportTypingEvent (same name as the client event)
  readEvent: 'support:read',            // SupportReceiptEvent
  deliveredEvent: 'support:delivered',  // SupportReceiptEvent
  presence: 'support:presence',         // SupportPresenceEvent (team state for merchants; agents list for admins)
  /* call events server → client use the same names as above, with `from` added:
     callInvite → rings the other side (all agents, or every app of the shop)
     callAccept → to the caller only (start the WebRTC offer then)
     callCancel → stop ringing ({ reason: 'cancelled' | 'missed' | 'declined' | 'answered_elsewhere' | 'ended' })
     callDecline → to the caller
     callSignal / callMedia → only between the two sockets in the call
     callEnd → to the other party ({ reason: 'ended' | 'missed' | 'disconnected' })
     Unanswered invites end as missed after 45 s. One CALL_EVENT message is logged per call. */
} as const;

export type SupportSide = 'MERCHANT' | 'ADMIN' | 'BOT';

export interface SupportMessageEvent { conversationId: string; message: SupportMessage }

export interface SupportConversationEvent {
  /** Merchants get SupportConversation; admins get SupportAdminConversation. */
  conversation: SupportConversation | SupportAdminConversation;
  /** Admins: sent only to the agent it was just assigned to. */
  assignedToYou?: boolean;
}

export interface SupportTypingEvent { conversationId: string; side: SupportSide; name: string | null; typing: boolean }

export interface SupportReceiptEvent {
  conversationId: string;
  /** Whose messages were marked: MERCHANT means the merchant's messages were read by the team. */
  of: 'MERCHANT' | 'ADMIN';
  at: string;
}

export interface SupportPresenceEvent {
  team: SupportStatusInfo['team'];
  /** The agent on a conversation, when the event is about one. */
  agent?: SupportAgentRef | null;
  /** Admins only: every agent. */
  agents?: SupportAgentRef[];
}

export interface SupportCallInvite {
  conversationId: string;
  /** Client-made unique id (uuid) for this call. */
  callId: string;
  media: SupportCallMedia;
}

export interface SupportCallSignal {
  conversationId: string;
  callId: string;
  type: 'offer' | 'answer' | 'ice';
  /** RTCSessionDescriptionInit for offer / answer. */
  sdp?: { type: string; sdp?: string };
  /** RTCIceCandidateInit for ice. */
  candidate?: { candidate?: string; sdpMid?: string | null; sdpMLineIndex?: number | null; usernameFragment?: string | null } | null;
}

/**
 * What the team is recording right now. The shop side shows "This call is
 * recorded …" while `audio` is on and "Screen is being recorded" while
 * `screen` is on. `error` (admin → server only) is logged when recording
 * could not start; the call goes on.
 */
export interface SupportCallRecording {
  conversationId: string;
  callId: string;
  audio: boolean;
  screen: boolean;
  error?: string;
}

/** What the other side receives for every call event: the payload plus who sent it. */
export type SupportCallRelay<T> = T & { from: { side: 'MERCHANT' | 'ADMIN'; name: string | null } };

/* ───────────────────────── REST map ───────────────────────── */

/** Paths relative to /api. */
export const SUPPORT_REST = {
  merchant: {
    status: 'GET support/status',                                 // SupportStatusInfo
    unread: 'GET support/unread',                                 // { unread: number }
    list: 'GET support/conversations',                            // SupportPage<SupportConversation>  ?cursor
    current: 'GET support/conversations/current',                 // SupportConversation | null (latest not CLOSED)
    // Returns the shop's active conversation (any status except CLOSED) or opens a fresh one,
    // then posts `text` into it. After CLOSED, this always opens a new conversation.
    // Sending to a CLOSED conversation via `send` also moves the message into a new one
    // (the returned message carries the new conversationId).
    start: 'POST support/conversations',                          // SupportStartBody → { conversation, messages }
    get: 'GET support/conversations/:id',                         // SupportConversation
    messages: 'GET support/conversations/:id/messages',           // SupportPage<SupportMessage>  ?before=<messageId>&limit
    send: 'POST support/conversations/:id/messages',              // SupportSendBody → SupportMessage
    handover: 'POST support/conversations/:id/handover',          // → SupportConversation
    read: 'POST support/conversations/:id/read',                  // → { ok }
    rate: 'POST support/conversations/:id/rate',                  // SupportRateBody → SupportConversation
    resolve: 'POST support/conversations/:id/resolve',            // merchant says it is solved → SupportConversation
    editMessage: 'PATCH support/messages/:id',                    // { text } → SupportMessage
    deleteMessage: 'DELETE support/messages/:id',                 // → SupportMessage
    upload: 'POST support/uploads',                               // multipart "file" (+ durationSec, waveform JSON, width, height) → SupportAttachment
    proactive: 'PUT support/proactive',                           // { off: boolean } turn check-in messages off / on for the shop
  },
  admin: {
    list: 'GET admin/support/conversations',      // ?status&view=mine|unassigned|all&priority&tag&search&tenantId&tenantIds=a,b&cursor → SupportPage<SupportAdminConversation> & { counts }
    counts: 'GET admin/support/counts',           // SupportAdminListCounts
    get: 'GET admin/support/conversations/:id',   // SupportAdminConversation
    messages: 'GET admin/support/conversations/:id/messages',
    send: 'POST admin/support/conversations/:id/messages',     // SupportSendBody (internal allowed)
    update: 'PATCH admin/support/conversations/:id',           // SupportAdminUpdateBody
    read: 'POST admin/support/conversations/:id/read',
    suggest: 'POST admin/support/conversations/:id/suggest',   // → { drafts: string[] }
    start: 'POST admin/support/start',                         // { tenantId, text?, subject? } → SupportAdminConversation
    bulkStart: 'POST admin/support/start/bulk',                // { tenantIds (≤ 50), text, subject? } → { sent, failed, results[] }
    context: 'GET admin/support/tenants/:tenantId/context',    // merchant context panel
    notify: 'POST admin/support/tenants/:tenantId/notify',     // { title, message, link? }
    email: 'POST admin/support/tenants/:tenantId/email',       // { subject, body }
    sms: 'POST admin/support/tenants/:tenantId/sms',           // { message }
    editMessage: 'PATCH admin/support/messages/:id',
    // Soft: the content stays for the team and is hidden from the shop.
    deleteMessage: 'DELETE admin/support/messages/:id',
    // Super admin only: removes text, files and history for good; a tombstone row stays. Audit-logged.
    purgeMessage: 'DELETE admin/support/messages/:id/permanent',
    upload: 'POST admin/support/uploads',
    // multipart "file" + conversationId, kind ('call' | 'screen'), durationSec, startedAt.
    // Stored and added to the call's CALL_EVENT line (held until the line exists) → { attachment, attached }
    recording: 'POST admin/support/calls/:callId/recordings',
    agents: 'GET admin/support/agents',                        // SupportAgentRef[]
    presence: 'PUT admin/support/presence',                    // { state }
    ice: 'GET admin/support/ice',                              // SupportIceServer[]
    settings: 'GET|PUT admin/support/settings',                // SupportSettings
    canned: 'GET|POST admin/support/canned, PATCH|DELETE admin/support/canned/:id',
    reports: 'GET admin/support/reports',                      // ?from&to (YYYY-MM-DD, PKT)
    tags: 'GET admin/support/tags',                            // string[] in use
    proactiveStats: 'GET admin/support/proactive/stats',       // SupportProactiveStats[]
    proactivePreview: 'POST admin/support/proactive/preview',  // { key, lang, tenantId? } → { text, chips }
    proactiveRun: 'POST admin/support/proactive/run',          // run the check now (respects every rule) → { sent }
  },
} as const;
