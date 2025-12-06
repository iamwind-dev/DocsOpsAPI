import React from 'react';
import '../styles/dashboard.css';

const Dashboard = () => {
    return (
        <div className="dashboard-body">
                <div className="page-title">
                    <h2>Xin chào, Admin! 👋</h2>
                    <p>Đây là những gì đang diễn ra với hệ thống tài liệu của bạn hôm nay.</p>
                </div>

                <div className="stats-grid">
                    <div className="card">
                        <div className="card-icon icon-blue"><i className="fas fa-file-alt"></i></div>
                        <h3>Tài liệu mới (Tháng này)</h3>
                        <div className="number">1,245</div>
                        <span className="trend up"><i className="fas fa-arrow-up"></i> 12% so với tháng trước</span>
                    </div>

                    <div className="card">
                        <div className="card-icon icon-orange"><i className="fas fa-file-signature"></i></div>
                        <h3>Đang chờ ký duyệt</h3>
                        <div className="number">8</div>
                        <span className="trend" style={{color: '#f59e0b'}}>Cần xử lý ngay</span>
                    </div>

                    <div className="card">
                        <div className="card-icon icon-red"><i className="fas fa-user-shield"></i></div>
                        <h3>Cảnh báo rủi ro</h3>
                        <div className="number">2</div>
                        <span className="trend down">Phát hiện truy cập lạ</span>
                    </div>

                    <div className="card">
                        <div className="card-icon icon-green"><i className="fas fa-database"></i></div>
                        <h3>Dung lượng lưu trữ</h3>
                        <div className="number">45%</div>
                        <span className="trend">120GB / 500GB (An toàn)</span>
                    </div>
                </div>

                <div className="table-section">
                    <div className="section-header">
                        <h3><i className="fas fa-clock" style={{color: '#94a3b8', marginRight: '8px'}}></i> Hoạt động gần đây</h3>
                        <button className="btn-sm" style={{background: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer'}}>
                            <i className="fas fa-upload"></i> Upload File
                        </button>
                    </div>

                    <div className="table-wrapper">
                        <table>
                        <thead>
                            <tr>
                                <th>Tên tài liệu</th>
                                <th>Phân loại AI (Auto-Tag)</th>
                                <th>Người xử lý</th>
                                <th>Trạng thái Audit</th>
                                <th>Thời gian</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                        <i className="fas fa-file-pdf" style={{color: '#ef4444', fontSize: '20px'}}></i>
                                        <span style={{fontWeight: 500}}>Hợp_đồng_Lao_động_NV05.pdf</span>
                                    </div>
                                </td>
                                <td>
                                    <span className="tag-badge">Hợp đồng</span>
                                    <span className="tag-badge">Nhân sự</span>
                                </td>
                                <td>Nguyễn Văn A</td>
                                <td><span className="status-badge safe">An toàn</span></td>
                                <td>Vừa xong</td>
                            </tr>
                            <tr>
                                <td>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                        <i className="fas fa-file-excel" style={{color: '#10b981', fontSize: '20px'}}></i>
                                        <span style={{fontWeight: 500}}>Báo_cáo_Tài_chính_Q3.xlsx</span>
                                    </div>
                                </td>
                                <td>
                                    <span className="tag-badge">Tài chính</span>
                                    <span className="tag-badge">Nội bộ</span>
                                </td>
                                <td>Trần Thị B</td>
                                <td><span className="status-badge risk">Cảnh báo</span></td>
                                <td>2 giờ trước</td>
                            </tr>
                            <tr>
                                <td>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                        <i className="fas fa-file-word" style={{color: '#3b82f6', fontSize: '20px'}}></i>
                                        <span style={{fontWeight: 500}}>Đề_xuất_Dự_án_MKT.docx</span>
                                    </div>
                                </td>
                                <td>
                                    <span className="tag-badge">Marketing</span>
                                    <span className="tag-badge">Công khai</span>
                                </td>
                                <td>Lê Văn C</td>
                                <td><span className="status-badge pending">Đang chờ ký</span></td>
                                <td>5 giờ trước</td>
                            </tr>
                            <tr>
                                <td>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                        <i className="fas fa-image" style={{color: '#8b5cf6', fontSize: '20px'}}></i>
                                        <span style={{fontWeight: 500}}>Scan_CCCD_Khach_hang.jpg</span>
                                    </div>
                                </td>
                                <td>
                                    <span className="tag-badge">Pháp lý</span>
                                    <span className="tag-badge">Bảo mật cao</span>
                                </td>
                                <td>Robot AI</td>
                                <td><span className="status-badge safe">Đã mã hóa</span></td>
                                <td>1 ngày trước</td>
                            </tr>
                        </tbody>
                    </table>
                    </div>
                </div>
            </div>
    );
};

export default Dashboard;



