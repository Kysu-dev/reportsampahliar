package controllers

import (
	"backend/config"
	"backend/models"
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type createOfficerInput struct {
	Email    string `json:"email" binding:"required,email"`
	Username string `json:"username" binding:"required,min=3"`
	Password string `json:"password" binding:"required,min=6"`
}

type updateOfficerInput struct {
	Email    string `json:"email" binding:"omitempty,email"`
	Username string `json:"username"`
	Password string `json:"password"`
}

type officerResponse struct {
	ID       string `json:"id"`
	Email    string `json:"email"`
	Username string `json:"username"`
	Role     string `json:"role"`
}

func toOfficerResponse(user models.User) officerResponse {
	return officerResponse{
		ID:       user.ID,
		Email:    user.Email,
		Username: user.Username,
		Role:     user.Role,
	}
}

func getOfficerByID(id string) (*models.User, error) {
	var officer models.User
	err := config.DB.Where("id = ? AND role = ?", id, "user").First(&officer).Error
	if err != nil {
		return nil, err
	}

	return &officer, nil
}

func ListOfficers(c *gin.Context) {
	var officers []models.User
	if err := config.DB.Select("id", "email", "username", "role").Where("role = ?", "user").Order("id asc").Find(&officers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal mengambil daftar petugas"})
		return
	}

	response := make([]officerResponse, 0, len(officers))
	for _, officer := range officers {
		response = append(response, toOfficerResponse(officer))
	}

	c.JSON(http.StatusOK, response)
}

func CreateOfficer(c *gin.Context) {
	var input createOfficerInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	email := strings.ToLower(strings.TrimSpace(input.Email))
	username := strings.TrimSpace(input.Username)
	password := strings.TrimSpace(input.Password)

	var existing models.User
	err := config.DB.Where("email = ?", email).First(&existing).Error
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "email petugas sudah terdaftar"})
		return
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal memeriksa email petugas"})
		return
	}

	hashedPassword, hashErr := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if hashErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal membuat password petugas"})
		return
	}

	officer := models.User{
		Email:    email,
		Username: username,
		Password: string(hashedPassword),
		Role:     "user",
	}

	if createErr := config.DB.Create(&officer).Error; createErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menambahkan petugas"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "petugas berhasil ditambahkan",
		"user":    toOfficerResponse(officer),
	})
}

func GetOfficerByID(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id petugas wajib diisi"})
		return
	}

	officer, err := getOfficerByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "petugas tidak ditemukan"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal mengambil detail petugas"})
		return
	}

	c.JSON(http.StatusOK, toOfficerResponse(*officer))
}

func UpdateOfficer(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id petugas wajib diisi"})
		return
	}

	officer, findErr := getOfficerByID(id)
	if findErr != nil {
		if errors.Is(findErr, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "petugas tidak ditemukan"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal mencari data petugas"})
		return
	}

	var input updateOfficerInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}

	if input.Email != "" {
		email := strings.ToLower(strings.TrimSpace(input.Email))
		if email == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "email petugas tidak valid"})
			return
		}

		if email != officer.Email {
			var existing models.User
			err := config.DB.Where("email = ? AND id <> ?", email, officer.ID).First(&existing).Error
			if err == nil {
				c.JSON(http.StatusConflict, gin.H{"error": "email petugas sudah terdaftar"})
				return
			}

			if !errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal memeriksa email petugas"})
				return
			}

			updates["email"] = email
		}
	}

	if input.Username != "" {
		username := strings.TrimSpace(input.Username)
		if username == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "nama petugas tidak boleh kosong"})
			return
		}

		updates["username"] = username
	}

	if input.Password != "" {
		password := strings.TrimSpace(input.Password)
		if len(password) < 6 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "password minimal 6 karakter"})
			return
		}

		hashedPassword, hashErr := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if hashErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal membuat password petugas"})
			return
		}

		updates["password"] = string(hashedPassword)
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tidak ada data yang diubah"})
		return
	}

	if updateErr := config.DB.Model(&models.User{}).Where("id = ? AND role = ?", id, "user").Updates(updates).Error; updateErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal memperbarui data petugas"})
		return
	}

	updatedOfficer, fetchErr := getOfficerByID(id)
	if fetchErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "petugas berhasil diubah tapi gagal memuat data terbaru"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "data petugas berhasil diperbarui",
		"user":    toOfficerResponse(*updatedOfficer),
	})
}

func DeleteOfficer(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id petugas wajib diisi"})
		return
	}

	if _, err := getOfficerByID(id); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "petugas tidak ditemukan"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal mencari data petugas"})
		return
	}

	if deleteErr := config.DB.Where("id = ? AND role = ?", id, "user").Delete(&models.User{}).Error; deleteErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menghapus petugas"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "petugas berhasil dihapus"})
}
