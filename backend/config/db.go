package config

import (
	"backend/models"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

// DB adalah variabel global agar bisa diakses dari main.go atau controller
var DB *gorm.DB

func getRequiredEnv(key string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		panic(fmt.Sprintf("environment variable %s wajib diisi", key))
	}

	return value
}

func getEnvWithDefault(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	return value
}

func ensureSeedUser(database *gorm.DB, email, username, password, role, label string) {
	var existing models.User
	err := database.Where("email = ?", email).First(&existing).Error
	if err == nil {
		updates := map[string]interface{}{}

		if existing.Role != role {
			updates["role"] = role
		}

		if strings.TrimSpace(existing.Username) == "" && strings.TrimSpace(username) != "" {
			updates["username"] = username
		}

		if len(updates) > 0 {
			if updateErr := database.Model(&existing).Updates(updates).Error; updateErr != nil {
				panic(fmt.Sprintf("gagal update akun dummy %s: %v", label, updateErr))
			}
			fmt.Printf("info: akun dummy %s (%s) disesuaikan\n", label, email)
		}

		return
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		panic(fmt.Sprintf("gagal cek akun dummy %s: %v", label, err))
	}

	hashedPassword, hashErr := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if hashErr != nil {
		panic(fmt.Sprintf("gagal hash password akun dummy %s: %v", label, hashErr))
	}

	seedUser := models.User{
		Email:    email,
		Username: username,
		Password: string(hashedPassword),
		Role:     role,
	}

	if createErr := database.Create(&seedUser).Error; createErr != nil {
		panic(fmt.Sprintf("gagal membuat akun dummy %s: %v", label, createErr))
	}

	fmt.Printf("✅ Akun dummy %s dibuat: %s (password: %s)\n", label, email, password)
}

func seedDefaultUsers(database *gorm.DB) {
	adminEmail := getEnvWithDefault("ADMIN_EMAIL", "admin@cleantrack.local")
	adminUsername := getEnvWithDefault("ADMIN_USERNAME", "Admin CleanTrack")
	adminPassword := strings.TrimSpace(os.Getenv("ADMIN_PASSWORD"))

	if adminPassword == "" {
		adminPassword = "admin123"
		fmt.Println("info: ADMIN_PASSWORD belum diisi, pakai default lokal 'admin123'")
	}

	officerEmail := getEnvWithDefault("OFFICER_EMAIL", "petugas@cleantrack.local")
	officerUsername := getEnvWithDefault("OFFICER_USERNAME", "Petugas CleanTrack")
	officerPassword := strings.TrimSpace(os.Getenv("OFFICER_PASSWORD"))

	if officerPassword == "" {
		officerPassword = "petugas123"
		fmt.Println("info: OFFICER_PASSWORD belum diisi, pakai default lokal 'petugas123'")
	}

	ensureSeedUser(database, adminEmail, adminUsername, adminPassword, "admin", "admin")
	ensureSeedUser(database, officerEmail, officerUsername, officerPassword, "user", "petugas")
}

func ConnectDatabase() {
	// Fallback default agar mudah uji coba di lokal.
	dbHost := getEnvWithDefault("DB_HOST", "127.0.0.1")
	dbPort := getEnvWithDefault("DB_PORT", "3306")
	dbUser := getEnvWithDefault("DB_USER", "root")
	dbPass := os.Getenv("DB_PASS") // Boleh kosong untuk setup lokal tertentu.
	dbName := getEnvWithDefault("DB_NAME", "cleantrack")

	if strings.TrimSpace(dbPass) == "" {
		fmt.Println("info: DB_PASS kosong, mencoba koneksi MySQL tanpa password (mode lokal)")
	}

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		dbUser, dbPass, dbHost, dbPort, dbName)

	database, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		panic(fmt.Sprintf("gagal membuka koneksi MySQL: %v", err))
	}

	sqlDB, err := database.DB()
	if err != nil {
		panic(fmt.Sprintf("gagal mengambil sql.DB instance: %v", err))
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(50)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)

	if pingErr := sqlDB.Ping(); pingErr != nil {
		panic(fmt.Sprintf("gagal ping ke database: %v", pingErr))
	}

	err = database.AutoMigrate(&models.User{}, &models.Report{})
	if err != nil {
		panic(fmt.Sprintf("gagal melakukan AutoMigrate: %v", err))
	}

	seedDefaultUsers(database)

	DB = database

	fmt.Println("✅ Berhasil terkoneksi ke MySQL & migrasi tabel selesai")
}
