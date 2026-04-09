package models

import (
	"fmt"
	"gorm.io/gorm"
)

type User struct {
	ID       string `gorm:"type:varchar(10);primaryKey" json:"id"`
	Username string `gorm:"type:varchar(100);unique;not null" json:"username"`
	Password string `gorm:"type:varchar(255);not null" json:"-"`
	Role     string `gorm:"type:enum('admin', 'user');default:'user'" json:"role"`
}

func (u *User) BeforeCreate(tx *gorm.DB) (err error) {
	var count int64
	// Hitung ada berapa user sekarang
	tx.Model(&User{}).Count(&count)
	
	// Format: USR + nomor urut (0001, 0002, dst)
	u.ID = fmt.Sprintf("USR%04d", count+1)
	return
}