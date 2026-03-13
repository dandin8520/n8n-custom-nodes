FROM n8nio/n8n:latest

USER root

# Install TypeScript and gulp globally (no system packages needed)
RUN npm install -g typescript gulp-cli

# Copy the custom nodes
COPY n8n-nodes-israeli-land-tenders /usr/local/lib/node_modules/n8n-nodes-israeli-land-tenders
COPY n8n-nodes-mavat-plans /usr/local/lib/node_modules/n8n-nodes-mavat-plans
COPY n8n-nodes-israel-settlements /usr/local/lib/node_modules/n8n-nodes-israel-settlements

# Install dependencies and build each package
WORKDIR /usr/local/lib/node_modules/n8n-nodes-israeli-land-tenders
RUN npm install && npm run build

WORKDIR /usr/local/lib/node_modules/n8n-nodes-mavat-plans
RUN npm install && npm run build

WORKDIR /usr/local/lib/node_modules/n8n-nodes-israel-settlements
RUN npm install && npm run build

# Clean up dev dependencies to reduce image size
RUN cd /usr/local/lib/node_modules/n8n-nodes-israeli-land-tenders && npm prune --production && \
    cd /usr/local/lib/node_modules/n8n-nodes-mavat-plans && npm prune --production && \
    cd /usr/local/lib/node_modules/n8n-nodes-israel-settlements && npm prune --production

WORKDIR /data
USER node

ENV N8N_CUSTOM_EXTENSIONS=/usr/local/lib/node_modules
