	package main

	import (
		"backend/config"
		"backend/controllers" 
		"net/http"
		"os"

		"github.com/gin-gonic/gin"
		"github.com/joho/godotenv"
	)

	func main() {
		// 1. Load variabel dari file .env
		err := godotenv.Load()
		if err != nil {
			// Jika di lokal tidak ada .env, jangan panic dulu (siapa tahu pakai ENV sistem)
			println("Warning: .env file not found, using system environment")
		}

		// 2. Inisialisasi Koneksi Database
		config.ConnectDatabase()

		// 3. Setup Router Gin
		r := gin.Default()

		// Middleware CORS (Penting agar frontend bisa akses API kamu nanti)
		r.Use(func(c *gin.Context) {
			c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
			c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			if c.Request.Method == "OPTIONS" {
				c.AbortWithStatus(204)
				return
			}
			c.Next()
		})


		// Jalur test koneksi
		r.GET("/ping", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"status":  "success",
				"message": "Backend  Ready & RDS Connected!",
			})
		})

		// Rute Publik (Siapa saja bisa lapor & lihat)
		r.GET("/reports", func(c *gin.Context) {
			controllers.GetReports(c, config.DB)
		})
		r.POST("/reports", func(c *gin.Context) {
			controllers.CreateReport(c, config.DB)
		})

		// Rute Admin (Nanti kita tambah middleware JWT di sini)
		// r.PATCH("/reports/:id", controllers.UpdateStatus) 

		// 4. Jalankan Server
		port := os.Getenv("PORT")
		if port == "" {
			port = "8080"
		}

		println("Server berjalan di port: " + port)
		r.Run(":" + port)
	}