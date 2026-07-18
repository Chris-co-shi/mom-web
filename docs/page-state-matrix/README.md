# Page state matrix

Each page records:

| State | Trigger | Visible feedback | Allowed actions | Recovery |
|---|---|---|---|---|
| loading | query pending | skeleton/spinner | cancel where possible | timeout |
| empty | no records | empty explanation | create/refresh | refresh |
| forbidden | permission denied | permission result | back | request access |
| failed | request failed | traceable error | retry | support correlation ID |
| submitting | command pending | disabled duplicate action | none | timeout/retry |
| completed | command accepted | business number | continue | view details |
