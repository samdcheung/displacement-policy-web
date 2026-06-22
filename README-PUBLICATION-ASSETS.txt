Publication asset placement for Displacement Policy

Copy these files into the same relative paths in your local website repository, then commit and push to Vercel.

Required paths:

publications.html
publications/governance-by-design.html
publications/infrastructure-finance-gap.html
publications/beyond-shock-responsiveness.html
publications/fiscal-architecture-of-displacement.html
publications/fiscal-architecture-working-paper.html
assets/publications/governance-by-design.pdf
assets/publications/infrastructure-finance-gap.pdf
assets/publications/beyond-shock-responsiveness.pdf
assets/publications/fiscal-architecture-of-displacement.pdf
assets/publications/fiscal-architecture-working-paper.pdf

After deployment, each PDF should resolve at:
https://displacementpolicy.org/assets/publications/<filename>.pdf

For a plain static HTML site, the assets/publications folder sits at the repo root.
For Next.js, Vite, or similar frameworks, put the same folder under public/ so the public URL remains /assets/publications/<filename>.pdf.
