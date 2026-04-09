package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func GetReports(c*gin.Context, db *gorm.DB) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Get Report Endpoint - Not Implemented Yet",
	})
}

func CreateReport(c*gin.Context, db *gorm.DB) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Create Report",
	})
}
