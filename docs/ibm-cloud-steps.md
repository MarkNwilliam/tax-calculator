# Running the IBM Cloud steps (TAX-4 and TAX-5)

These two stories are the only ones that could not be executed, because they
need an IBM Cloud account with a Container Registry namespace. Everything they
depend on is finished and verified: the `Dockerfile` builds, the image runs, the
tasks exist, and the pipeline performs the identical push and deploy against a
local registry.

The scripts below are written and ready. They are the same commands used
manually, so whichever route is taken the result is the same.

## 1. Create the API key and namespace

```bash
ibmcloud login                       # interactive, once
ibmcloud cr namespace-add tax-calculator
ibmcloud iam api-key-create tax-calculator-key --file tax-calculator-key.json
```

Put the key in `.env`:

```bash
cp .env.example .env
# edit .env and set IBMCLOUD_API_KEY
```

## 2. TAX-4 - tag and push the image

```bash
./scripts/ibmcloud-push.sh
```

Expected output, in order:

1. `ibmcloud login --apikey ...` succeeds
2. the namespace is confirmed or created
3. `ibmcloud cr login` writes registry credentials to the local config
4. two tags are applied - `1.0.0` and `latest`
5. both tags are pushed
6. `ibmcloud cr image-list` shows the tag with a digest

**Screenshot for the submission: the `ibmcloud cr image-list` output showing the
pushed image and its digest.**

## 3. TAX-5 - deploy and verify

Either hosting option from the brief:

```bash
# Code Engine - simplest, gives a public HTTPS URL
DEPLOY_TARGET=codeengine ./scripts/ibmcloud-deploy.sh

# or Kubernetes Service
DEPLOY_TARGET=kubernetes ./scripts/ibmcloud-deploy.sh
```

The script finishes by calling `/api/health` and `/api/calculate` on the public
URL, so a successful run is itself the proof the deployment works.

**Screenshot for the submission: the browser on the public URL showing a
completed calculation.**

## 4. Doing the same through the pipeline

Set the pipeline parameters to enable the guarded push task:

```yaml
params:
  - name: push-image
    value: "true"
  - name: ibmcr-registry
    value: us-south.icr.io
  - name: ibmcr-namespace
    value: tax-calculator
```

The `push-image` task reads credentials from a secret, so create it first:

```bash
kubectl create secret generic ibmcr-registry-auth \
  --from-file=config.json=<(ibmcloud cr token-get)
```

Without that secret the `push-image` task stays skipped, which is exactly how
this repository runs: the build, test and deploy tasks execute for real against
the local registry, and the IBM Cloud push is the only step guarded off.
