package utils

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

func buildPublicBaseURL() string {
	publicBaseURL := strings.TrimSpace(os.Getenv("PUBLIC_BASE_URL"))
	if publicBaseURL != "" {
		return strings.TrimRight(publicBaseURL, "/")
	}

	port := strings.TrimSpace(os.Getenv("PORT"))
	if port == "" {
		port = "8080"
	}

	return fmt.Sprintf("http://localhost:%s", port)
}

func uploadToLocal(fileHeader *multipart.FileHeader) (string, error) {
	file, err := fileHeader.Open()
	if err != nil {
		return "", fmt.Errorf("gagal membuka file upload: %w", err)
	}
	defer file.Close()

	uploadDir := filepath.Join("uploads", "reports")
	if mkdirErr := os.MkdirAll(uploadDir, 0o755); mkdirErr != nil {
		return "", fmt.Errorf("gagal menyiapkan folder upload lokal: %w", mkdirErr)
	}

	extension := filepath.Ext(fileHeader.Filename)
	fileName := fmt.Sprintf("%d-%s%s", time.Now().Unix(), uuid.NewString(), extension)
	targetPath := filepath.Join(uploadDir, fileName)

	targetFile, createErr := os.Create(targetPath)
	if createErr != nil {
		return "", fmt.Errorf("gagal membuat file upload lokal: %w", createErr)
	}
	defer targetFile.Close()

	if _, copyErr := io.Copy(targetFile, file); copyErr != nil {
		return "", fmt.Errorf("gagal menyimpan file upload lokal: %w", copyErr)
	}

	baseURL := buildPublicBaseURL()
	return fmt.Sprintf("%s/uploads/reports/%s", baseURL, fileName), nil
}

func UploadToS3(fileHeader *multipart.FileHeader) (string, error) {
	bucketName := strings.TrimSpace(os.Getenv("AWS_S3_BUCKET"))
	region := strings.TrimSpace(os.Getenv("AWS_REGION"))
	accessKeyID := strings.TrimSpace(os.Getenv("AWS_ACCESS_KEY_ID"))
	secretAccessKey := strings.TrimSpace(os.Getenv("AWS_SECRET_ACCESS_KEY"))
	sessionToken := strings.TrimSpace(os.Getenv("AWS_SESSION_TOKEN"))

	if bucketName == "" || region == "" || accessKeyID == "" || secretAccessKey == "" {
		return uploadToLocal(fileHeader)
	}

	cfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithRegion(region),
		config.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(accessKeyID, secretAccessKey, sessionToken),
		),
	)
	if err != nil {
		return "", fmt.Errorf("gagal load konfigurasi AWS: %w", err)
	}

	client := s3.NewFromConfig(cfg)

	file, err := fileHeader.Open()
	if err != nil {
		return "", fmt.Errorf("gagal membuka file upload: %w", err)
	}
	defer file.Close()

	buffer, err := io.ReadAll(file)
	if err != nil {
		return "", fmt.Errorf("gagal membaca file upload: %w", err)
	}

	contentType := fileHeader.Header.Get("Content-Type")
	if strings.TrimSpace(contentType) == "" {
		contentType = http.DetectContentType(buffer)
	}

	extension := filepath.Ext(fileHeader.Filename)
	objectKey := fmt.Sprintf("reports/%d-%s%s", time.Now().Unix(), uuid.NewString(), extension)

	_, err = client.PutObject(context.Background(), &s3.PutObjectInput{
		Bucket:      aws.String(bucketName),
		Key:         aws.String(objectKey),
		Body:        bytes.NewReader(buffer),
		ContentType: aws.String(contentType),
	})

	if err != nil {
		return "", fmt.Errorf("gagal upload ke S3: %w", err)
	}

	url := fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, objectKey)
	return url, nil
}
