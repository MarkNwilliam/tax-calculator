# Tax Calculator - production image
#
# Build:  docker build -t tax-calculator:1.0.0 .
# Run:    docker run -p 8080:8080 tax-calculator:1.0.0
#
# The runtime image carries production dependencies only. Jasmine and
# supertest are devDependencies and are deliberately left out - they run
# in the Tekton unit-test task and in CI, not in the shipped image.

FROM node:20-alpine

ENV NODE_ENV=production \
    PORT=8080

WORKDIR /app

# Copy manifests first so dependency install is cached independently of source.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY app.js ./
COPY lib ./lib
COPY public ./public

# Drop privileges: the base image ships an unprivileged `node` user.
USER node

EXPOSE 8080

# The same endpoint the CI container test and the Tekton deploy task call.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "app.js"]