# Epic: Modernise and automate delivery of the Tax Calculator

| Field | Value |
|---|---|
| Epic ID | TAX-EPIC-1 |
| Epic owner | Mark Nkugwa |
| Status | In progress |
| Priority | High |
| Target | 10 working days |
| Blocks | All Tax Calculator delivery work |

## Problem statement

The Tax Calculator exists only as source code that a developer runs by hand on
their own machine. There is no container image, no automated test suite, no
repeatable pipeline, and no way to get a change in front of a user without a
person manually repeating a sequence of commands they hold in their head.

That has three consequences:

1. **The app cannot be deployed anywhere consistently.** Every environment needs
   its own hand-installed Node runtime and its own set of manual steps.
2. **Nobody trusts a change.** With no automated tests, correctness is whatever
   the last person to click through the form believed.
3. **Delivery cannot be repeated or audited.** Two deployments of the same
   commit can differ, and there is no record of what was built or when.

## Goal

Turn the Tax Calculator into a containerised application whose tests, image
build and deployment are all executed by a Tekton pipeline on Kubernetes, so
that one command takes a commit from source to a running, verified deployment.

## Success criteria

- `npm test` runs a Jasmine suite covering the tax logic and the HTTP API, and
  the pipeline fails if any spec fails.
- `docker build` produces an image that starts and answers `/api/health` with
  200, built from a committed `Dockerfile`.
- The image is tagged and publishable to IBM Cloud Container Registry.
- The application is deployable as a container, both locally and on IBM Cloud.
- A Tekton pipeline defines the tasks for test, build, publish and deploy.
- Running the pipeline deploys an image that answers a real request with the
  correct tax figure.

## Out of scope

- Persistent storage, user accounts, or saved calculations.
- Tax rules for any jurisdiction other than the 2024 US federal brackets.
- TLS termination, autoscaling and production hardening of the cluster itself.

## Stories

| ID | Story | Points | Status |
|---|---|---|---|
| TAX-1 | Containerise the application | 3 | Done |
| TAX-2 | Add a Jasmine unit test suite | 5 | Done |
| TAX-3 | Deploy and verify the container locally | 3 | Done |
| TAX-4 | Publish the image to IBM Cloud Container Registry | 3 | Needs IBM Cloud account |
| TAX-5 | Deploy the Tax Calculator on IBM Cloud | 5 | Needs IBM Cloud account |
| TAX-6 | Create the Tekton pipeline tasks | 5 | Done |
| TAX-7 | Assemble the pipeline from the tasks | 3 | Done |
| TAX-8 | Run the pipeline and deploy the built image | 5 | Done |

Total: 32 points.
