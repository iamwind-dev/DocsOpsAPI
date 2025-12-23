import React from 'react';
import '../styles/dashboard.css';

const Audit = () => {
    return (
        <div className="dashboard-body">
                <div className="page-title">
                    <h2>Nhật ký Kiểm toán (Audit Logs)</h2>
                    <p>Giám sát tuân thủ GDPR và phát hiện rủi ro bảo mật 24/7.</p>
                </div>

                <div className="ai-alert-box">
                    <i className="fas fa-exclamation-triangle ai-alert-icon"></i>
                    <div className="ai-alert-content">
                        <h4>Phát hiện hành vi bất thường (Anomaly Detection)</h4>
                        <p>AI Audit Tracking Agent đã phát hiện User <b>nguyenvana</b> tải xuống <b>50+ tài liệu</b> trong vòng 2 phút. Vui lòng kiểm tra.</p>
                        <div style={{marginTop: '10px'}}>
                            <button className="btn-sm" style={{background: '#991b1b', color: 'white', border: 'none', marginBottom: '10px'}}>Khóa tài khoản</button>
                            <button className="btn-sm" style={{background: 'white', border: '1px solid #991b1b', color: '#991b1b', marginLeft: '5px'}}>Bỏ qua</button>
                        </div>
                    </div>
                </div>

                <div className="stats-grid" style={{gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px'}}>
                    <div className="card" style={{padding: '20px'}}>
                        <div style={{color: 'var(--text-light)', fontSize: '13px'}}>Điểm tuân thủ (GDPR)</div>
                        <div className="number" style={{color: 'var(--success)'}}>98%</div>
                    </div>
                    <div className="card" style={{padding: '20px'}}>
                        <div style={{color: 'var(--text-light)', fontSize: '13px'}}>Tổng sự kiện (24h)</div>
                        <div className="number">1,204</div>
                    </div>
                    <div className="card" style={{padding: '20px'}}>
                        <div style={{color: 'var(--text-light)', fontSize: '13px'}}>Cảnh báo Rủi ro</div>
                        <div className="number" style={{color: 'var(--danger)'}}>1</div>
                    </div>
                    <div className="card" style={{padding: '20px'}}>
                        <div style={{color: 'var(--text-light)', fontSize: '13px'}}>User đang hoạt động</div>
                        <div className="number">14</div>
                    </div>
                </div>

                <div className="filter-bar">
                    <div className="filter-group">
                        <i className="fas fa-filter" style={{color: '#64748b'}}></i>
                        <span>Lọc theo:</span>
                    </div>
                    <select className="filter-select">
                        <option>Tất cả mức độ</option>
                        <option>Critical (Nguy hiểm)</option>
                        <option>Warning (Cảnh báo)</option>
                        <option>Info (Thông tin)</option>
                    </select>
                    <select className="filter-select">
                        <option>Tất cả hành động</option>
                        <option>Login / Logout</option>
                        <option>Tải xuống (Download)</option>
                        <option>Xóa tài liệu</option>
                    </select>
                    <input type="date" className="filter-select" />
                    <button className="btn-sm" style={{background: 'var(--primary)', color: 'white', border: 'none', marginLeft: 'auto'}}>
                        <i className="fas fa-file-export"></i> Xuất báo cáo
                    </button>
                </div>

                <div className="table-section">
                    <table>
                        <thead>
                            <tr>
                                <th>Thời gian</th>
                                <th>Người thực hiện (Actor)</th>
                                <th>Hành động</th>
                                <th>Đối tượng (Target)</th>
                                <th>Mức độ</th>
                                <th>Kết quả</th>
                                <th>Chi tiết</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{backgroundColor: '#fef2f2'}}>
                                <td>10:45:12 AM <br /><span style={{fontSize: '11px', color: '#94a3b8'}}>25/11/2025</span></td>
                                <td>
                                    <div className="user-cell">
                                        <b>nguyenvana</b>
                                        <span className="user-ip">IP: 14.162.xxx.xxx</span>
                                    </div>
                                </td>
                                <td><b>Mass Download</b></td>
                                <td>50 files (HR Data)</td>
                                <td><span className="badge-level level-critical">Critical</span></td>
                                <td><i className="fas fa-ban" style={{color: 'var(--danger)'}}></i> Blocked</td>
                                <td><i className="fas fa-eye" style={{cursor: 'pointer', color: 'var(--accent)'}}></i></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
    );
};

export default Audit;



