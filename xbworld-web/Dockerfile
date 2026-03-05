###############################################################################
# XBWorld Frontend Docker image
#
# Serves the web client via nginx. Connects to a separate backend service
# for WebSocket/API traffic via reverse proxy.
#
# Build:
#   docker build -t xbworld-frontend .
#
# Run (connecting to a backend at $BACKEND_URL):
#   docker run -p 8081:80 -e BACKEND_URL=http://localhost:8080 xbworld-frontend
###############################################################################

###############################################################################
# Stage 1: Build TypeScript modules with Vite
###############################################################################
FROM node:22-slim AS ts-builder
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY src/ts/ ./src/ts/
COPY vite.config.ts tsconfig.json ./
# Compile Handlebars templates
COPY src/main/webapp/webclient/*.hbs ./src/main/webapp/webclient/
RUN mkdir -p src/main/webapp/javascript && \
    npx handlebars src/main/webapp/webclient -e hbs \
      -f src/main/webapp/javascript/hbs-templates.js --knownOnly
# Build TS modules
RUN mkdir -p src/main/webapp/javascript/ts-bundle && \
    npx vite build

###############################################################################
# Stage 2: nginx to serve static files + reverse proxy to backend
###############################################################################
FROM nginx:1.27-alpine

# Copy webapp static files
COPY src/main/webapp/ /usr/share/nginx/html/

# Copy Vite-built TS bundle
COPY --from=ts-builder /build/src/main/webapp/javascript/ts-bundle/ \
     /usr/share/nginx/html/javascript/ts-bundle/

# Copy compiled Handlebars templates
COPY --from=ts-builder /build/src/main/webapp/javascript/hbs-templates.js \
     /usr/share/nginx/html/javascript/hbs-templates.js

# nginx config template (envsubst replaces $BACKEND_URL at runtime)
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80
