package config

import (
	"fmt"
	"os"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"backend/models" 
)

// DB adalah variabel global agar bisa diakses dari main.go atau controller
var DB *gorm.DB

func ConnectDatabase() {
	// 1. Ambil data dari .env
	dbUser := os.Getenv("DB_USER")
	dbPass := os.Getenv("DB_PASS")
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbName := os.Getenv("DB_NAME")

	// 2. Susun DSN (Data Source Name) untuk MySQL
	// format: user:pass@tcp(host:port)/dbname?charset=utf8mb4&parseTime=True&loc=Local
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		dbUser, dbPass, dbHost, dbPort, dbName)

	// 3. Buka koneksi ke MySQL
	database, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})

	if err != nil {
		fmt.Println("--- ERROR KONEKSI DATABASE ---")
		fmt.Println("Pastikan MySQL sudah menyala dan database sudah dibuat.")
		panic(err)
	}

	// 4. Auto Migration
	// Ini akan otomatis membuat tabel 'users' dan 'reports' di database kamu
	// berdasarkan struct yang ada di folder models
	err = database.AutoMigrate(&models.User{}, &models.Report{})
	if err != nil {
		fmt.Println("Gagal melakukan AutoMigrate:", err)
	}

	// 5. Simpan koneksi ke variabel global DB
	DB = database

	fmt.Println("✅ Berhasil terkoneksi ke Database & Migrasi Selesai!")
}