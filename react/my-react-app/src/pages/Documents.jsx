import React from 'react';
import '../styles/dashboard.css';

const Documents = () => {
    return (
        <div className="dashboard-body">
                <div className="page-title" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div>
                        <h2>Kho tài liệu trung tâm</h2>
                        <p>Quản lý bởi <b>AI Auto-Classification Agent</b></p>
                    </div>
                    <button className="btn-sm" style={{background: 'var(--accent)', color: 'white', border: 'none', padding: '10px 20px'}}>
                        <i className="fas fa-plus"></i> Tạo mới
                    </button>
                </div>

                <div className="upload-zone">
                    <div className="upload-icon"><i className="fas fa-cloud-upload-alt"></i></div>
                    <h3 style={{fontSize: '16px', marginBottom: '5px'}}>Kéo thả tài liệu vào đây để AI xử lý</h3>
                    <p style={{color: 'var(--text-light)', fontSize: '13px'}}>Hỗ trợ PDF, DOCX, XLSX, JPG. AI sẽ tự động đọc, đổi tên và phân loại.</p>
                </div>

                <div className="folder-section">
                    <div className="section-title-sm">Thư mục tự động (Smart Folders)</div>
                    <div className="folder-grid">
                        <div className="folder-card">
                            <i className="fas fa-folder folder-icon"></i>
                            <div>
                                <div style={{fontWeight: 600, fontSize: '14px'}}>Hợp đồng & Pháp lý</div>
                                <div style={{fontSize: '12px', color: 'var(--text-light)'}}>128 files</div>
                            </div>
                        </div>
                        <div className="folder-card">
                            <i className="fas fa-folder folder-icon"></i>
                            <div>
                                <div style={{fontWeight: 600, fontSize: '14px'}}>Tài chính & Kế toán</div>
                                <div style={{fontSize: '12px', color: 'var(--text-light)'}}>45 files</div>
                            </div>
                        </div>
                        <div className="folder-card">
                            <i className="fas fa-folder folder-icon"></i>
                            <div>
                                <div style={{fontWeight: 600, fontSize: '14px'}}>Nhân sự & Hành chính</div>
                                <div style={{fontSize: '12px', color: 'var(--text-light)'}}>32 files</div>
                            </div>
                        </div>
                        <div className="folder-card">
                            <i className="fas fa-folder folder-icon"></i>
                            <div>
                                <div style={{fontWeight: 600, fontSize: '14px'}}>Kinh doanh & Khách hàng</div>
                                <div style={{fontSize: '12px', color: 'var(--text-light)'}}>67 files</div>
                            </div>
                        </div>
                        <div className="folder-card">
                            <i className="fas fa-folder folder-icon"></i>
                            <div>
                                <div style={{fontWeight: 600, fontSize: '14px'}}>Dự án & Kỹ thuật</div>
                                <div style={{fontSize: '12px', color: 'var(--text-light)'}}>89 files</div>
                            </div>
                        </div>
                        <div className="folder-card">
                            <i className="fas fa-folder folder-icon"></i>
                            <div>
                                <div style={{fontWeight: 600, fontSize: '14px'}}>Marketing & Truyền thông</div>
                                <div style={{fontSize: '12px', color: 'var(--text-light)'}}>210 files</div>
                            </div>
                        </div>
                        <div className="folder-card">
                            <i className="fas fa-folder folder-icon"></i>
                            <div>
                                <div style={{fontWeight: 600, fontSize: '14px'}}>Khác</div>
                                <div style={{fontSize: '12px', color: 'var(--text-light)'}}>15 files</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="table-section">
                    <div className="section-header">
                        <div className="section-title-sm" style={{marginBottom: 0}}>Tài liệu gần đây</div>
                        <div style={{display: 'flex', gap: '10px'}}>
                            <button className="btn-sm" style={{border: '1px solid #e2e8f0', background: 'white'}}><i className="fas fa-filter"></i> Lọc</button>
                            <button className="btn-sm" style={{border: '1px solid #e2e8f0', background: 'white'}}><i className="fas fa-list"></i></button>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th style={{width: '30%'}}>Tên tài liệu</th>
                                <th style={{width: '25%'}}>Phân loại (AI Tags)</th>
                                <th>Kích thước</th>
                                <th>Độ tin cậy (AI)</th>
                                <th>Ngày sửa</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                        <i className="fas fa-file-pdf" style={{color: '#ef4444', fontSize: '18px'}}></i>
                                        <div>
                                            <div style={{fontWeight: 500, fontSize: '14px'}}>HD_LaoDong_NguyenVanA.pdf</div>
                                            <div style={{fontSize: '11px', color: 'var(--text-light)'}}>Gốc: scan_00123.pdf</div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span className="ai-tag"><i className="fas fa-tag"></i> Hợp đồng</span>
                                    <span className="ai-tag"><i className="fas fa-user"></i> Nhân sự</span>
                                </td>
                                <td>2.4 MB</td>
                                <td><span className="confidence-score">99%</span></td>
                                <td>10:30 AM</td>
                                <td><i className="fas fa-ellipsis-v" style={{color: '#94a3b8', cursor: 'pointer'}}></i></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
    );
};

export default Documents;



