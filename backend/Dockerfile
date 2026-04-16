# syntax=docker/dockerfile:1

FROM golang:1.25-alpine AS builder
WORKDIR /app

RUN apk add --no-cache git ca-certificates

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o cleantrack-api ./main.go

FROM alpine:3.22
WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata && adduser -D -g '' appuser

COPY --from=builder /app/cleantrack-api /usr/local/bin/cleantrack-api

EXPOSE 8080

USER appuser
ENTRYPOINT ["cleantrack-api"]
