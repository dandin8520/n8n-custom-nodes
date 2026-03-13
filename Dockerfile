FROM n8nio/n8n:latest

USER root

# Copy the custom nodes
COPY n8n-nodes-israeli-land-tenders /usr/local/lib/node_modules/n8n-nodes-israeli-land-tenders
COPY n8n-nodes-mavat-plans /usr/local/lib/node_modules/n8n-nodes-mavat-plans
COPY n8n-nodes-israel-settlements /usr/local/lib/node_modules/n8n-nodes-israel-settlements

# Install dependencies for each package
WORKDIR /usr/local/lib/node_modules/n8n-nodes-israeli-land-tenders
RUN npm install && npm run build

WORKDIR /usr/local/lib/node_modules/n8n-nodes-mavat-plans
RUN npm install && npm run build

WORKDIR /usr/local/lib/node_modules/n8n-nodes-israel-settlements
RUN npm install && npm run build

WORKDIR /data
USER node

ENV N8N_CUSTOM_EXTENSIONS=/usr/local/lib/node_modules
