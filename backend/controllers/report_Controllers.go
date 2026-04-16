package controllers

import (
	"backend/config"
	"backend/models"
	"backend/utils"
	"errors"
	"math"
	"mime/multipart"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type updateStatusRequest struct {
	Status string `json:"status" binding:"required"`
	Note   string `json:"note"`
}

type reportResponse struct {
	ID          string    `json:"id"`
	NamaPelapor string    `json:"namaPelapor"`
	NomorWA     string    `json:"nomorWA"`
	Lokasi      string    `json:"lokasi"`
	Latitude    *float64  `json:"latitude,omitempty"`
	Longitude   *float64  `json:"longitude,omitempty"`
	Deskripsi   string    `json:"deskripsi"`
	FotoURL     string    `json:"fotoURL"`
	Status      string    `json:"status"`
	Severity    string    `json:"severity"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

func toReportResponse(report models.Report) reportResponse {
	return reportResponse{
		ID:          report.ID,
		NamaPelapor: report.NamaPelapor,
		NomorWA:     report.NomorWA,
		Lokasi:      report.Lokasi,
		Latitude:    report.Latitude,
		Longitude:   report.Longitude,
		Deskripsi:   report.Deskripsi,
		FotoURL:     report.FotoURL,
		Status:      report.Status,
		Severity:    models.NormalizeReportSeverity(report.Severity),
		CreatedAt:   report.CreatedAt,
		UpdatedAt:   report.UpdatedAt,
	}
}

func firstNonEmpty(c *gin.Context, keys ...string) string {
	for _, key := range keys {
		value := strings.TrimSpace(c.PostForm(key))
		if value != "" {
			return value
		}
	}

	return ""
}

func parseOptionalCoordinate(rawValue, label string) (*float64, error) {
	trimmed := strings.TrimSpace(rawValue)
	if trimmed == "" {
		return nil, nil
	}

	value, err := strconv.ParseFloat(trimmed, 64)
	if err != nil {
		return nil, errors.New(label + " tidak valid")
	}

	return &value, nil
}

func parseCoordinatePair(rawValue string) (*float64, *float64, bool) {
	trimmed := strings.TrimSpace(rawValue)
	if trimmed == "" {
		return nil, nil, false
	}

	parts := strings.Split(trimmed, ",")
	if len(parts) < 2 {
		return nil, nil, false
	}

	lat, errLat := strconv.ParseFloat(strings.TrimSpace(parts[0]), 64)
	lng, errLng := strconv.ParseFloat(strings.TrimSpace(parts[1]), 64)
	if errLat != nil || errLng != nil {
		return nil, nil, false
	}

	return &lat, &lng, true
}

func validateCoordinateRange(latitude, longitude *float64) error {
	if latitude != nil && math.Abs(*latitude) > 90 {
		return errors.New("latitude harus di antara -90 dan 90")
	}

	if longitude != nil && math.Abs(*longitude) > 180 {
		return errors.New("longitude harus di antara -180 dan 180")
	}

	return nil
}

func resolveCoordinatesInput(c *gin.Context, lokasi string) (*float64, *float64, error) {
	latitudeRaw := firstNonEmpty(c, "latitude", "lat")
	longitudeRaw := firstNonEmpty(c, "longitude", "lng", "long", "lon")

	if strings.TrimSpace(latitudeRaw) != "" || strings.TrimSpace(longitudeRaw) != "" {
		latitude, latErr := parseOptionalCoordinate(latitudeRaw, "latitude")
		if latErr != nil {
			return nil, nil, latErr
		}

		longitude, lngErr := parseOptionalCoordinate(longitudeRaw, "longitude")
		if lngErr != nil {
			return nil, nil, lngErr
		}

		if latitude == nil || longitude == nil {
			return nil, nil, errors.New("latitude dan longitude harus diisi bersamaan")
		}

		if rangeErr := validateCoordinateRange(latitude, longitude); rangeErr != nil {
			return nil, nil, rangeErr
		}

		return latitude, longitude, nil
	}

	latitude, longitude, found := parseCoordinatePair(lokasi)
	if !found {
		return nil, nil, nil
	}

	if rangeErr := validateCoordinateRange(latitude, longitude); rangeErr != nil {
		return nil, nil, rangeErr
	}

	return latitude, longitude, nil
}

func getUploadedImage(c *gin.Context) (*multipart.FileHeader, error) {
	candidateFields := []string{"image", "foto", "file", "cleanupPhoto", "images"}
	for _, field := range candidateFields {
		file, err := c.FormFile(field)
		if err == nil {
			return file, nil
		}
	}

	multipartForm, err := c.MultipartForm()
	if err == nil {
		for _, files := range multipartForm.File {
			if len(files) > 0 {
				return files[0], nil
			}
		}
	}

	return nil, errors.New("gambar laporan wajib ada")
}

func CreateReport(c *gin.Context) {
	namaPelapor := firstNonEmpty(c, "nama_pelapor", "namaPelapor", "reporter_name", "reporterName")
	nomorWA := firstNonEmpty(c, "nomor_wa", "nomorWA", "whatsapp", "phone")
	lokasi := firstNonEmpty(c, "lokasi", "location")
	deskripsi := firstNonEmpty(c, "deskripsi", "description")
	severity := models.NormalizeReportSeverity(firstNonEmpty(c, "severity", "tingkat", "priority", "urgency", "level"))

	if namaPelapor == "" || lokasi == "" || deskripsi == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "nama pelapor, lokasi, dan deskripsi wajib diisi",
		})
		return
	}

	latitude, longitude, coordinateErr := resolveCoordinatesInput(c, lokasi)
	if coordinateErr != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": coordinateErr.Error()})
		return
	}

	imageFile, err := getUploadedImage(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	fotoURL, err := utils.UploadToS3(imageFile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal upload ke S3: " + err.Error()})
		return
	}

	report := models.Report{
		NamaPelapor: namaPelapor,
		NomorWA:     nomorWA,
		Lokasi:      lokasi,
		Latitude:    latitude,
		Longitude:   longitude,
		Deskripsi:   deskripsi,
		FotoURL:     fotoURL,
		Status:      models.ReportStatusPending,
		Severity:    severity,
	}

	if err := config.DB.Create(&report).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal simpan ke database RDS"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "laporan berhasil dibuat",
		"data":    toReportResponse(report),
	})
}

func GetReports(c *gin.Context) {
	var reports []models.Report
	if err := config.DB.Order("created_at desc").Find(&reports).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal mengambil data laporan"})
		return
	}

	response := make([]reportResponse, 0, len(reports))
	for _, report := range reports {
		response = append(response, toReportResponse(report))
	}

	c.JSON(http.StatusOK, response)
}

func GetReportByID(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))

	var report models.Report
	if err := config.DB.First(&report, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "laporan tidak ditemukan"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal mengambil detail laporan"})
		return
	}

	c.JSON(http.StatusOK, toReportResponse(report))
}

func UpdateReportStatus(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))

	var input updateStatusRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "format request status tidak valid"})
		return
	}

	normalizedStatus, err := models.NormalizeReportStatus(input.Status)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updateResult := config.DB.Model(&models.Report{}).Where("id = ?", id).Update("status", normalizedStatus)
	if updateResult.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal memperbarui status laporan"})
		return
	}

	if updateResult.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "laporan tidak ditemukan"})
		return
	}

	var updatedReport models.Report
	if err := config.DB.First(&updatedReport, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "status berhasil diupdate tapi gagal mengambil data terbaru"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "status laporan berhasil diperbarui",
		"data":    toReportResponse(updatedReport),
	})
}

func UpdateReportFollowUp(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	statusRaw := strings.TrimSpace(c.PostForm("status"))
	if statusRaw == "" {
		var bodyInput updateStatusRequest
		if err := c.ShouldBindJSON(&bodyInput); err == nil {
			statusRaw = bodyInput.Status
		}
	}

	if statusRaw == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "status wajib diisi"})
		return
	}

	normalizedStatus, err := models.NormalizeReportStatus(statusRaw)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{
		"status": normalizedStatus,
	}

	cleanupPhoto, fileErr := getUploadedImage(c)
	if fileErr == nil {
		fotoURL, uploadErr := utils.UploadToS3(cleanupPhoto)
		if uploadErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal upload foto hasil pembersihan: " + uploadErr.Error()})
			return
		}

		updates["foto_url"] = fotoURL
	}

	updateResult := config.DB.Model(&models.Report{}).Where("id = ?", id).Updates(updates)
	if updateResult.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menyimpan tindak lanjut laporan"})
		return
	}

	if updateResult.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "laporan tidak ditemukan"})
		return
	}

	var updatedReport models.Report
	if err := config.DB.First(&updatedReport, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "tindak lanjut berhasil disimpan tapi gagal membaca data terbaru"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "tindak lanjut laporan berhasil disimpan",
		"data":    toReportResponse(updatedReport),
	})
}
