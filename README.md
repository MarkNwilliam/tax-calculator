# Tax Calculator

A containerised tax calculator built for the Final Project. Node + Express
serving a small web UI, with the calculation logic in a pure module so it can be
tested exhaustively, built into a container image, and delivered by a Tekton
pipeline running on Kubernetes.

```
browser  ->  Express (app.js)  ->  lib/tax.js   (pure, fully tested)
                    |
                    +-- /api/health    liveness, used by the container HEALTHCHECK
                    +-- /api/calculate payslip-style calculation
                    +-- /api/brackets  the bracket table
```

## Run it

```bash
npm ci
npm test                # 7-spec acceptance suite (graded)
npm run test:regression # 41-spec regression suite
npm run test:all       # both, 48 specs
npm start               # http://localhost:8080

# static nginx container (the five-file variant)
cd web && docker build -t tax-calculator-web:1.0.0 .
```

## Containerise it

```bash
docker build -t tax-calculator:1.0.0 .
docker run -d --name tax-calculator -p 8080:8080 tax-calculator:1.0.0
curl http://localhost:8080/api/health
```

The image installs production dependencies only and drops to the unprivileged
`node` user. It carries a `HEALTHCHECK` against `/api/health`.

## Deliver it with Tekton

```bash
kubectl apply -f tekton/tasks/
kubectl apply -f tekton/pipeline.yaml
kubectl apply -f tekton/run.yaml   # or tekton/pipelinerun.yaml
kubectl get pipelinerun --watch
```

The pipeline runs `clone-source` -> `unit-tests` -> `build-image` -> `deploy`, with an optional
`push-image` step into IBM Cloud Container Registry that is skipped unless
credentials are supplied. The deploy task consumes the build task's image
result, so what gets deployed is exactly what was built.

## Where the container work actually runs

There is no container runtime on the development machine. Every container step -
building the image, running it, hitting it over HTTP, and the whole Tekton run -
executes on GitHub Actions. Each step tees its output into `docs/evidence/`, so
the submission contains real terminal output rather than a claim.

`.github/workflows/ci.yml` has four jobs: `unit-tests`, `build-image`,
`test-container`, and `tekton-pipeline`. The last one creates a kind cluster,
installs Tekton, stands up a local registry, applies the tasks and pipeline, and
runs the pipeline for real.

## The ten graded tasks

| # | Task | Artifact |
|---|---|---|
| 1 | Run unit tests using Jasmine | `npx jasmine` = 7 specs, 0 failures. Evidence: `docs/evidence/01-jasmine-tests-passing`; `npm run test:all` = 48 specs via `docs/evidence/01-jasmine-unit-tests.txt` |
| 2 | Create the Dockerfile | `Dockerfile` |
| 3 | Build the Docker image | `docs/evidence/02-docker-build.txt` |
| 4 | Deploy and test in a container | `docs/evidence/04-docker-image`, `05-container-test.txt` |
| 5 | Tag and push to IBM Cloud Registry | `scripts/ibmcloud-push.sh`, `docs/ibm-cloud-steps.md` |
| 6 | Deploy the Tax Calculator on IBM Cloud | `scripts/ibmcloud-deploy.sh`, `docs/ibm-cloud-steps.md` |
| 7 | Create the Tekton pipeline tasks | `tekton/tasks/` |
| 8 | Extend the pipeline to call the tasks | `tekton/pipeline.yaml` |
| 9 | Run the Tekton pipeline | `docs/evidence/07-tekton-pipelinerun.txt` |
| 10 | Deploy the image built by the pipeline | `docs/evidence/09-tekton-deployed-app.txt` |

Tasks 5 and 6 require an IBM Cloud account with a Container Registry namespace.
No account is available, so those two are not executed. Their scripts are written
and ready, and the identical push-and-deploy path is exercised against a local
registry by the pipeline, so the mechanism is proven even though the IBM Cloud
target is not.

## Test evidence

Every expected figure in the suite is cross-checked against an independent
reference implementation using exact decimal arithmetic rather than trusting the
code to confirm itself. For example, on a taxable income of 77,000:

```
income tax   12,243.50
take home    64,756.50
effective    15.90%
```

`lib/tax.js` reproduces those values exactly.

The suite covers the zero boundary, bracket continuity, monotonicity,
non-numeric and negative input, deductions exceeding income, and VAT supplied as
a percentage instead of a fraction.

## Screenshots

| File | Shows |
|---|---|
| `screenshots/tax-calculator-running.png` | the running app with a completed calculation |

## Project documents

- `docs/epic.md` - the epic, its goal and success criteria
- `docs/stories.md` - the eight stories with acceptance criteria and evidence
- `docs/ibm-cloud-steps.md` - how to run the two IBM Cloud stories
- `docs/evidence/` - captured terminal output from each pipeline stage

## Tax rules

2024 US federal brackets, applied progressively - each slice of income is taxed
at its own rate, not the whole amount at the top rate.

| Taxable income | Rate |
|---|---|
| 0 - 11,200 | 10% |
| 11,200 - 44,725 | 12% |
| 44,725 - 95,375 | 22% |
| 95,375 - 182,100 | 24% |
| 182,100 - 231,250 | 32% |
| 231,250 - 578,125 | 35% |
| above 578,125 | 37% |

VAT is a flat rate applied to the taxable spend entered, not to income.
