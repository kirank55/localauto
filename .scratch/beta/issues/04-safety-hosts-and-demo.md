# 04: Safety, hosts, and the demo

**What to build:** Fill skips hidden, password, and payment fields, and it does not overwrite a value already on the page. Greenhouse, Lever, and the local demo can each be paused. Any other host is ignored. A form in an iframe is included. The README explains install, the demo, and the permission warning. The built extension loads in Chrome and fills the demo.

**Blocked by:** 01: Fill a profile into Greenhouse and Lever

**Status:** done

Host scope was later widened: any website fills. Greenhouse, Lever, and the local demo stay the pause groups. See ADR 0005.

- [x] Hidden, password, and payment fields stay empty and are reported as skips.
- [x] A typed email is left alone.
- [x] A paused Greenhouse host does not change the page. A value that is not a website does not either.
- [x] Frame results merge, and each suggestion remembers its frame.
- [x] The demo server and README are enough to try the beta locally.
