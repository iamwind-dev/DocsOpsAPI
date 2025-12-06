import React, { useState } from 'react';
import '../styles/dashboard.css';

const ESignature = () => {
    const [activeTab, setActiveTab] = useState('pending');

    return (
        <div className="dashboard-body">
                <div className="page-title" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div>
                        <h2>Trung tâm Chữ ký số</h2>
                        <p>AI đang giám sát <b>12</b> luồng ký. Tự động nhắc nhở sau 24h.</p>
                    </div>
                    <button className="btn-sm" style={{background: 'var(--accent)', color: 'white', border: 'none', padding: '10px 20px'}}>
                        <i className="fas fa-pen-nib"></i> Tạo luồng ký mới
                    </button>
                </div>

                <div className="stats-grid" style={{gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '20px'}}>
                    <div className="card" style={{flexDirection: 'row', alignItems: 'center', padding: '20px'}}>
                        <div className="card-icon icon-orange" style={{marginBottom: 0, marginRight: '15px'}}><i className="fas fa-clock"></i></div>
                        <div>
                            <div className="number">3</div>
                            <h3 style={{margin: 0}}>Cần tôi ký duyệt</h3>
                        </div>
                    </div>
                    <div className="card" style={{flexDirection: 'row', alignItems: 'center', padding: '20px'}}>
                        <div className="card-icon icon-blue" style={{marginBottom: 0, marginRight: '15px'}}><i className="fas fa-spinner"></i></div>
                        <div>
                            <div className="number">5</div>
                            <h3 style={{margin: 0}}>Chờ người khác ký</h3>
                        </div>
                    </div>
                    <div className="card" style={{flexDirection: 'row', alignItems: 'center', padding: '20px'}}>
                        <div className="card-icon icon-green" style={{marginBottom: 0, marginRight: '15px'}}><i className="fas fa-check-circle"></i></div>
                        <div>
                            <div className="number">128</div>
                            <h3 style={{margin: 0}}>Đã hoàn thành</h3>
                        </div>
                    </div>
                </div>

                <div className="table-section">
                    <div className="tab-menu">
                        <div className={`tab-item ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
                            Cần xử lý <span className="tab-count">3</span>
                        </div>
                        <div className={`tab-item ${activeTab === 'waiting' ? 'active' : ''}`} onClick={() => setActiveTab('waiting')}>
                            Đang chờ <span className="tab-count">5</span>
                        </div>
                        <div className={`tab-item ${activeTab === 'completed' ? 'active' : ''}`} onClick={() => setActiveTab('completed')}>
                            Đã hoàn thành
                        </div>
                        <div className={`tab-item ${activeTab === 'cancelled' ? 'active' : ''}`} onClick={() => setActiveTab('cancelled')}>
                            Đã hủy
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th style={{width: '30%'}}>Tên tài liệu</th>
                                <th>Người ký (Signatories)</th>
                                <th>Tiến độ</th>
                                <th>AI Action</th>
                                <th>Hạn chót (Deadline)</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{backgroundColor: '#fffbeb'}}>
                                <td>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                        <i className="fas fa-file-pdf" style={{color: '#ef4444', fontSize: '18px'}}></i>
                                        <div>
                                            <div style={{fontWeight: 600, color: '#b45309'}}>Hợp đồng Thuê Văn phòng 2025</div>
                                            <div style={{fontSize: '11px', color: 'var(--text-light)'}}>Người gửi: CEO John Doe</div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div className="avatar-group">
                                        <div className="avatar-sm done" title="John Doe (Đã ký)">JD</div>
                                        <div className="avatar-sm pending" title="Tôi (Chưa ký)">ME</div>
                                    </div>
                                </td>
                                <td>
                                    <div className="progress-wrapper">
                                        <div className="progress-text"><span>1/2</span> <span>50%</span></div>
                                        <div className="progress-bar-bg"><div className="progress-bar-fill" style={{width: '50%'}}></div></div>
                                    </div>
                                </td>
                                <td><span style={{fontSize: '12px', color: '#b45309'}}><i className="fas fa-exclamation-circle"></i> Cần bạn ký ngay</span></td>
                                <td>Hôm nay</td>
                                <td>
                                    <button className="btn-sm" style={{background: 'var(--accent)', color: 'white', border: 'none'}}>Ký ngay</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
    );
};

export default ESignature;



