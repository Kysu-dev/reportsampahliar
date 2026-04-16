package models

import (
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	ReportStatusPending = "pending"
	ReportStatusProcess = "process"
	ReportStatusDone    = "done"
)

const (
	ReportSeverityCritical = "critical"
	ReportSeverityMedium   = "medium"
	ReportSeverityLow      = "low"
)

type Report struct {
	ID          string    `gorm:"column:id;type:char(36);primaryKey" json:"id"`
	NamaPelapor string    `gorm:"column:nama_pelapor;type:varchar(120);not null" json:"namaPelapor"`
	NomorWA     string    `gorm:"column:nomor_wa;type:varchar(30)" json:"nomorWA"`
	Lokasi      string    `gorm:"column:lokasi;type:varchar(255);not null" json:"lokasi"`
	Latitude    *float64  `gorm:"column:latitude;type:decimal(10,7)" json:"latitude,omitempty"`
	Longitude   *float64  `gorm:"column:longitude;type:decimal(10,7)" json:"longitude,omitempty"`
	Deskripsi   string    `gorm:"column:deskripsi;type:text;not null" json:"deskripsi"`
	FotoURL     string    `gorm:"column:foto_url;type:varchar(512);not null" json:"fotoURL"`
	Status      string    `gorm:"column:status;type:enum('pending','process','done');default:'pending';not null" json:"status"`
	Severity    string    `gorm:"column:severity;type:varchar(20);default:'medium';not null" json:"severity"`
	CreatedAt   time.Time `gorm:"column:created_at;autoCreateTime" json:"createdAt"`
	UpdatedAt   time.Time `gorm:"column:updated_at;autoUpdateTime" json:"updatedAt"`
}

func (Report) TableName() string {
	return "reports"
}

func (r *Report) BeforeCreate(tx *gorm.DB) (err error) {
	if strings.TrimSpace(r.ID) == "" {
		r.ID = uuid.NewString()
	}

	status, statusErr := NormalizeReportStatus(r.Status)
	if statusErr != nil {
		return statusErr
	}

	r.Status = status
	r.Severity = NormalizeReportSeverity(r.Severity)
	return nil
}

func NormalizeReportStatus(rawStatus string) (string, error) {
	status := strings.ToLower(strings.TrimSpace(rawStatus))

	switch status {
	case "", ReportStatusPending:
		return ReportStatusPending, nil
	case ReportStatusProcess, "in-progress", "in_progress":
		return ReportStatusProcess, nil
	case ReportStatusDone:
		return ReportStatusDone, nil
	default:
		return "", errors.New("status tidak valid, gunakan pending/process/done")
	}
}

func NormalizeReportSeverity(rawSeverity string) string {
	severity := strings.ToLower(strings.TrimSpace(rawSeverity))

	switch severity {
	case "", ReportSeverityMedium, "sedang", "normal":
		return ReportSeverityMedium
	case ReportSeverityCritical, "high", "urgent", "kritis", "tinggi":
		return ReportSeverityCritical
	case ReportSeverityLow, "ringan", "rendah":
		return ReportSeverityLow
	default:
		return ReportSeverityMedium
	}
}
