# Security incident response policy

This policy covers any event that may expose or damage merchant data, or the personal data of
merchants' customers, in Nafaa. That includes data received from connected sales channels such as
Shopify, WooCommerce and custom websites.

## Roles

| Role | Who | Responsibility |
|---|---|---|
| Incident lead | Founder / CTO | Owns the incident from detection to close-out |
| Engineer on duty | Backend engineer | Contains the incident, collects evidence, fixes the cause |
| Communications | Founder | Notifies merchants, platforms and, where required, authorities |

Security contact: **pknafaa@gmail.com**

## Severity

- **SEV-1**: confirmed exposure of customer personal data, credentials or access tokens, or an
  attacker with access to production.
- **SEV-2**: a vulnerability that could expose data but has no evidence of exploitation.
- **SEV-3**: a minor issue with no personal data at risk.

## Response steps

1. **Detect and log (within 1 hour).** Open an incident note with the time, reporter, what is
   known, and the systems affected.
2. **Contain (SEV-1 within 4 hours).**
   - Rotate the affected secrets. `FBR_ENCRYPTION_KEY`, the JWT secrets, the database password and
     `SHOPIFY_CLIENT_SECRET` are all rotatable. Old encrypted data stays readable through
     `OLD_ENCRYPTION_KEYS`.
   - Rotate the affected channel API keys (Sales channel → Developer → New key). Pause the affected
     channels.
   - Revoke sessions and block attacker IPs.
3. **Preserve evidence.** Keep application logs, `webhook_logs`, `sync_logs` and `ActivityLog` rows
   for the period. Do not delete them.
4. **Eradicate and recover.** Fix the root cause, deploy, and verify. Restore from an encrypted
   backup if data was altered.
5. **Notify.**
   - **Within 72 hours** of confirming a SEV-1 involving personal data, notify the affected
     merchants.
   - Notify Shopify (partner support) when Shopify store data is involved.
   - Notify any authority where the law requires it.
   - Each notice states what happened, what data was involved, what was done, and what the merchant
     should do.
6. **Post-incident review (within 7 days).** Write down the timeline, root cause and follow-up
   actions, then track the actions to completion.

## Prevention in place

- TLS for all traffic.
- Channel credentials and tokens are encrypted at rest with AES-256-GCM.
- HMAC-verified webhooks.
- Per-channel API keys that can be rotated.
- Role-based staff access. Only owners and managers see keys.
- Access to online-order customer details is recorded in the Activity Log.
- Customer personal data on closed online orders is removed after `ONLINE_ORDER_PII_RETENTION_DAYS`
  (default 365).
- Shopify GDPR `customers/redact` and `shop/redact` requests are processed automatically.

Review this policy every 12 months, and after every SEV-1.
