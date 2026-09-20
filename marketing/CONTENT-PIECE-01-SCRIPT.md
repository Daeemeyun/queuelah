# Content Piece #1 — Script (v2)

**Working title:** *My app leaked every user's push token to anyone who asked.*

**Runtime:** 5 to 6 minutes (v1 was 8-9 and lost everyone at 5:45) · **Platform:** YouTube primary, X thread + LinkedIn secondary
**Repo:** https://github.com/Daeemeyun/queuelah

> **v2 changes, driven by a 5-persona viewer test.** Click scored 6.8/10 but completion scored 4.4 — people wanted this video and then left it. Fixes: open on the anonymous leak instead of the admin bug (4 of 5 personas independently asked for this), cut runtime by a third, promise three bugs up front so there is a reason to stay, replace the Act 3 victory lap with the staged-rollout reasoning a hiring manager called the most valuable thing in the repo, and correct a technically false claim that would have drawn mass corrections.

**Title options** (A/B; first two are strongest):
1. My app leaked every user's push token to anyone who asked.
2. I let AI build my app. It had three security holes. I caused one of them.
3. RLS secures rows, not columns. I learned that in production.

**Thumbnail:** the anonymous `curl` on the left with blurred token strings visible, a phone on the right showing a push notification. The phone is what stops a scroll; the curl is what says "this is real." No face needed.

---

## Two rules for this whole video

1. **Say "small app, barely any users" exactly once.** Every technical persona said it is the reason they trusted the rest. All three also said you repeat it until it starts sounding like an apology.
2. **Promise three bugs in the first 30 seconds.** The single biggest reason people left v1 was that Act 3 resolved the tension and they had no idea a second half existed.

---

## COLD OPEN — 0:00 to 0:30

**On screen:** terminal, full frame. No login, no app, nothing else.

> No account. No password. Nothing but a key that anybody can pull out of my app in about thirty seconds.

**On screen:** type it, run it.

```bash
curl 'https://<project>.supabase.co/rest/v1/user_profiles?select=username,push_token' \
  -H "apikey: <the public key that ships inside the app>"
```

**On screen:** the response fills the frame. Blur the token strings but leave the shape visible.

> That is every single user of my app, and the token you need to send a push notification straight to their phone.
>
> I built this app with AI. It is on the App Store right now. And this was one of **three** things wrong with it. The second one let any user make themselves an admin.
>
> The third one I caused myself, while fixing the first two.

---

## SETUP — 0:30 to 0:55

**On screen:** the app running on a real phone, briefly.

> Quick context. QueueLah is a queue app for hawker centres in Singapore. It is small. Barely any users. I am not about to tell you how I got a hundred thousand downloads.
>
> But the accounts are real, the database is real, and everything I am about to show you was live in production for about three months.

**On screen:** Supabase dashboard.

> Backend is Supabase. Postgres, with Row Level Security. Instead of checking permissions in your app code, you write rules on the table itself and the database refuses to hand over rows people should not see. It is a genuinely good idea. It is also where all three bugs came from.

---

## BUG 1 — THE LEAK — 0:55 to 1:50

**On screen:** the read policy.

```sql
CREATE POLICY "Profiles are public" ON user_profiles
  FOR SELECT USING (true);
```

> Here is the rule that let that first command work. `USING (true)`. Anyone can read this table. Which sounds insane until you remember what it was for: usernames and avatars on a public leaderboard. That is genuinely public data.

**On screen:** scroll the table schema. Let `push_token` sit on screen.

> The problem is what else lives in that same table.
>
> Row Level Security thinks in **rows**. It decided you are allowed to see this row, so it handed you the entire row. Every column in it. Including this one.

**On screen:** back to the response, tokens blurred.

> A push token is how you send someone a notification. With this list, anyone could have pushed a message to every person who ever downloaded my app. From their bedroom. For free.
>
> And they would not have needed an account to do it.

---

## BUG 2 — THE ESCALATION — 1:50 to 3:20

> Second one. Same table, opposite direction.

**On screen:** the update policy. **Hold it in silence for three full seconds.**

```sql
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);
```

> That is textbook. Every tutorial writes it this way. You can only update a row when the row's id matches your user id. You cannot touch anybody else's profile.
>
> And that part is completely true. It works.

**On screen:** schema again. Highlight `is_admin`, `subscription_tier`, `points`.

> Here is what it does not say anything about.
>
> It stopped you editing **someone else's row**. It said nothing whatsoever about which **columns** you could edit in your own.

**On screen:** big text card. Hold.

> **RLS secures rows. It does not secure columns.**

**On screen:** terminal. Sign in as a normal test account first, so this is honest.

> So: I sign up like any other user, I take my own token, and I send this.

```bash
curl -X PATCH '.../user_profiles?id=eq.<my-own-id>' \
  -H "apikey: <public key>" -H "Authorization: Bearer <my own token>" \
  -d '{"is_admin": true, "points": 999999}'
```

**On screen:** the row flips. Open the app. Admin panel is there.

> Any user who signed up could do that. And admin here is not cosmetic: edit any venue, delete any venue, remove anyone's photo, resolve moderation reports. One account, one request, control of what every other user sees.

---

## THE FIX, AND THE DECISION INSIDE IT — 3:20 to 4:30

> Now, you can *sort of* patch this with RLS. A `WITH CHECK` clause pinning `is_admin` to its current value would work. A trigger would work.
>
> But both of those mean writing a rule for every sensitive column and remembering forever. Postgres already has the right tool, and it is the one people forget exists: **column privileges.**

**On screen:** type the migration.

```sql
REVOKE UPDATE ON public.user_profiles FROM authenticated;

GRANT UPDATE (username, avatar_url, avatar_frame, username_color, push_token)
  ON public.user_profiles TO authenticated;
```

> Take away blanket update. Hand back only what a user should change about themselves. `is_admin` is not on that list, so it is not editable. Not by policy, by privilege.

**On screen:** re-run the curl. `permission denied`. Then show `information_schema.column_privileges` to prove it.

> Same request. Refused by the database itself.

**On screen:** open migration 028 in the repo, scroll to the commented Stage 2 block.

> Now here is the part I actually want to talk about, because it is the bit that took real thought.
>
> The obvious fix for the **read** leak is to revoke those columns from everyone. I could not do that.
>
> The version of the app sitting on people's phones asks the database for `select('*')`. Every column. If I revoked one column from logged-in users, that request starts failing, and every existing user gets silently logged out. I cannot patch an app that is already on someone's phone.

**On screen:** highlight the staged migration.

> So I did it in two stages. Stage one locks out anonymous callers completely, which kills the actual attack. Stage two removes it from logged-in users too, and it stays commented out until a build that asks for named columns is live and adopted.
>
> The residual risk is written into the migration in plain English: for now, a signed-up user could still read those columns. That is a deliberate trade, not an oversight. Shipping the "complete" fix would have broken the app for everyone to close a hole that needs an account to reach.

---

## BUG 3 — THE ONE I CAUSED — 4:30 to 5:30

> Which brings me to the third bug. I wrote this one myself, while fixing the other two.

**On screen:** the eatery policy.

> After locking `is_admin` away from anonymous users, I wrote a policy on a different table that needed to check whether the current user was an admin. It did the obvious thing and looked up `is_admin`.

**On screen:** anonymous request. `42501 permission denied`.

> But RLS policies run **as the person making the request**. So when a logged-out user opened my app, the database tried to read a column they were no longer allowed to read, and killed the whole query. Not just the admin check. Everything.
>
> Every logged-out user opened the app and got an empty map.

**On screen:** the fix.

```sql
CREATE FUNCTION public.current_user_is_admin() RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$ SELECT EXISTS (SELECT 1 FROM user_profiles
                     WHERE id = auth.uid() AND is_admin = true); $$;
```

> `SECURITY DEFINER` means the function runs as its owner, not as the caller, so it no longer depends on what the caller is allowed to read. It takes no arguments and only ever reports on you, so it cannot be used to check whether someone *else* is an admin.

**On screen:** terminal, probing live as anonymous.

> I did not find that by reading the migration. The migration looked fine. I found it by making a real request against the live database as a logged-out user.

---

## CLOSE — 5:30 to 5:50

> Two things worth more than any of the three bugs.
>
> **Check a security fix against the live system, not against the code you just wrote.** Every fix is a change, and changes break things.
>
> **Test as logged-out and logged-in.** That last bug passed perfectly for logged-in users and failed for everybody else. If I had only checked my own account I would have shipped it and never known.
>
> None of this is an argument against building with AI. The code was fine. The bug was an assumption about how the database works, and I would have made the same assumption by hand.
>
> Repo is public, migrations are numbered, and the reasoning is written into them. If you are on Supabase right now, go and look at your profiles table and ask one question: is there a column in there a user should not be able to write to themselves. Because RLS will not stop them.

**End card:** repo link. Pinned comment: the two curl commands, copy-pasteable.

---

## X / LinkedIn thread (v2)

**Lead post gets the screenshot of the anonymous curl output, tokens blurred.**

1/ No account. No password. Just the key that ships inside my iOS app.

This returned every user's push notification token.

```
curl '.../user_profiles?select=username,push_token' \
  -H "apikey: <public key>"
```

Built with AI. Live on the App Store. One of three bugs.

2/ The policy behind it:

`FOR SELECT USING (true)`

Which was fine, for usernames and avatars on a leaderboard.

The problem is `push_token` lived in that same table. RLS decided I could see the row, so it gave me every column in it.

RLS secures ROWS, not COLUMNS.

3/ Same table, opposite direction. This policy is textbook:

`USING (auth.uid() = id)`

You can only update your own row. True.

It says nothing about WHICH COLUMNS you can update in your own row.

`is_admin` was one of them.

4/ So: sign up, take your own token, one PATCH.

`{"is_admin": true}`

Admin = edit/delete any venue + moderation. Any user who registered.

5/ You can sort of patch this with `WITH CHECK` or a trigger. Both mean remembering every sensitive column forever.

Postgres already has the tool:

```
REVOKE UPDATE ON user_profiles FROM authenticated;
GRANT UPDATE (username, avatar_url) ON user_profiles TO authenticated;
```

6/ The read fix was harder, and this is the interesting part.

The app already on people's phones calls `select('*')`. Revoke a column and every existing user silently logs out.

You cannot patch an app that has already shipped.

7/ So I staged it.

Stage 1: lock out anonymous callers. Kills the actual attack.
Stage 2: remove it for logged-in users too. Commented out until a build asking for named columns is adopted.

Residual risk written into the migration in plain English.

8/ Then my own fix broke production.

A policy referenced a column I had just revoked from anonymous users. RLS runs as the caller. Every logged-out user got an empty screen.

Fixed with a `SECURITY DEFINER` function that runs as owner, not caller.

9/ Two lessons:

Verify fixes against the live system, not the code you just wrote.

Test as BOTH logged-out and logged-in. Mine passed for one and failed for the other.

Repo, migrations and reasoning: github.com/Daeemeyun/queuelah

---

## Pre-film checklist

**Accuracy — do these before recording, they are the ones that cost credibility:**

- [ ] **Check whether anyone actually exploited it.** Three months of exposure. Query whether any `is_admin` flag was ever flipped by a non-admin, and say the real answer on camera. A security audience asks this first, and "I did not check" is a worse answer than "someone did."
- [ ] **Do not say everything is "closed and verified."** Stage 2 of migration 028 is still pending. The video explains this honestly; keep it that way. A hiring manager who finds an open risk you called closed will trust nothing else you said.
- [ ] **Do not claim "RLS cannot express this."** It sort of can, via `WITH CHECK`. The script now says so, which is both true and more impressive than the absolute.
- [ ] **Say "any user who signed up,"** never "one HTTP request." It is sign-up plus token plus PATCH, and someone will point that out.
- [ ] Confirm all three bugs are still fixed on the day you upload.

**Worth mentioning if you have the runtime:** the structural fix is moving `is_admin` to a separate `user_roles` table entirely. Column grants are the patch; a different table is the design. Saying that out loud pre-empts the top comment.

**Screen recordings to capture:** anonymous curl returning tokens (blur them), the read policy, the schema with `push_token` and `is_admin` visible, the 3-second policy hold, the admin curl succeeding, the app with admin controls, the curl failing after the fix, `column_privileges` output, the `42501` error, the empty map, migration 028's commented Stage 2 block.

**Blur or placeholder:** real push tokens, real usernames, your project ref.

**Pacing:** the three-second silence on the update policy is the single most important beat. Every technical viewer in testing named that moment as where it landed emotionally. Do not cut it short in the edit.
