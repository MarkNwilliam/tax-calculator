#!/usr/bin/env bash
#
# TAX-4: tag and push the Tax Calculator image to IBM Cloud Container Registry.
#
# Not run in this repository, because it needs an IBM Cloud account.
# Fill in .env (see .env.example) and run it.
#
#   cp .env.example .env   # then edit .env
#   ./scripts/ibmcloud-push.sh
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
: "${IMAGE_NAME:=tax-calculator}"
: "${IMAGE_TAG:=1.0.0}"

REGISTRY="${IBMCR_REGION}.icr.io"
TARGET="${REGISTRY}/${IBMCR_NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG}"
TARGET_LATEST="${REGISTRY}/${IBMCR_NAMESPACE}/${IMAGE_NAME}:latest"

echo "=== 1. log in non-interactively ==="
ibmcloud login --apikey "$IBMCLOUD_API_KEY" -r "$IBMCR_REGION"
ibmcloud cr region-set "$IBMCR_REGION"

echo
echo "=== 2. ensure a Container Registry namespace exists ==="
if ibmcloud cr namespace-list | grep -qw "$IBMCR_NAMESPACE"; then
  echo "namespace ${IBMCR_NAMESPACE} already exists"
else
  ibmcloud cr namespace-add "$IBMCR_NAMESPACE"
fi

echo
echo "=== 3. authenticate the container runtime against the registry ==="
# Works with docker or podman - both answer to `docker` semantics here.
ibmcloud cr login

echo
echo "=== 4. tag the locally built image ==="
docker tag "${IMAGE_NAME}:${IMAGE_TAG}" "$TARGET"
docker tag "${IMAGE_NAME}:${IMAGE_TAG}" "$TARGET_LATEST"
echo "tagged $TARGET"
echo "tagged $TARGET_LATEST"

echo
echo "=== 5. push ==="
docker push "$TARGET"
docker push "$TARGET_LATEST"

echo
echo "=== 6. confirm the registry sees it ==="
ibmcloud cr image-list | grep "$IMAGE_NAME" || true

echo
echo "Done. Image is available at:"
echo "  $TARGET"
