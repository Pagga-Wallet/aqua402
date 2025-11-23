FROM golang:1.22-alpine AS builder

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /tmp/clickhouse-migrator ./cmd/clickhouse-migrator

FROM alpine:3.19

RUN apk add --no-cache ca-certificates bash
COPY --from=builder /tmp/clickhouse-migrator /usr/local/bin/clickhouse-migrator

WORKDIR /work
ENTRYPOINT ["/usr/local/bin/clickhouse-migrator"]
CMD ["--help"]

