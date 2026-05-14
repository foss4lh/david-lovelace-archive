# Contributing to the David Lovelace Archive

Thank you for interest in contributing! This is an active research project working to preserve and maintain Herefordshire landscape history data.

## Before You Start

**Open an issue first** to discuss your proposed contribution. This helps ensure alignment with the project's direction and avoids duplicate work.

## Development Setup

1. **Clone and install:**

   ```bash
   git clone https://github.com/foss4lh/david-lovelace-archive.git
   cd david-lovelace-archive
   npm install
   ```

2. **Archive access (optional):** The 2TB source archive is mounted at `/media/robin/foss4lh1/david-lovelace-archive/`. You don't need access to contribute code improvements; it's required only for data sampling or auditing tasks.

3. **Start development:**
   ```bash
   npm run dev                      # Dev server
   npm run check                    # Type checks
   npm run lint                     # Format + lint
   ```

## What We Welcome

- **Data processing improvements:** Better sampling, quality detection, metadata extraction
- **Mapping & visualization:** UI enhancements, new map layers, data exploration features
- **Web functionality:** Accessibility, performance, device compatibility
- **Documentation:** Clarity, examples, getting-started guides
- **Tooling:** Build script improvements, CI/CD hardening, deployment automation

## Code Style & Quality

- **Type safety:** Always run `npm run check` before pushing
- **Formatting:** Pre-commit hooks auto-format; manually run `npm run format` if needed
- **Linting:** `npm run lint` checks Prettier + ESLint compliance
- **Testing:** Run `npm run build` locally to test production builds

## Workflow

1. **Create a feature branch:** `git checkout -b feature/your-feature`
2. **Make your changes:** Commit with clear, descriptive messages
3. **Run quality checks:** `npm run format && npm run lint && npm run check && npm run build`
4. **Push and open a PR:** Include context about why the change is valuable
5. **Request review:** Work with reviewers to refine the contribution

## Photo Releases (Maintainers)

Periodic releases package curated photo selections for web distribution. See README.md "Releasing Photo Bundles" section for the complete process.

## Reporting Issues

Use GitHub Issues to report bugs or request features. Include:

- What you observed
- What you expected
- Steps to reproduce (if applicable)
- Your environment (browser, OS, Node version if relevant)

## Data Policy

This project respects intellectual property and privacy. See [docs/data-policy.md](docs/data-policy.md) for licensing, collection terms, and responsible use guidelines.

## Recognition

Contributions are welcome from researchers, developers, heritage professionals, and landscape enthusiasts. Contributors will be recognized in the project history and, if desired, credited in publications using this data.

## Questions?

Open an issue or reach out to the maintainers. We're here to help!
