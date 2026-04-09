package controllers

import (
	"backend/config"
	"backend/models"
	"backend/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

func CreateReport(c *gin.Context) {
	// 1. Ambil data teks dari Form
	description := c.PostForm("description")
	location := c.PostForm("location")

	// 2. Ambil file gambar dari Form
	file, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Gambar laporan wajib ada"})
		return
	}

	// 3. Jalankan fungsi Upload ke S3
	imageURL, err := utils.UploadToS3(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal upload ke S3: " + err.Error()})
		return
	}

	// 4. Simpan metadata ke database RDS
	report := models.Report{
		Description: description,
		Location:    location,
		ImageURL:    imageURL,
		Status:      "pending",
	}

	if err := config.DB.Create(&report).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal simpan ke database"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Laporan berhasil dibuat!",
		"data":    report,
	})
}

func GetReports(c *gin.Context) {
	var reports []models.Report
	config.DB.Find(&reports)
	c.JSON(http.StatusOK, reports)
}

func UpdateReportStatus(c *gin.Context) {
    id := c.Param("id") // Ambil ID dari URL (contoh: RPT0001)
    
    var input struct {
        Status string `json:"status" binding:"required"`
    }

    if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format status salah"})
		return
	}

    // Update status di database berdasarkan ID
    if err := config.DB.Model(&models.Report{}).Where("id = ?", id).Update("status", input.Status).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update status di database"})
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "message": "Status laporan " + id + " berhasil diubah menjadi " + input.Status,
    })
}