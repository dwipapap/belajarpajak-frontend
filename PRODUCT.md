# Product

## Register

product

## Users

- **Siswa (students)** at Indonesian SMK, universities, and training institutions: 15–22 years old, in a classroom or computer lab, following a teacher's instructions. Often first exposure to tax administration software. They need the interface to look and behave like the real national tax portal so the skill transfers to actual work.
- **Guru (teachers)**: run practice sessions, monitor student submissions, grade issued documents, give feedback. Efficiency-focused: scanning tables of many students' slips.
- **Admin (per institution)**: provisions accounts and classes for their own tenant. Occasional, task-driven use.
- **Superadmin (platform operator, Konsultan Bisnis Sudarno)**: manages tenants across the deployment.

Context: desktop browsers in bright classrooms/labs, mid-range hardware, sometimes projected on a screen. Bahasa Indonesia UI.

## Product Purpose

PajakSim ("Sistem Pembelajaran Pajak Online") is a multi-tenant training simulator for Indonesian tax administration. Students create simulated tax documents (bukti potong BP21/BP26, later e-faktur, kode billing, SPT) with dummy data; teachers monitor and grade. Success = a student who completes exercises here can sit in front of the real national tax portal and already know where everything is.

**The defining constraint:** the UI is a high-fidelity homage to the national tax administration system's UX — same layout logic, same module menu structure, same document lifecycle idioms — **without ever using that system's name, logo, or trademarks**. Fidelity is pedagogy; branding is our own.

## Brand Personality

Institutional, disciplined, trustworthy. Three words: **formal, credible, exacting**. The interface should feel like government-grade software done well: dense but ordered, serious but not hostile. Emotional goal for students: "this is the real thing" — mild institutional gravitas, zero playfulness.

## Anti-references

- Consumer-SaaS cheerfulness: rounded-everything, pastel gradients, illustration mascots, confetti. This is a government-system simulator, not a startup dashboard.
- Generic admin-template look (Bootstrap/AdminLTE default vibes) that would break the "feels like the national portal" illusion.
- Dark mode. The reference system is a light, formal, paper-adjacent interface used in bright classrooms.
- Any real-government branding: the reference system's name, DJP/Kemenkeu logos, official seals. Legally and ethically off-limits.

## Design Principles

1. **Fidelity is the feature.** When choosing between a prettier pattern and the reference system's pattern, choose the reference. Deviations must be justified by pedagogy (e.g. teacher grading views, which the real system doesn't have).
2. **Dense, never cluttered.** Real tax software is information-dense tables and formal panels. Keep the density, impose the order: consistent spacing rhythm, strict alignment, clear section headers.
3. **The document lifecycle is sacred.** Draft → issued → invalid states drive every list, tab, badge, and action. Status must always be legible at a glance (label + color, never color alone).
4. **Classroom-proof.** Works on mid-range lab PCs and projected screens: strong contrast, ≥0.85rem table text, no hover-only affordances for critical actions.
5. **Own the brand, borrow the bones.** Navy-and-gold institutional identity (crest, topbar, buttons) is PajakSim's own; the layout skeleton is the reference system's.

## Accessibility & Inclusion

- Target WCAG 2.1 AA contrast on text and interactive elements.
- Status conveyed by label + color, never color alone (colorblind-safe by construction).
- Keyboard-reachable forms and tables; visible focus states on all interactive elements.
- `lang="id"`, Indonesian locale for dates/numbers (`id-ID`), currency without decimal noise.
- Respect `prefers-reduced-motion`; motion is restrained anyway (state feedback only).
