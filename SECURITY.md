# Security Policy

## Supported Versions

We release security updates and patches for active versions of DarziDesk:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1.0 | :x:                |

---

## Reporting a Vulnerability

The DarziDesk team takes the security of our multi-tenant SaaS architecture seriously. If you discover a security vulnerability, we appreciate your help in disclosing it responsibly.

### How to Report

**Please do NOT disclose vulnerabilities publicly in issues or discussions.**

Instead, please report potential vulnerabilities by emailing the project maintainer:
- **Email**: [enquiry.virajsavaliya@gmail.com](mailto:enquiry.virajsavaliya@gmail.com)
- **Subject**: `[SECURITY VULNERABILITY] DarziDesk - <Brief Description>`

### Information to Include

To help us triage and resolve the issue quickly, please provide:
1. **Summary**: A clear, concise overview of the vulnerability.
2. **Impact**: What an attacker could achieve (e.g. cross-tenant data leak, privilege escalation, bypass of RLS policies).
3. **Reproduction Steps**: Step-by-step instructions or minimal proof-of-concept (PoC) code/requests.
4. **Environment**: Version, operating system, and database configuration if relevant.

---

## Response Process & SLA

1. **Initial Acknowledgment**: Within **48 hours**, we will acknowledge receipt of your report.
2. **Investigation & Assessment**: Within **5 business days**, we will provide an initial assessment and estimated timeline for a patch.
3. **Fix & Release**: Once resolved, we will publish a security patch release and credit the reporter (unless you prefer to remain anonymous).

---

## Core Security Tenets

DarziDesk is engineered with defense-in-depth principles:
- **Dual-Layer Multi-Tenancy**: Application queries must scope by `tenantId`, backed by PostgreSQL transaction-level Row-Level Security (`set_config('app.tenant_id', ...)`).
- **Zero-Trust Client Headers**: Injected `x-tenant-id` client headers are strictly discarded.
- **Support Sessions**: Super Admins require cryptographically signed, short-lived `SupportSession` tokens to inspect tenant data.
- **Cryptographic Hashing**: All passwords use Argon2id with custom memory and parallelism parameters.
