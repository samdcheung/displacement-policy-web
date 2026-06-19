Publication asset placement for Displacement Policy

Copy these files into the same relative paths in your local website repository, then commit and push to Vercel.

Required paths:

publications.html
assets/publications/governing-displacement-brief-3-beyond-shock-responsiveness.pdf
assets/publications/governing-displacement-brief-4-fiscal-architecture.pdf
assets/publications/displacement-policy-working-paper-1-fiscal-architecture.pdf

The Publications page also links to these expected PDF paths. Add the PDFs when available:
assets/publications/governing-displacement-brief-1-governance-by-design.pdf
assets/publications/governing-displacement-brief-2-infrastructure-finance-gap.pdf

After deployment, each PDF should resolve at:
https://www.displacementpolicy.org/assets/publications/<filename>.pdf

For a plain static HTML site, the assets/publications folder sits at the repo root.
For Next.js, Vite, or similar frameworks, put the same folder under public/ so the public URL remains /assets/publications/<filename>.pdf.
