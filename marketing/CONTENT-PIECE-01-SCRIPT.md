# Content Piece #1 — Script

**Working title:** *I let AI build my app. Any user could make themselves an admin.*

**Runtime:** 8 to 9 minutes · **Platform:** YouTube primary, X thread + LinkedIn secondary
**Repo to link:** https://github.com/Daeemeyun/queuelah

**Title options** (A/B these, first is strongest):
1. I let AI build my app. Any user could make themselves an admin.
2. My AI-built app had a security hole. I found it. Then my fix made it worse.
3. RLS secures rows, not columns. I learned that the hard way, in production.

**Thumbnail:** the `curl` command with `"is_admin": true` highlighted, App Store icon beside it.

---

## The rule for this whole video

Say the real numbers out loud. The app is small. That is the credibility unlock, not the liability, and it is what makes every later claim believable. The moment you imply success you do not have, the whole thing collapses.

---

## COLD OPEN — 0:00 to 0:25

**On screen:** QueueLah running on a real phone. Then hard cut to a terminal.

> This is my app. It is on the App Store. You can download it right now.
>
> And for about three months, any single person who signed up could give themselves admin access. Not through some clever exploit. One HTTP request.

**On screen:** type the `curl` live, hit enter, show `200 OK`. Cut to the app showing admin controls.

> I built this with AI. And the bug was not in the code the AI wrote. It was in something I thought I understood.

---

## ACT 1 — SETUP — 0:25 to 1:45

**On screen:** the repo, the file tree, a scroll through migrations.

> Quick context so you can calibrate. QueueLah is a crowd-sourced queue app for Singapore hawker centres. You open it, you see how long the queue is, you decide where to eat.
>
> I built it solo, mostly with AI. It went through Apple review, got rejected once, and it is live.
>
> And I want to be straight with you, because it matters for everything I am about to say: this app is small. Barely any users. I am not here to tell you how I got a hundred thousand downloads. I am here because a real app, with real user accounts, in production, had a hole in it, and the reason it was there is something I think a lot of people are about to run into.

**On screen:** Supabase dashboard, the tables list.

> The backend is Supabase. Postgres with Row Level Security. If you have not used RLS, the idea is simple and genuinely good: instead of checking permissions in your app code, you write policies on the table itself. The database refuses to hand out rows the user should not see.

---

## ACT 2 — THE BUG — 1:45 to 4:30

**On screen:** open the migration, highlight the policy.

> Here is the policy on my user profiles table. Look at it and tell me what is wrong.

```sql
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);
```

**Beat. Leave it on screen for three full seconds.**

> That is textbook. Every tutorial writes it this way. It says: you may update a row only when the row's id matches your logged-in user id. You cannot touch anybody else's profile.
>
> And that part is completely true. It works. It does exactly what it says.

**On screen:** scroll the table schema, highlight `is_admin`, `subscription_tier`, `points`.

> Here is the problem. That same table also held these columns. Whether you are an admin. Whether you have a paid subscription. How many points you have on the leaderboard.
>
> And here is the thing that took me an embarrassingly long time to actually internalise:

**On screen:** big text card. Hold it.

> **Row Level Security secures rows. It does not secure columns.**

> My policy stopped you editing someone else's row. It said absolutely nothing about which columns you could edit in your own row.

**On screen:** terminal, type it out properly this time.

> And Supabase exposes your tables over a REST API. The key the app uses is public by design, it ships inside the app bundle, anyone can pull it out. That is fine, that is what RLS is for.
>
> So I do not need the app. I just need my own login, and this.

```bash
curl -X PATCH 'https://<project>.supabase.co/rest/v1/user_profiles?id=eq.<my-own-id>' \
  -H "apikey: <the public key from the app bundle>" \
  -H "Authorization: Bearer <my own token>" \
  -d '{"is_admin": true, "points": 999999}'
```

**On screen:** run it. Show the row flip. Open the app, admin panel is there.

> That is it. I am an admin. On my own app.
>
> And admin in QueueLah is not cosmetic. I can edit any venue. Delete any venue. Remove anyone's profile photo. Resolve moderation reports. One user, one request, full control of the content every other user sees.

---

## ACT 3 — THE FIX — 4:30 to 5:45

> The fix is not more RLS. RLS genuinely cannot express this. Column permissions in Postgres are a completely separate system, and it is the one people forget exists.

**On screen:** type the migration.

```sql
REVOKE UPDATE ON public.user_profiles FROM authenticated;

GRANT UPDATE (username, avatar_url, avatar_frame, username_color, push_token)
  ON public.user_profiles TO authenticated;
```

> Take away blanket update permission. Hand back only the columns a user is actually allowed to change about themselves. Their name, their avatar, their colours.
>
> `is_admin` is not on that list. `subscription_tier` is not on that list. `points` is not on that list. Those can now only be changed by server-side code that I control.

**On screen:** re-run the curl. Show `permission denied`.

> Same request. Now it is refused by the database itself.

---

## ACT 4 — THE TWIST — 5:45 to 7:30

> So I fixed it, I felt good about myself, and I moved on.
>
> Then I went back and audited the thing again, and found this.

**On screen:** the curl, no auth token this time.

```bash
curl 'https://<project>.supabase.co/rest/v1/user_profiles?select=username,push_token,is_admin' \
  -H "apikey: <the public key>"
```

**On screen:** the response. Blur the actual tokens.

> No login. No account. Just the public key that ships in the app.
>
> That returned every user's push notification token, and told me exactly which accounts were admins.
>
> Push tokens are how you send someone a notification. With that list you could spam every user of my app directly on their phone. And the admin list is a target list.

**On screen:** the two migrations side by side.

> Here is what I want you to actually take away. My first fix was correct. It was also only half the problem.
>
> I had fixed **writes**. I never touched **reads**. The read policy still said `USING (true)`, which means anyone, and because RLS only thinks in rows, it happily handed over every column in that row including the two that mattered.
>
> A permission has two directions. I secured one and assumed I was done.

---

## ACT 5 — THE PART NOBODY FILMS — 7:30 to 8:45

> One more, and this is the one I nearly left out of this video.
>
> I fixed the read leak. Locked the anonymous role down to display columns only. Then I wrote a separate policy on a different table, and that policy needed to check whether the current user was an admin. So it did the obvious thing: it looked up `is_admin`.

**On screen:** the failing query, `42501 permission denied`.

> Except I had just revoked `is_admin` from anonymous users. And RLS policies run as the person making the request. So when a logged-out user opened my app, the database tried to read a column they were not allowed to read, and killed the entire query.
>
> Not the admin check. The whole thing. Every logged-out user opened QueueLah and got an empty map.

**On screen:** terminal, probing the live API.

> I did not find that by reading my migration. The migration looked fine. I found it because I made an actual request against the live API as an anonymous user, which is the only thing that tells you the truth.
>
> Two lessons, and they are worth more than the bug itself.
>
> One. Verify a security fix by hitting the live system, not by reading the code you just wrote. Every fix is a change, and every change can break something.
>
> Two. Test as **both** a logged-out and a logged-in user. That bug passed completely for logged-in users and hard-failed for everyone else. If I had only checked my own account, I would have shipped it and never known.

---

## CLOSE — 8:45 to 9:00

> None of this is an argument against building with AI. I still do. The code was fine. The bug was in an assumption about how the database works, and I would have made that same assumption writing it by hand.
>
> The repo is public, link below. The migrations are in there, numbered, with the reasoning written out. You can read the broken version and the fix next to each other.
>
> If you are running Supabase right now, go and check one thing: does your profiles table have a column you would not want a user to write to themselves. Because RLS will not stop them.

**End card:** repo link, App Store link.

---

## X / LinkedIn thread version

1/ I built an app with AI and shipped it to the App Store.

For three months, any user who signed up could make themselves an admin with one HTTP request.

The bug was not in the AI's code. It was in what I assumed about Postgres.

2/ The policy looked textbook:

`USING (auth.uid() = id)`

You can only update your own row. That is true. It works.

3/ But that table also held `is_admin`, `subscription_tier`, `points`.

Row Level Security secures ROWS. Not COLUMNS.

The policy stopped me editing your profile. It said nothing about which columns I could edit in mine.

4/ Supabase exposes tables over REST. The anon key ships in the app bundle.

So: my own token, one PATCH, `{"is_admin": true}`.

Admin gives edit/delete on every venue plus moderation. One request.

5/ RLS cannot fix this. Column permissions are a separate system:

```
REVOKE UPDATE ON user_profiles FROM authenticated;
GRANT UPDATE (username, avatar_url) ON user_profiles TO authenticated;
```

6/ Then I audited again.

The READ policy was still `USING (true)`.

No login needed. Just the public key. It returned every user's push token and the full admin list.

I had fixed writes and never touched reads.

7/ Then my fix broke the app.

A policy referenced a column I had just revoked from anonymous users. RLS runs as the caller. Every logged-out user got an empty screen.

Found it by probing the live API. The migration looked correct.

8/ Two things worth more than the bug:

Verify fixes against the live system, not the code you just wrote.

Test as BOTH logged-out and logged-in. Mine passed for one and failed for the other.

9/ Repo is public, migrations and reasoning included:
github.com/Daeemeyun/queuelah

If you run Supabase: check whether your profiles table has a column a user should not be able to write to themselves.

---

## Production notes

- **Screen recordings to capture:** the policy in the editor, the schema showing `is_admin`, the curl succeeding, the app with admin controls, the curl failing after the fix, the anonymous read returning tokens (blur them), the `42501` error, the empty map.
- **Blur or use placeholders for:** real push tokens, your project ref, real usernames. The project ref is public but there is no reason to put it on a thumbnail.
- **Do not describe any unfixed issue.** Everything in this script is closed and verified. Check that is still true on the day you publish.
- **Pacing:** the three-second hold on the policy in Act 2 is the most important beat in the video. Let the audience try to spot it and fail. That is what makes the reveal land.
