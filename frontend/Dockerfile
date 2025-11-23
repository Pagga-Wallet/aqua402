FROM node:20-alpine AS builder

WORKDIR /app

# Build arguments for contract addresses
# These will be used as environment variables during build
ARG VITE_RFQ_ADDRESS
ARG VITE_AUCTION_ADDRESS
ARG VITE_AQUA_ADDRESS
ARG VITE_AGENT_FINANCE_ADDRESS

# Set as environment variables for Vite
ENV VITE_RFQ_ADDRESS=$VITE_RFQ_ADDRESS
ENV VITE_AUCTION_ADDRESS=$VITE_AUCTION_ADDRESS
ENV VITE_AQUA_ADDRESS=$VITE_AQUA_ADDRESS
ENV VITE_AGENT_FINANCE_ADDRESS=$VITE_AGENT_FINANCE_ADDRESS

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

