# Design QA — Layout and history refresh

Date: 2026-08-15

## Source references

- `/var/folders/r6/c3c89pm124n7ycqykjytf4p00000gn/T/codex-clipboard-4f06f701-f60f-4392-b651-2e5cd3fca7f3.png`
- `/var/folders/r6/c3c89pm124n7ycqykjytf4p00000gn/T/codex-clipboard-db4561d2-7e48-4f54-a8d2-9dcf251a02cf.png`
- `/var/folders/r6/c3c89pm124n7ycqykjytf4p00000gn/T/codex-clipboard-4d4b20cc-b9a2-471c-af14-44c693b5ae24.png`
- `/var/folders/r6/c3c89pm124n7ycqykjytf4p00000gn/T/codex-clipboard-a8973872-be56-463e-8975-e25585d16ee3.png`
- `/var/folders/r6/c3c89pm124n7ycqykjytf4p00000gn/T/codex-clipboard-8def0d40-985b-4a94-ad4f-660394fa4dcc.png`
- `/var/folders/r6/c3c89pm124n7ycqykjytf4p00000gn/T/codex-clipboard-0c701709-e03c-4e11-92ab-5b30dd26371f.png`

## Implementation captures

- `/Users/parksunghyun/Documents/Maint Timer App/qa-artifacts/layout-history-refresh/calculator.png`
- `/Users/parksunghyun/Documents/Maint Timer App/qa-artifacts/layout-history-refresh/settings.png`
- `/Users/parksunghyun/Documents/Maint Timer App/qa-artifacts/layout-history-refresh/log-final.png`
- `/Users/parksunghyun/Documents/Maint Timer App/qa-artifacts/layout-history-refresh/comparison.png`

## Verification

- Verified at a 393 × 852 iPhone 15 Pro viewport.
- DEFAULT COUNTRY summary contains only `KOREA - KST`; the UTC fixed row and summary airport codes are absent.
- Settings drawer and country list have matching client/scroll widths and vertical-only touch behavior; horizontal drift is disabled.
- Calculator display and all six keypad rows fit inside the visible panel. The last keys end at y=712 within the 852px viewport.
- LOG title card now reads `LOG`.
- History control uses a clipboard/document icon with a small outlined clock at the lower-right.
- Source/implementation comparison was reviewed with no P0, P1, or P2 visual mismatch.
- Production bundle and native sync completed successfully.
- Signed iOS Debug build completed, installed on the connected iPhone 15 Pro, and `com.parksunghyun.mainttool` was relaunched.
- Browser console returned no warnings or errors.

final result: passed
