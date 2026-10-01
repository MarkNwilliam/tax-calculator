# Stories

Each story follows the same shape: the user need, the acceptance criteria that
prove it is met, and the evidence that was captured.

---

## TAX-1 — Containerise the application

**As a** developer deploying the Tax Calculator
**I want** a Dockerfile that packages the app and its dependencies
**So that** the application runs identically on my machine, in the pipeline and
on IBM Cloud.

**Acceptance criteria**

- [x] A `Dockerfile` exists at the repository root.
- [x] The image installs production dependencies only; Jasmine and supertest are
      excluded via `npm ci --omit=dev`.
- [x] The container runs as a non-root user.
- [x] The container declares `EXPOSE 3000` and a `HEALTHCHECK` against
      `/api/health`.
- [x] `docker build -t tax-calculator:1.0.0 .` succeeds.
- [x] The image is tagged `tax-calculator:latest` for the registry push.

**Evidence:** `Dockerfile`, `docs/evidence/02-docker-build.txt`,
`docs/evidence/03-docker-image-details.txt`

**Points:** 3

---

## TAX-2 — Add a Jasmine unit test suite

**As a** developer changing the tax rules
**I want** automated tests over the calculation logic and the HTTP API
**So that** a regression is caught before it reaches a deployment.

**Acceptance criteria**

- [x] Jasmine is configured via `spec/support/jasmine.json`, which discovers the
      7-spec acceptance suite `spec/tax-calculator.spec.js` under the exact
      `npx jasmine` command.
- [x] A second config, `spec/support/jasmine-regression.json`, discovers the
      41-spec regression suite in `spec/regression/`.
- [x] `npm test` runs the suite and exits non-zero on failure.
- [x] The pure calculation logic is covered without needing a server.
- [x] The HTTP API is covered with `supertest`.
- [x] Edge cases are covered: zero income, negative income, non-numeric input,
      deductions exceeding income, and VAT given as a percentage instead of a
      fraction.
- [x] Bracket boundaries are tested for continuity, not just the headline number.
- [x] Every expected figure is cross-checked against an independent reference
      implementation.

**Evidence:** `spec/tax-calculator.spec.js` (7 specs, run with `npx jasmine`),
`spec/regression/tax.spec.js` + `spec/regression/api.spec.js` (41 specs,
`npm run test:regression`),
`docs/evidence/01-jasmine-tests-passing`,
`docs/evidence/01-jasmine-unit-tests.txt`

**Points:** 5

---

## TAX-3 — Deploy and verify the container locally

**As a** reviewer
**I want** to run the built image and call it over HTTP
**So that** I can see the containerised application actually works.

**Acceptance criteria**

- [x] `docker run -d -p 3000:3000 tax-calculator:1.0.0` starts the app.
- [x] `GET /api/health` returns `{"status":"ok"}` with HTTP 200.
- [x] `POST /api/calculate` returns the correct tax for a known income.
- [x] A negative income is rejected with HTTP 400 rather than a 500 crash.
- [x] `GET /` serves the calculator frontend.
- [x] The container reports `healthy` from its own `HEALTHCHECK`.

**Evidence:** `docs/evidence/04-docker-run.txt`,
`docs/evidence/05-container-test.txt`, `screenshots/tax-calculator-running.png`

**Points:** 3

---

## TAX-4 — Publish the image to IBM Cloud Container Registry

**As a** release engineer
**I want** the image tagged and pushed to IBM Cloud Container Registry
**So that** IBM Cloud can pull and run it.

**Acceptance criteria**

- [ ] The image is tagged with the registry host, namespace and version.
- [ ] `ibmcloud cr login` and `docker push` complete successfully.
- [ ] The image is visible via `ibmcloud cr image-list`.

**Blocker:** requires an IBM Cloud account and a Container Registry namespace.
Not performed locally, because no IBM Cloud account is available.

**Evidence:** `scripts/ibmcloud-push.sh` (ready to run),
`docs/ibm-cloud-steps.md`

**Points:** 3

---

## TAX-5 — Deploy the Tax Calculator on IBM Cloud

**As a** product owner
**I want** the containerised Tax Calculator running on IBM Cloud
**So that** it is reachable by users.

**Acceptance criteria**

- [ ] The application is deployed to IBM Cloud (Code Engine or Kubernetes
      Service) from the pushed image.
- [ ] A public URL is returned and answers `/api/health`.
- [ ] A calculation submitted through the public URL returns the correct result.
- [ ] A screenshot of the deployed application is captured.

**Blocker:** requires an IBM Cloud account. Not performed locally.

**Evidence:** `scripts/ibmcloud-deploy.sh` (ready to run),
`docs/ibm-cloud-steps.md`

**Points:** 5

---

## TAX-6 — Create the Tekton pipeline tasks

**As a** platform engineer
**I want** the delivery steps expressed as reusable Tekton tasks
**So that** each stage of the pipeline is defined once and reused.

**Acceptance criteria**

- [x] A task runs the Jasmine unit tests in-cluster.
- [x] A task builds the image and pushes it to a registry.
- [x] A task tags and pushes the image to IBM Cloud Container Registry.
- [x] A task deploys the built image to the cluster and verifies it responds.
- [x] Each task declares parameters and results rather than hard-coded values.
- [x] The unit-test task fails the pipeline when a spec fails.

**Evidence:** `tekton/tasks/unit-tests.yaml`, `tekton/tasks/build-image.yaml`,
`tekton/tasks/push-image.yaml`, `tekton/tasks/deploy.yaml`

**Points:** 5

---

## TAX-7 — Assemble the pipeline from the tasks

**As a** platform engineer
**I want** a pipeline that calls the tasks in the right order
**So that** one PipelineRun performs the whole delivery.

**Acceptance criteria**

- [x] `tax-calculator-pipeline` wires the four tasks together.
- [x] `runAfter` enforces test -> build -> deploy ordering.
- [x] The deploy task consumes the build task's image result, so the deployed
      image is exactly the image that was built.
- [x] The IBM Cloud push is guarded by a `when` expression and is skipped unless
      credentials are supplied.
- [x] The pipeline exposes the deployed URL as a result.

**Evidence:** `tekton/pipeline.yaml`

**Points:** 3

---

## TAX-8 — Run the pipeline and deploy the built image

**As a** reviewer
**I want** the pipeline to actually run and deploy
**So that** the delivery path is proven, not just described.

**Acceptance criteria**

- [x] A PipelineRun executes on a Kubernetes cluster.
- [x] The run reaches `Succeeded=True`.
- [x] Every task run reports `Succeeded`.
- [x] The deploy task's verification step confirms the live app answers
      `/api/health` and returns the correct tax figure.
- [x] The deployed application is reachable and returns real results.

**Evidence:** `docs/evidence/06-tekton-install.txt`,
`docs/evidence/07-tekton-pipelinerun.txt`,
`docs/evidence/08-tekton-task-logs.txt`,
`docs/evidence/09-tekton-deployed-app.txt`

**Points:** 5
