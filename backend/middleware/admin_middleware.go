package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func AdminOnlyMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		roleValue, ok := c.Get("role")
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "role pengguna tidak ditemukan"})
			c.Abort()
			return
		}

		role := strings.ToLower(strings.TrimSpace(fmt.Sprintf("%v", roleValue)))
		if role != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "hanya admin yang boleh mengakses endpoint ini"})
			c.Abort()
			return
		}

		c.Next()
	}
}
