import React from 'react';
import '../styles/style.css';

const Features = () => {
    return (
        <>
            <section className="hero" style={{padding: '160px 0 60px', textAlign: 'center', background: 'var(--gradient-hero)'}}>
                <div className="container">
                    <h1>Sức mạnh của 5 AI Agent <br /><span className="text-gradient">trong một nền tảng</span></h1>
                    <p style={{marginLeft: 'auto', marginRight: 'auto'}}>Khám phá chi tiết công nghệ đằng sau hệ thống quản lý tài liệu thông minh nhất hiện nay.</p>
                </div>
            </section>

            <section className="features-detail">
                <div className="container">
                    <div className="feature-block">
                        <div className="feature-content">
                            <span className="feature-label">Agent 1: Phân loại tự động</span>
                            <h2 className="feature-title">Không còn đổi tên file thủ công</h2>
                            <p className="feature-desc">Sử dụng công nghệ OCR và NLP tiên tiến, AI tự động đọc hiểu nội dung tài liệu ngay khi bạn tải lên (hoặc scan).</p>
                            <ul className="feature-list">
                                <li><i className="fas fa-check-circle"></i> <strong>OCR đa ngôn ngữ:</strong> Nhận diện Tiếng Việt, Tiếng Anh chính xác 98%.</li>
                                <li><i className="fas fa-check-circle"></i> <strong>Smart Tagging:</strong> Tự động gắn thẻ "Hợp đồng", "Hóa đơn", "Nhân sự".</li>
                                <li><i className="fas fa-check-circle"></i> <strong>Auto-Rename:</strong> Đổi tên file theo quy tắc: [Loại]_[Tên]_[Ngày].</li>
                            </ul>
                        </div>
                        <div className="feature-media">
                            <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="AI Classification UI" className="feature-img" />
                        </div>
                    </div>

                    <div className="feature-block reverse">
                        <div className="feature-content">
                            <span className="feature-label">Agent 2: Chữ ký số</span>
                            <h2 className="feature-title">Ký duyệt mọi lúc, mọi nơi</h2>
                            <p className="feature-desc">Rút ngắn thời gian phê duyệt từ vài ngày xuống còn vài phút. Hợp pháp và bảo mật.</p>
                            <ul className="feature-list">
                                <li><i className="fas fa-check-circle"></i> <strong>Quy trình ký tự động:</strong> Thiết lập thứ tự người ký A -> B -> C.</li>
                                <li><i className="fas fa-check-circle"></i> <strong>Nhắc nhở thông minh:</strong> AI tự động gửi email nhắc nếu người ký quên.</li>
                                <li><i className="fas fa-check-circle"></i> <strong>Chứng thực pháp lý:</strong> Lưu vết thời gian (Timestamp) và địa chỉ IP.</li>
                            </ul>
                        </div>
                        <div className="feature-media">
                            <img src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="E-signature UI" className="feature-img" />
                        </div>
                    </div>

                    <div className="feature-block">
                        <div className="feature-content">
                            <span className="feature-label">Agent 3: Giám sát bảo mật</span>
                            <h2 className="feature-title">Phát hiện rủi ro trước khi xảy ra</h2>
                            <p className="feature-desc">Hệ thống giám sát 24/7 ghi lại mọi hành động và sử dụng Machine Learning để tìm ra hành vi bất thường.</p>
                            <ul className="feature-list">
                                <li><i className="fas fa-check-circle"></i> <strong>Anomaly Detection:</strong> Cảnh báo khi có nhân viên tải xuống quá nhiều file.</li>
                                <li><i className="fas fa-check-circle"></i> <strong>Audit Logs chi tiết:</strong> Ai đã xem? Xem lúc nào? Từ đâu?</li>
                                <li><i className="fas fa-check-circle"></i> <strong>GDPR Ready:</strong> Đảm bảo tuân thủ quy định bảo vệ dữ liệu.</li>
                            </ul>
                        </div>
                        <div className="feature-media">
                            <img src="https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Security Dashboard" className="feature-img" />
                        </div>
                    </div>

                    <div className="feature-block reverse">
                        <div className="feature-content">
                            <span className="feature-label">Agent 4: Lưu trữ thông minh</span>
                            <h2 className="feature-title">Tối ưu chi phí & Vòng đời dữ liệu</h2>
                            <p className="feature-desc">Không còn lo lắng về dung lượng lưu trữ hay việc quên xóa tài liệu rác.</p>
                            <ul className="feature-list">
                                <li><i className="fas fa-check-circle"></i> <strong>Retention Policy:</strong> Tự động xóa file rác sau 30 ngày.</li>
                                <li><i className="fas fa-check-circle"></i> <strong>Cold Storage:</strong> Chuyển tài liệu cũ vào kho lạnh giá rẻ.</li>
                                <li><i className="fas fa-check-circle"></i> <strong>Mã hóa AES-256:</strong> Bảo vệ dữ liệu ở mức cao nhất.</li>
                            </ul>
                        </div>
                        <div className="feature-media">
                            <img src="https://images.unsplash.com/photo-1558494949-efdeb6bf80d1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Server Archiving" className="feature-img" />
                        </div>
                    </div>
                </div>
            </section>

            <section className="integration-section">
                <div className="container">
                    <div className="section-title">
                        <h2>Tích hợp liền mạch</h2>
                        <p>AI DocOps kết nối dễ dàng với các công cụ bạn đang sử dụng.</p>
                    </div>
                    <div className="integration-grid">
                        <div className="integration-item"><i className="fab fa-google" style={{marginRight: '8px'}}></i> Drive</div>
                        <div className="integration-item"><i className="fab fa-microsoft" style={{marginRight: '8px'}}></i> Office 365</div>
                        <div className="integration-item"><i className="fab fa-slack" style={{marginRight: '8px'}}></i> Slack</div>
                        <div className="integration-item"><i className="fab fa-salesforce" style={{marginRight: '8px'}}></i> Salesforce</div>
                        <div className="integration-item"><i className="fas fa-file-invoice" style={{marginRight: '8px'}}></i> SAP ERP</div>
                    </div>
                </div>
            </section>

            <section className="cta">
                <div className="container">
                    <div className="cta-box">
                        <h2>Trải nghiệm sức mạnh AI ngay hôm nay</h2>
                        <p>Đăng ký dùng thử 14 ngày miễn phí. Không cần thẻ tín dụng.</p>
                        <div className="cta-buttons">
                            <a href="/register" className="btn btn-primary btn-large">Tạo tài khoản ngay</a>
                            <a href="/contact" className="btn btn-outline btn-large">Liên hệ tư vấn</a>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default Features;

