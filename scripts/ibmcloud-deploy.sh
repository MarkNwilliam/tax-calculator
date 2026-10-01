#!/usr/bin/env bash
#
# TAX-5: deploy the pushed Tax Calculator image on IBM Cloud.
#
# Offers both IBM Cloud hosting options from the brief. Pick one:
#
#   DEPLOY_TARGET=codeengine  ./scripts/ibmcloud-deploy.sh
#   DEPLOY_TARGET=kubernetes  ./scripts/ibmcloud-deploy.sh
#
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env ]; then
  # shellcheck disable=SC1091
  set -a; . ./.env; set +a
fi

: "${IBMCLOUD_API_KEY:?set IBMCLOUD_API_KEY in .env}"
: "${IBMCR_REGION:=us-south}"
: "${IBMCR_NAMESPACE:?set IBMCR_NAMESPACE in .env}"
: "${APP_NAME:=tax-calculator}"
: "${IMAGE_NAME:=tax-calculator}"
: "${IMAGE_TAG:=1.0.0}"
: "${DEPLOY_TARGET:=codeengine}"

REGISTRY="${IBMCR_REGION}.icr.io"
IMAGE="${REGISTRY}/${IBMCR_NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG}"

echo "=== logging in ==="
ibmcloud login --apikey "$IBMCLOUD_API_KEY" -r "$IBMCR_REGION"

if [ "$DEPLOY_TARGET" = "codeengine" ]; then
  echo
  echo "=== deploying to IBM Cloud Code Engine ==="
  : "${CE_PROJECT:?set CE_PROJECT in .env for Code Engine}"
  ibmcloud plugin install code-engine -f -q 2>/dev/null || true
  ibmcloud ce project select --name "$CE_PROJECT"

  if ibmcloud ce application get --name "$APP_NAME" >/dev/null 2>&1; then
    echo "updating existing application"
    ibmcloud ce application update --name "$APP_NAME" --image "$IMAGE" --wait
  else
    echo "creating application"
    ibmcloud ce application create \
      --name "$APP_NAME" \
      --image "$IMAGE" \
      --registry-secret icr-secret \
      --port 3000 \
      --min-scale 0 --max-scale 2 \
      --wait
  fi

  URL=$(ibmcloud ce application get --name "$APP_NAME" -o url)

elif [ "$DEPLOY_TARGET" = "kubernetes" ]; then
  echo
  echo "=== deploying to IBM Cloud Kubernetes Service ==="
  : "${IKS_CLUSTER:?set IKS_CLUSTER in .env for Kubernetes}"
  ibmcloud ks cluster config --cluster "$IKS_CLUSTER"

  kubectl create deployment "$APP_NAME" \
    --image="$IMAGE" --port=3000 --dry-run=client -o yaml | kubectl apply -f -
  kubectl create service clusterip "$APP_NAME" \
    --tcp=80:3000 --dry-run=client -o yaml | kubectl apply -f -

  kubectl rollout status "deployment/$APP_NAME" --timeout=300s

  # Expose publicly so the app can be reached for the screenshot.
  kubectl expose deployment "$APP_NAME" --type=LoadBalancer --name="${APP_NAME}-public" \
    --dry-run=client -o yaml | kubectl apply -f -

  echo "waiting for the load balancer hostname..."
  for i in $(seq 1 40); do
    URL=$(kubectl get svc "${APP_NAME}-public" -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || true)
    [ -n "$URL" ] && break
    sleep 15
  done
  URL="http://${URL}"
else
  echo "Unknown DEPLOY_TARGET: $DEPLOY_TARGET" >&2
  exit 1
fi

echo
echo "=== verifying the deployed application ==="
echo "URL: $URL"
curl -sS "${URL}/api/health"; echo
curl -sS -X POST "${URL}/api/calculate" \
  -H 'Content-Type: application/json' \
  -d '{"grossIncome":82000,"deductions":5000,"vatAmount":2400,"vatRate":0.2}'; echo

echo
echo "Deployed and verified at: $URL"
echo "Capture the screenshot of this URL for the submission."
