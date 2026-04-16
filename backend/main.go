package main

import (
	"backend/config"
	"backend/controllers"
	"backend/middleware"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("info: file .env tidak ditemukan, fallback ke environment variable runtime")
	}

	config.ConnectDatabase()

	if ginMode := os.Getenv("GIN_MODE"); ginMode != "" {
		gin.SetMode(ginMode)
	}

	r := gin.Default()
	r.Static("/uploads", "./uploads")

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

	r.POST("/auth/register", controllers.Register)
	r.POST("/auth/login", controllers.Login)

	publicAPI := r.Group("/api")
	{
		// Endpoint wajib sesuai spesifikasi.
		publicAPI.POST("/report", controllers.CreateReport)
		publicAPI.GET("/report/:id", controllers.GetReportByID)

		// Alias untuk kompatibilitas frontend lama.
		publicAPI.POST("/reports", controllers.CreateReport)
		publicAPI.GET("/reports/:id", controllers.GetReportByID)
	}

	protectedAPI := r.Group("/api")
	protectedAPI.Use(middleware.AuthMiddleware())
	{
		// Endpoint operasional laporan: admin dan petugas boleh akses.
		protectedAPI.GET("/reports", controllers.GetReports)
		protectedAPI.PATCH("/report/:id/status", controllers.UpdateReportStatus)
		protectedAPI.PATCH("/reports/:id", controllers.UpdateReportStatus)
		protectedAPI.PATCH("/reports/:id/follow-up", controllers.UpdateReportFollowUp)
	}

	adminAPI := r.Group("/api")
	adminAPI.Use(middleware.AuthMiddleware(), middleware.AdminOnlyMiddleware())
	{
		// CRUD user (petugas operasional).
		adminAPI.GET("/users", controllers.ListOfficers)
		adminAPI.POST("/users", controllers.CreateOfficer)
		adminAPI.GET("/users/:id", controllers.GetOfficerByID)
		adminAPI.PATCH("/users/:id", controllers.UpdateOfficer)
		adminAPI.DELETE("/users/:id", controllers.DeleteOfficer)

		// Alias kompatibilitas frontend.
		adminAPI.GET("/officers", controllers.ListOfficers)
		adminAPI.POST("/officers", controllers.CreateOfficer)
		adminAPI.GET("/officers/:id", controllers.GetOfficerByID)
		adminAPI.PATCH("/officers/:id", controllers.UpdateOfficer)
		adminAPI.DELETE("/officers/:id", controllers.DeleteOfficer)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	println("Server berjalan di port: " + port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
