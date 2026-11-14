# Attribution and Co-authorship

This project was collaboratively developed. Use the practices below so commit history accurately reflects who authored and reviewed each change.

## Ground rules

- **Use your own Git identity.** Each contributor should commit from their own machine/account with their own `user.name` and `user.email` configured.
- **Do not impersonate others.** Do not set `GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL`, `GIT_COMMITTER_NAME`, or `GIT_COMMITTER_EMAIL` to someone else’s identity.
- **Get consent** before adding someone as a co-author.

## Configure your identity (per contributor)

```bash
git config user.name "Your Name"
git config user.email "you@example.com"
```

Verify:

```bash
git config --get user.name
git config --get user.email
```

## Co-authored-by trailers

When multiple people contributed to a commit, add one or more `Co-authored-by` trailers at the end of the commit message body (separated by a blank line from the subject).

Format (must match GitHub’s expected form):

```text
<type>: <short summary>

<optional body explaining the change>

Co-authored-by: Full Name <email@example.com>
Co-authored-by: Another Name <another@example.com>
```

### Example

```text
feat: add spatial anomaly heatmap overlay

Implements grid sampling and client-side canvas rendering for anomaly layers.

Co-authored-by: Hellen Onyango <hellenonyango340@gmail.com>
Co-authored-by: Jack Omosh <jackosmosh6@gmail.com>
```

## Optional: commit message template

You can use the provided template to remind yourself to include co-authors:

```bash
git config commit.template .gitmessage.txt
```

Then `git commit` will open your editor with the template.

## Suggested contributor mapping (for this repository)

Use these identities **only when you are that person** committing from your own account:

| Contributor      | Suggested email                  | Primary areas |
|------------------|----------------------------------|---------------|
| mchere           | chemeresniriam@gmail.com         | Project setup, build/config, entry point |
| hellenonyango    | hellenonyango340@gmail.com      | Server, NASA POWER proxy, spatial/geocoding APIs |
| asoyovick        | oumaasoyo@gmail.com              | Earth variable catalog, statistics engine |
| altradits        | altradits@gmail.com              | 3D globe, Earth textures |
| jackomosh        | jackosmosh6@gmail.com            | 2D map selector, search, 2D/3D charts |
| Christian3788    | christianamos67@gmail.com       | App/workspace assembly, panels, docs/resources |

If your preferred name/email differs from the above, use your own accurate details.

## Pull requests

For PRs, include in the description:
- Summary of features/fixes
- Testing/verification steps
- Attribution notes (who implemented/reviewed which parts)
- Any `Co-authored-by` context when squashing/merging, as appropriate for your team workflow
