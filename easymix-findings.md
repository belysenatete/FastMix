# Easymix site findings

Inspected in Chromium at `https://www.easymix.io/en` and, after the user signed in, through the Easymix app. This records the observed UI and flows; it does not describe generated mix output.

## Public site

- Landing page for AI mixing and mastering, with Home, Solution, Pricing, and FAQ navigation.
- Shows a demo video, mixing workflow overview, audio comparison players, testimonials, pricing, FAQ, and calls to start.
- Has English/French language controls.
- Log in opens `/login`. The login screen offers Google sign-in, email/password, and a sign-up link.

## Signed-in app

### Mixer (`/mixer`)

- Main prompt: “What are we mixing today?” The user adds audio tracks and describes the desired sound.
- Track categories offered: Beat, Lead vocals, Doubles, Backing vocals, Ad-libs, and Instrument.
- Selecting a category opens the system file picker. It was cancelled during inspection; no audio was uploaded.
- The studio prompts users to add tracks before describing/submitting a mix.

### Library (`/bibliotheque`)

- Shows saved mixes, with search and sorting by newest, oldest, name A–Z, or name Z–A.
- This account had no saved mixes.

### User guide (`/aide`)

- **Prompts:** Copyable style prompt examples, including French rap, drill, trap, melodic, boom bap, Afro trap, RnB, cloud rap, phonk, pop, and reggaeton.
- **Mastering:** Expandable “How to use mastering” and “Mastering prompt examples” sections, with copyable mastering prompts.
- **FAQ:** Help topics for slow mixes, phone-sounding vocals, robotic autotune, WAV downloads, redoing a mix, and missing bass.
- Includes a link back to the mixing studio.

### Affiliate dashboard (`/affiliate`)

- Offers an affiliate link, describes first-click attribution lasting 30 days, shows referral metrics, and includes an earnings estimator.
- The account-specific referral URL is omitted here.

### Plan and billing (`/billing`)

- Monthly and lifetime payment options, plan cards, subscription status, and invoice history.
- This account showed no active subscription and no invoices.
- Purchase buttons were not used.

### Settings (`/settings`)

- General settings include editable first and last name, a disabled email field, language selection, an email preference, and “Replay the tutorial.”
- Security settings include current password, new password, confirmation, and “Update password.”
- No settings were changed.

### Support (`/support`)

- Provides a support email and response-time note, plus a link to the FAQ.

## Inspection limits

Mixing and mastering output could not be observed because the studio needs audio to process. The inspection did not upload files, submit a mix, change account settings, or make a purchase.
