import React, { useState } from 'react';
import '../styles/dashboard.css';

const Settings = () => {
    const [autoClassification, setAutoClassification] = useState(true);

    return (
        <div className="dashboard-body">
                <div className="page-title">
                    <h2>Cài đặt hệ thống</h2>
                    <p>Quản lý cấu hình AI và quyền truy cập thành viên.</p>
                </div>

                <div className="settings-card">
                    <div className="settings-header">
                        <h3><i className="fas fa-robot" style={{color: 'var(--accent)'}}></i> Cấu hình AI Agents</h3>
                        <button className="btn-sm" style={{background: 'white', border: '1px solid #e2e8f0', color: '#64748b'}}>
                            <i className="fas fa-sync-alt"></i> Reset
                        </button>
                    </div>

                    <div className="setting-row">
                        <div className="setting-info">
                            <span className="setting-title">Auto-Classification (Tự động phân loại)</span>
                            <span className="setting-desc">Cho phép AI tự động đọc nội dung file tải lên và di chuyển vào thư mục.</span>
                        </div>
                        <div className="setting-action">
                            <div className={`toggle-switch ${autoClassification ? 'active' : ''}`} onClick={() => setAutoClassification(!autoClassification)}></div>
                        </div>
                    </div>

                    <div className="setting-row">
                        <div className="setting-info">
                            <span className="setting-title">Ngôn ngữ OCR ưu tiên</span>
                            <span className="setting-desc">Chọn ngôn ngữ chính để AI nhận diện văn bản chính xác hơn.</span>
                        </div>
                        <div className="setting-action">
                            <select className="custom-select">
                                <option value="vi">Tiếng Việt</option>
                                <option value="en">English</option>
                                <option value="auto">Tự động (Auto)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="settings-card">
                    <div className="settings-header">
                        <h3><i className="fas fa-users" style={{color: 'var(--warning)'}}></i> Thành viên nhóm</h3>
                        <button className="btn-sm" style={{background: 'var(--primary)', color: 'white', border: 'none'}}>
                            <i className="fas fa-user-plus"></i> Thêm mới
                        </button>
                    </div>

                    <div className="member-item">
                        <div className="member-avatar" style={{background: '#0f172a', color: 'white'}}>AD</div>
                        <div className="member-details">
                            <span className="member-name">Admin User (Bạn)</span>
                            <span className="member-email">admin@company.com</span>
                        </div>
                        <span className="role-badge role-owner">Owner</span>
                        <div className="member-actions">
                            <i className="fas fa-cog"></i>
                        </div>
                    </div>
                </div>
            </div>
    );
};

export default Settings;



