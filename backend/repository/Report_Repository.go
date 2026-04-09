package repository

import (
	"backend/models"
	"gorm.io/gorm"
)

type ReportRepository interface {
	Create(report models.Report) (models.Report, error)
	GetAll() ([]models.Report, error)
	UpdateStatus(id string, status string) error
}

type reportRepository struct {
	db *gorm.DB
}

func NewReportRepository(db *gorm.DB) *reportRepository {
	return &reportRepository{db}
}

func (r *reportRepository) Create(report models.Report) (models.Report, error) {
	err := r.db.Create(&report).Error
	return report, err
}

func (r *reportRepository) GetAll() ([]models.Report, error) {
	var reports []models.Report
	err := r.db.Find(&reports).Error
	return reports, err
}

func (r *reportRepository) UpdateStatus(id string, status string) error {
	return r.db.Model(&models.Report{}).Where("id = ?", id).Update("status", status).Error
}