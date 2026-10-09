# Coding principles for the Easymix-style app

This is a practical working guide, not a claim that one document can capture every software engineering principle. It condenses widely used guidance into rules that fit a web app for audio uploads, mixing jobs, and mastering. Sources were reviewed on 2026-10-06. When a principle conflicts with explicit product requirements or the existing architecture, explain the tradeoff and follow the applicable requirement.



## Principles to apply while coding

### 1. Solve the stated user problem with the smallest complete change

- Understand the expected behavior and relevant existing patterns before editing.
- Prefer a focused change that fixes the user-visible problem over speculative features or broad rewrites.
- Avoid abstractions that have no demonstrated use yet. Add complexity only when the current requirement needs it.
- Keep changes reviewable and improve maintainability without delaying useful work for cosmetic perfection.

This follows the practical emphasis on code health, simplicity, and avoiding speculative work in [Google's code review guidance](https://google.github.io/eng-practices/review/reviewer/looking-for.html) and its [review standard](https://google.github.io/eng-practices/review/reviewer/standard.html).

### 2. Make code easy to understand and change

- Use clear names, small cohesive modules, and the repository's established formatting and style tools.
- Keep each function and component focused. Separate UI, business rules, persistence, and external-service integration at useful boundaries.
- Prefer explicit data shapes and clear inputs/outputs. Avoid hidden side effects and unnecessary mutable shared state.
- Write comments to explain intent, constraints, or non-obvious decisions; do not restate the code.
- Update relevant documentation when behavior, setup, or user workflows change.

Use common design mnemonics as prompts, not rigid laws:

- **DRY:** Keep each important business rule or fact in one authoritative place. Do not remove every similar-looking line; duplication is harmful when it causes the same rule to drift.
- **KISS / simple design:** Choose the clearest solution that satisfies the current requirement.
- **YAGNI:** Do not add speculative features or extensibility without a current use case.
- **SOLID, where object-oriented boundaries help:** give a module a cohesive responsibility; keep contracts small; make implementations honor their contracts; and depend on abstractions at boundaries where swapping a dependency is useful. Do not introduce interfaces, inheritance, or layers just to satisfy an acronym.
- **Separation of concerns:** keep UI rendering, domain decisions, persistence, and external services decoupled enough that a change in one does not unnecessarily spill into the others.

These ideas are summarized in [Martin Fowler's notes on YAGNI](https://martinfowler.com/bliki/Yagni.html), [simple design and duplication](https://martinfowler.com/articles/designDead.html), and [SOLID design principles](https://principles.design/examples/solid-design-principles). Apply judgment: abstractions have costs and should pay for themselves.

### 3. Protect correctness at boundaries

- Validate untrusted input on the server, including authorization, file type/content, file size, and any audio-processing limits. Client checks improve usability but do not replace server checks.
- Represent important workflow states explicitly (for example, uploaded, queued, processing, completed, and failed) and handle invalid transitions deliberately.
- Use database constraints and transactions for invariants that must remain true under concurrent requests.
- Design retried job or payment operations to avoid duplicate effects; make state changes and external callbacks idempotent where practical.
- Return actionable, user-safe errors; record enough operational context to diagnose failures without exposing secrets or private audio data.

PostgreSQL documents [constraints](https://www.postgresql.org/docs/current/ddl-constraints.html) and [transaction behavior](https://www.postgresql.org/docs/current/tutorial-transactions.html); these are tools for enforcing, not replacing, application-level rules.

### 4. Build security and privacy into the design

- Enforce authorization on every server-side read and write; never rely on a hidden UI control to protect data.
- Use least privilege for database, object storage, workers, and service credentials. Keep secrets out of source control and browser bundles.
- Use framework-safe database access and parameterized queries. Treat filenames, prompt text, uploads, callbacks, and third-party responses as untrusted.
- Restrict upload size and accepted formats, inspect content rather than trusting extensions, and isolate processing of user-supplied files.
- Minimize personal data and audio retention. Define deletion behavior and avoid logging passwords, tokens, payment data, raw prompts, or private media.
- Review dependency changes and use supported versions; surface security-relevant failures in monitoring.

Use the [OWASP Top 10:2025](https://top10.owasp.org/2025/0x00_2025-Introduction/) as a risk overview and the [OWASP Application Security Verification Standard](https://owasp.org/projects/asvs) for concrete web security requirements. [NIST's Secure Software Development Framework](https://doi.org/10.6028/NIST.SP.800-218) recommends integrating secure practices through the development lifecycle.

### 5. Design for accessibility and understandable interaction

- Use semantic HTML and accessible names, roles, and status messages.
- Support keyboard operation, visible focus, sufficient contrast, and clear validation/error feedback.
- Provide text alternatives for meaningful imagery and accessible controls for media playback.
- Make the upload and processing workflow understandable, including progress, cancellation where supported, and recovery from errors.

Use [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) as the normative reference. Its four principles are perceivable, operable, understandable, and robust; the [WAI summary](https://www.w3.org/WAI/standards-guidelines/wcag/glance/) is a quick orientation.

### 6. Verify behavior proportionately

- Choose verification that matches risk and scope: focused unit checks for business rules, integration checks for database/storage/job boundaries, and end-to-end checks for critical user flows when requested or when the task calls for them.
- Include meaningful failure cases and edge cases, not just a happy-path assertion.
- Keep tests readable and deterministic. Tests are maintained code too.
- Run the relevant existing checks when the task asks for verification; report exactly what was and was not run.

Google's [code review checklist](https://google.github.io/eng-practices/review/reviewer/looking-for.html) recommends appropriate tests and emphasizes that tests should fail when behavior is broken and should remain simple and useful.

### 7. Keep the application operable

- Separate deployment-specific configuration from code and keep it out of version control when it contains secrets.
- Emit structured, useful logs to the hosting environment; avoid logging sensitive payloads.
- Track job duration, queue delay, success/failure counts, and storage errors so slow or stuck processing can be diagnosed.
- Prefer explicit timeouts, bounded retries, and clear failure states for external services and background jobs.

These are practical operations principles consistent with [The Twelve-Factor App's configuration guidance](https://12factor.net/config) and [logging guidance](https://12factor.net/logs).

## Source set

- [Next.js: Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro)
- [Python librosa: loading audio](https://librosa.org/doc/main/auto_tutorials/01-intro/01-load.html)
- [FastAPI: request files](https://fastapi.tiangolo.com/tutorial/request-files/)
- [PostgreSQL: about](https://www.postgresql.org/about/), [constraints](https://www.postgresql.org/docs/current/ddl-constraints.html), [transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [Google Engineering Practices: review checklist](https://google.github.io/eng-practices/review/reviewer/looking-for.html) and [review standard](https://google.github.io/eng-practices/review/reviewer/standard.html)
- [Martin Fowler: YAGNI](https://martinfowler.com/bliki/Yagni.html), [simple design](https://martinfowler.com/articles/designDead.html), and [SOLID principles](https://principles.design/examples/solid-design-principles)
- [OWASP Top 10:2025](https://top10.owasp.org/2025/0x00_2025-Introduction/) and [OWASP ASVS](https://owasp.org/projects/asvs)
- [NIST SP 800-218: Secure Software Development Framework](https://doi.org/10.6028/NIST.SP.800-218)
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) and [WAI summary](https://www.w3.org/WAI/standards-guidelines/wcag/glance/)
- [The Twelve-Factor App: config](https://12factor.net/config) and [logs](https://12factor.net/logs)
