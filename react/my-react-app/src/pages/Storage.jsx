import React from 'react';
import '../styles/dashboard.css';

const Storage = () => {
    return (
        <div className="dashboard-body">
                <div className="page-title">
                    <h2>Quản lý Lưu trữ & Backup</h2>
                    <p>AI Secure Archiving Agent đang bảo vệ dữ liệu và tối ưu hóa chi phí lưu trữ.</p>
                </div>

                <div className="backup-status">
                    <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                        <i className="fas fa-check-circle" style={{fontSize: '24px'}}></i>
                        <div>
                            <div style={{fontWeight: 700}}>Hệ thống an toàn</div>
                            <div style={{fontSize: '13px'}}>Bản sao lưu gần nhất: <strong>03:00 AM hôm nay</strong> • Đã mã hóa AES-256</div>
                        </div>
                    </div>
                    <button className="btn-sm" style={{background: '#166534', color: 'white', border: 'none'}}>Sao lưu ngay</button>
                </div>

                <div className="storage-overview">
                    <div className="storage-header">
                        <div className="storage-total">124.5 GB <span>đã dùng trên 500 GB</span></div>
                        <button className="btn-sm" style={{background: 'white', border: '1px solid #e2e8f0', color: 'var(--text-dark)'}}>Nâng cấp gói</button>
                    </div>
                    
                    <div className="storage-bar">
                        <div className="sb-segment bg-docs" style={{width: '45%'}} title="Tài liệu (Docs)"></div>
                        <div className="sb-segment bg-media" style={{width: '25%'}} title="Hình ảnh/Video"></div>
                        <div className="sb-segment bg-backup" style={{width: '15%'}} title="Bản Backup"></div>
                    </div>

                    <div className="storage-legend">
                        <div className="legend-item"><div className="dot bg-docs"></div> Tài liệu (45%)</div>
                        <div className="legend-item"><div className="dot bg-media"></div> Hình ảnh/Video (25%)</div>
                        <div className="legend-item"><div className="dot bg-backup"></div> Backup Hệ thống (15%)</div>
                        <div className="legend-item"><div className="dot bg-other"></div> Còn trống (15%)</div>
                    </div>
                </div>

                <h3 style={{marginBottom: '20px', fontSize: '18px'}}>Quy tắc Vòng đời (AI Automation Rules)</h3>
                <div className="policy-grid">
                    <div className="policy-card policy-active">
                        <div className="policy-header">
                            <div className="policy-title"><i className="fas fa-history" style={{color: 'var(--success)', marginRight: '8px'}}></i> Lưu trữ dài hạn</div>
                            <div className="switch-toggle switch-active"></div>
                        </div>
                        <p className="policy-desc">Tự động chuyển các tài liệu Hợp đồng đã ký xong trên <strong>5 năm</strong> vào kho lạnh (Cold Storage) để giảm chi phí.</p>
                        <div style={{fontSize: '12px', color: 'var(--text-light)'}}>
                            <i className="fas fa-robot"></i> AI gợi ý: Đã chuyển 1,200 files tháng này.
                        </div>
                    </div>
                </div>
            </div>
    );
};

export default Storage;
