FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install swag for Swagger documentation generation
RUN go install github.com/swaggo/swag/cmd/swag@latest

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Generate Swagger documentation
# Swagger генерируется при каждом билде для актуальности документации
RUN swag init -g cmd/api/main.go -o docs --parseDependency --parseInternal

# Build the application
RUN go build -o api ./cmd/api

FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

COPY --from=builder /app/api .

# Copy Swagger docs from builder stage
# These will be synced to host via volume mount
COPY --from=builder /app/docs /app/docs

EXPOSE 8080

CMD ["./api"]

