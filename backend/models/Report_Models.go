package models

import (
	"time"
	"fmt"
	"gorm.io/gorm"
)	

type Report struct {
	ID string `gorm:"type:varchar(10);primaryKey" json:"id"`
	Description string `gorm:"type:text;not null" json:"description"`
	ImageURL string `gorm:"type:varchar(255)" json:"image_url,omitempty"`
	Status string `gorm:"type:enum('pending', 'in_progress', 'resolved');default:'pending'" json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (r *Report) BeforeCreate(tx *gorm.DB) (err error) {
	var count int64
	tx.Model(&Report{}).Count(&count)
	r.ID = fmt.Sprintf("RPT%04d", count+1)
	return
}