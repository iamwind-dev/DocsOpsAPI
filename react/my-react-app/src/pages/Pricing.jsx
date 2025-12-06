import React from 'react';
import '../styles/style.css';

const Pricing = () => {
    return (
        <>
            <section className="hero" style={{padding: '180px 0 60px', textAlign: 'center', background: 'var(--gradient-hero)'}}>
                <div className="container">
                    <h1>Bảng giá linh hoạt cho <br /><span className="text-gradient">mọi quy mô doanh nghiệp</span></h1>
                    <p style={{marginLeft: 'auto', marginRight: 'auto'}}>Không phí ẩn. Hủy bất cứ lúc nào. Bắt đầu miễn phí ngay hôm nay.</p>
                </div>
            </section>

            <section className="agents" style={{paddingTop: '60px'}}>
                <div className="container">
                    <div className="pricing-toggle">
                        <span className="toggle-label">Thanh toán tháng</span>
                        <div style={{fontSize: '24px', color: 'var(--accent)'}}><i className="fas fa-toggle-on"></i></div>
                        <span className="toggle-label active">Thanh toán năm</span>
                        <span className="save-badge">Tiết kiệm 20%</span>
                    </div>

                    <div className="pricing-grid">
                        <div className="pricing-card">
                            <div className="plan-name">Starter</div>
                            <div className="plan-desc">Dành cho Freelancer hoặc nhóm nhỏ mới bắt đầu số hóa.</div>
                            <div className="price-tag">
                                <span className="currency">$</span>
                                <span className="amount">0</span>
                                <span className="period">/ tháng</span>
                            </div>
                            <ul className="feature-list">
                                <li><i className="fas fa-check"></i> <strong>5GB</strong> Lưu trữ</li>
                                <li><i className="fas fa-check"></i> <strong>AI</strong> Tự động phân loại (50 file/tháng)</li>
                                <li><i className="fas fa-check"></i> Chữ ký số cơ bản</li>
                                <li className="disabled"><i className="fas fa-times"></i> Audit Logs nâng cao</li>
                                <li className="disabled"><i className="fas fa-times"></i> Tự động lưu trữ (Archiving)</li>
                            </ul>
                            <a href="/register" className="btn btn-outline" style={{width: '100%', textAlign: 'center'}}>Đăng ký miễn phí</a>
                        </div>

                        <div className="pricing-card popular">
                            <div className="popular-badge">Khuyên dùng</div>
                            <div className="plan-name">Business</div>
                            <div className="plan-desc">Giải pháp hoàn chỉnh cho doanh nghiệp SMEs tăng tốc vận hành.</div>
                            <div className="price-tag">
                                <span className="currency">$</span>
                                <span className="amount">29</span>
                                <span className="period">/ user / tháng</span>
                            </div>
                            <ul className="feature-list">
                                <li><i className="fas fa-check"></i> <strong>1TB</strong> Lưu trữ an toàn</li>
                                <li><i className="fas fa-check"></i> <strong>Unlimited</strong> AI Auto-Classification</li>
                                <li><i className="fas fa-check"></i> Chữ ký số pháp lý (E-sign)</li>
                                <li><i className="fas fa-check"></i> Audit Logs & Cảnh báo rủi ro</li>
                                <li><i className="fas fa-check"></i> Tự động Backup & Archive</li>
                            </ul>
                            <a href="/register" className="btn btn-primary" style={{width: '100%', textAlign: 'center'}}>Dùng thử 14 ngày</a>
                        </div>

                        <div className="pricing-card">
                            <div className="plan-name">Enterprise</div>
                            <div className="plan-desc">Dành cho tập đoàn lớn cần bảo mật cao cấp và tùy chỉnh riêng.</div>
                            <div className="price-tag">
                                <span className="amount" style={{fontSize: '32px'}}>Liên hệ</span>
                            </div>
                            <ul className="feature-list">
                                <li><i className="fas fa-check"></i> <strong>Unlimited</strong> Storage</li>
                                <li><i className="fas fa-check"></i> Triển khai Private Cloud / On-Premise</li>
                                <li><i className="fas fa-check"></i> Tích hợp API (ERP, CRM)</li>
                                <li><i className="fas fa-check"></i> SLA 99.99% Uptime</li>
                                <li><i className="fas fa-check"></i> Quản lý tài khoản (AM) riêng</li>
                            </ul>
                            <a href="/contact" className="btn btn-outline" style={{width: '100%', textAlign: 'center'}}>Liên hệ Sales</a>
                        </div>
                    </div>
                </div>
            </section>

            <section className="faq-section">
                <div className="container">
                    <div className="section-title">
                        <h2>Câu hỏi thường gặp</h2>
                    </div>
                    
                    <div className="faq-item">
                        <div className="faq-question">AI Auto-Classification hoạt động thế nào? <i className="fas fa-chevron-down"></i></div>
                        <div className="faq-answer">Hệ thống sử dụng OCR để đọc nội dung file PDF/Ảnh, sau đó dùng NLP để hiểu ngữ cảnh và tự động đặt tên file, gắn thẻ (tag) và di chuyển vào đúng thư mục bạn đã quy định.</div>
                    </div>
                    
                    <div className="faq-item">
                        <div className="faq-question">Dữ liệu của tôi có an toàn không? <i className="fas fa-chevron-down"></i></div>
                        <div className="faq-answer">Tuyệt đối an toàn. Chúng tôi sử dụng mã hóa AES-256 cho dữ liệu lưu trữ và TLS 1.3 cho dữ liệu truyền tải. Gói Enterprise hỗ trợ Private Cloud.</div>
                    </div>

                    <div className="faq-item">
                        <div className="faq-question">Tôi có thể nâng cấp gói sau này không? <i className="fas fa-chevron-down"></i></div>
                        <div className="faq-answer">Có, bạn có thể nâng cấp hoặc hạ cấp gói bất cứ lúc nào trong trang Cài đặt quản trị.</div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default Pricing;

