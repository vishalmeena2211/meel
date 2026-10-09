# Security

Meel keeps riders' accounts in a database: an email, the name a rider shows, a home city, and a password scrambled with scrypt. It also keeps trips, their chat group links, and riders' reports. If you find a way to read or change something you should not be able to, please tell me privately, so it can be fixed before anyone else uses it.

## How to report

Use **[Report a vulnerability](https://github.com/vishalmeena2211/meel/security/advisories/new)**, under this repository's Security tab. Only you and the keeper can see the report.

Please do not open a public issue, a pull request or a discussion about it.

Say:

- what you found, and where (the page's address, or the file and line);
- the steps to see it happen;
- what it would let someone do.

## While you look

- Use an account you made yourself. Do not open, change or keep other riders' details beyond what shows the problem, and delete anything you saw once you have reported it.
- Do not run tests that flood the site, send spam reports, or try passwords against other people's accounts.
- Do not attack the services the site runs on (Vercel, Neon, Google, Mixpanel). Report problems in them to them.

## What happens next

Meel is kept by one person, as a hobby. You will get an answer within a week, then a fix as soon as one can be made safely. If you would like, you will be thanked by name when the fix is out.

## What is covered

The live site at [rideplanner.in](https://rideplanner.in) and the code on the `main` branch here. Older versions are not kept up.
