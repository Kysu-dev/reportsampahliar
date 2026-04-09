package utils

import (
	"context"
	"fmt"
	"mime/multipart"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

func UploadToS3(fileHeader *multipart.FileHeader) (string, error) {
	// 1. Load Konfigurasi AWS dari .env
	cfg, err := config.LoadDefaultConfig(context.TODO(), 
		config.WithRegion(os.Getenv("AWS_REGION")),
	)
	if err != nil {
		return "", err
	}

	client := s3.NewFromConfig(cfg)

	// 2. Buka file yang dikirim user
	file, err := fileHeader.Open()
	if err != nil {
		return "", err
	}
	defer file.Close()

	// 3. Tentukan nama file di S3 (kita beri prefix 'reports/' agar rapi)
	bucketName := os.Getenv("AWS_S3_BUCKET")
	fileName := fmt.Sprintf("reports/%d-%s", os.Getpid(), fileHeader.Filename)

	// 4. Proses Upload
	_, err = client.PutObject(context.TODO(), &s3.PutObjectInput{
		Bucket: aws.String(bucketName),
		Key:    aws.String(fileName),
		Body:   file,
	})

	if err != nil {
		return "", err
	}

	// 5. Kembalikan URL publik file tersebut
	url := fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", bucketName, os.Getenv("AWS_REGION"), fileName)
	return url, nil
}