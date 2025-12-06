import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/style.css';

const Home = () => {
    useEffect(() => {
        // Smooth scroll for anchor links
        const handleAnchorClick = (e) => {
            const href = e.target.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                const targetId = href.substring(1);
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    const headerOffset = 80;
                    const elementPosition = targetElement.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        };

        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', handleAnchorClick);
        });

        return () => {
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.removeEventListener('click', handleAnchorClick);
            });
        };
    }, []);

    return (
        <>
            <section className="hero">
                <div className="container">
                    <div className="hero-content">
                        <div className="hero-text">
                            <div className="badge">🚀 Version 2.0 đã ra mắt</div>
                            <h1>Quản lý tài liệu <br /> <span className="text-gradient">Tự động & Bảo mật</span></h1>
                            <p>Giải phóng doanh nghiệp khỏi công việc giấy tờ thủ công với 5 Trợ lý AI chuyên biệt: Tự động phân loại, Ký số pháp lý và Lưu trữ chuẩn GDPR.</p>
                            <div className="hero-btns">
                                <Link to="/register" className="btn btn-primary">Bắt đầu ngay <i className="fas fa-arrow-right"></i></Link>
                                <a href="#agents" className="btn btn-outline-light">Xem Demo</a>
                            </div>
                            <div className="trust-badges">
                                <span><i className="fas fa-check-circle"></i> ISO 27001</span>
                                <span><i className="fas fa-check-circle"></i> GDPR Ready</span>
                            </div>
                        </div>
                        <div className="hero-image">
                            <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" alt="Dashboard Preview" />
                            <div className="floating-card card-1">
                                <i className="fas fa-check"></i> Đã ký duyệt
                            </div>
                            <div className="floating-card card-2">
                                <i className="fas fa-shield-alt"></i> An toàn
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="agents" className="agents">
                <div className="container">
                    <div className="section-title">
                        <h2>Hệ sinh thái 5 "Siêu Agent"</h2>
                        <p>Mỗi Agent đảm nhận một nhiệm vụ chuyên biệt, phối hợp nhịp nhàng để vận hành doanh nghiệp 24/7.</p>
                    </div>

                    <div className="agents-grid">
                        <div className="agent-card">
                            <div className="icon-box color-1"><i className="fas fa-sitemap"></i></div>
                            <h3>AI Document Manager</h3>
                            <p>Bộ não trung tâm điều phối luồng tài liệu. Tự động chia sẻ đúng người, đúng phòng ban.</p>
                            <span className="tag">Workflow</span>
                        </div>
                        <div className="agent-card">
                            <div className="icon-box color-2"><i className="fas fa-robot"></i></div>
                            <h3>AI Auto-Classification</h3>
                            <p>OCR & NLP đọc hiểu nội dung. Tự động đặt tên file và gắn thẻ (tag) trong tích tắc.</p>
                            <span className="tag">Automation</span>
                        </div>
                        <div className="agent-card">
                            <div className="icon-box color-3"><i className="fas fa-file-signature"></i></div>
                            <h3>AI E-signature</h3>
                            <p>Tạo luồng ký, nhắc nhở đối tác và xác thực chữ ký số có giá trị pháp lý toàn cầu.</p>
                            <span className="tag">Legal</span>
                        </div>
                        <div className="agent-card">
                            <div className="icon-box color-4"><i className="fas fa-user-shield"></i></div>
                            <h3>AI Audit Tracking</h3>
                            <p>Giám sát 24/7. Phát hiện hành vi truy cập bất thường và báo cáo rủi ro ngay lập tức.</p>
                            <span className="tag">Security</span>
                        </div>
                        <div className="agent-card">
                            <div className="icon-box color-5"><i className="fas fa-database"></i></div>
                            <h3>AI Secure Archiving</h3>
                            <p>Quản lý vòng đời dữ liệu. Tự động sao lưu mã hóa và hủy tài liệu khi hết hạn lưu trữ.</p>
                            <span className="tag">Storage</span>
                        </div>
                        <div className="agent-card integration-card">
                            <div className="icon-box color-6"><i className="fas fa-plug"></i></div>
                            <h3>Tích hợp API</h3>
                            <p>Kết nối liền mạch với CRM, ERP, HRMS hiện có của bạn.</p>
                            <a href="#" className="link-arrow">Xem tài liệu <i className="fas fa-arrow-right"></i></a>
                        </div>
                    </div>
                </div>
            </section>

            <section id="workflow" className="workflow">
                <div className="container">
                    <div className="section-title">
                        <h2>Luồng xử lý tự động</h2>
                    </div>
                    <div className="workflow-steps">
                        <div className="step-item">
                            <div className="step-icon"><i className="fas fa-cloud-upload-alt"></i></div>
                            <h4>1. Tiếp nhận</h4>
                            <p>Upload/Scan tài liệu đầu vào.</p>
                        </div>
                        <div className="step-connector"><i className="fas fa-angle-right"></i></div>
                        <div className="step-item">
                            <div className="step-icon"><i className="fas fa-cogs"></i></div>
                            <h4>2. Phân loại & Ký</h4>
                            <p>AI đọc, tag và gửi ký duyệt.</p>
                        </div>
                        <div className="step-connector"><i className="fas fa-angle-right"></i></div>
                        <div className="step-item">
                            <div className="step-icon"><i className="fas fa-search-dollar"></i></div>
                            <h4>3. Kiểm soát</h4>
                            <p>Audit log ghi lại mọi thao tác.</p>
                        </div>
                        <div className="step-connector"><i className="fas fa-angle-right"></i></div>
                        <div className="step-item">
                            <div className="step-icon"><i className="fas fa-server"></i></div>
                            <h4>4. Lưu trữ</h4>
                            <p>Mã hóa và backup an toàn.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="cta">
                <div className="container">
                    <div className="cta-box">
                        <h2>Sẵn sàng chuyển đổi số?</h2>
                        <p>Tham gia cùng hơn 500+ doanh nghiệp đang tối ưu hóa vận hành với AI DocOps.</p>
                        <div className="cta-buttons">
                            <Link to="/register" className="btn btn-primary btn-large">Đăng ký dùng thử</Link>
                            <Link to="/contact" className="btn btn-outline btn-large">Liên hệ Sales</Link>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default Home;
