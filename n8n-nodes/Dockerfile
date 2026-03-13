FROM n8nio/n8n:latest

USER root

# Create dedicated directory for custom nodes
RUN mkdir -p /usr/local/lib/n8n-custom-nodes

# Copy the custom nodes
COPY n8n-nodes-israeli-land-tenders /usr/local/lib/n8n-custom-nodes/n8n-nodes-israeli-land-tenders
COPY n8n-nodes-mavat-plans /usr/local/lib/n8n-custom-nodes/n8n-nodes-mavat-plans
COPY n8n-nodes-dira-lehaskir /usr/local/lib/n8n-custom-nodes/n8n-nodes-dira-lehaskir

# Install dependencies and build each package
# Use --include=dev to ensure devDependencies are installed even if NODE_ENV=production
WORKDIR /usr/local/lib/n8n-custom-nodes/n8n-nodes-israeli-land-tenders
RUN npm install --include=dev && npm run build

WORKDIR /usr/local/lib/n8n-custom-nodes/n8n-nodes-mavat-plans
RUN npm install --include=dev && npm run build

WORKDIR /usr/local/lib/n8n-custom-nodes/n8n-nodes-dira-lehaskir
RUN npm install --include=dev && npm run build

# Clean up dev dependencies to reduce image size
RUN cd /usr/local/lib/n8n-custom-nodes/n8n-nodes-israeli-land-tenders && npm prune --production && \
    cd /usr/local/lib/n8n-custom-nodes/n8n-nodes-mavat-plans && npm prune --production && \
    cd /usr/local/lib/n8n-custom-nodes/n8n-nodes-dira-lehaskir && npm prune --production

WORKDIR /data
USER node

ENV N8N_CUSTOM_EXTENSIONS=/usr/local/lib/n8n-custom-nodes
