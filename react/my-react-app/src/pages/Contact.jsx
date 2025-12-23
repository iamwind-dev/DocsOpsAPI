import React from 'react';
import '../styles/style.css';

const Contact = () => {
    return (
        <>
            <section className="hero" style={{padding: '160px 0 60px', textAlign: 'center', background: 'var(--gradient-hero)'}}>
                <div className="container">
                    <h1>Liên hệ với đội ngũ <span className="text-gradient">hỗ trợ</span></h1>
                    <p style={{marginLeft: 'auto', marginRight: 'auto'}}>Chúng tôi luôn sẵn sàng giải đáp mọi thắc mắc về sản phẩm và gói dịch vụ.</p>
                </div>
            </section>

            <section className="contact-section">
                <div className="container">
                    <div className="contact-grid">
                        <div className="contact-info-box">
                            <div className="contact-info-header">
                                <h3>Thông tin liên hệ</h3>
                                <p>Điền vào form bên cạnh hoặc liên hệ trực tiếp qua các kênh dưới đây.</p>
                            </div>

                            <div className="info-item">
                                <div className="info-icon"><i className="fas fa-map-marker-alt"></i></div>
                                <div className="info-text">
                                    <h4>Văn phòng chính</h4>
                                    <p>Tầng 12, Tòa nhà Bitexco Financial Tower,<br />Quận 1, TP. Hồ Chí Minh</p>
                                </div>
                            </div>

                            <div className="info-item">
                                <div className="info-icon"><i className="fas fa-envelope"></i></div>
                                <div className="info-text">
                                    <h4>Email hỗ trợ</h4>
                                    <p>support@aidocops.com<br />sales@aidocops.com</p>
                                </div>
                            </div>

                            <div className="info-item">
                                <div className="info-icon"><i className="fas fa-phone-alt"></i></div>
                                <div className="info-text">
                                    <h4>Hotline (24/7)</h4>
                                    <p>1900 123 456<br />(+84) 909 000 999</p>
                                </div>
                            </div>

                            <div style={{marginTop: '50px'}}>
                                <h4 style={{fontSize: '14px', marginBottom: '15px'}}>Theo dõi chúng tôi:</h4>
                                <div className="social-icons">
                                    <a href="#"><i className="fab fa-facebook-f"></i></a>
                                    <a href="#"><i className="fab fa-twitter"></i></a>
                                    <a href="#"><i className="fab fa-linkedin-in"></i></a>
                                    <a href="#"><i className="fab fa-youtube"></i></a>
                                </div>
                            </div>
                        </div>

                        <div className="contact-form-box">
                            <form>
                                <div className="form-grid" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                                    <div className="form-group">
                                        <label className="form-label">Họ và tên</label>
                                        <input type="text" className="form-control" placeholder="Nguyễn Văn A" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Email công việc</label>
                                        <input type="email" className="form-control" placeholder="name@company.com" />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Số điện thoại</label>
                                    <input type="text" className="form-control" placeholder="+84 ..." />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Chủ đề cần hỗ trợ</label>
                                    <select className="form-control">
                                        <option>Yêu cầu tư vấn gói Enterprise</option>
                                        <option>Báo lỗi kỹ thuật</option>
                                        <option>Hợp tác đối tác</option>
                                        <option>Khác</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Nội dung tin nhắn</label>
                                    <textarea className="form-control" placeholder="Mô tả chi tiết nhu cầu của bạn..."></textarea>
                                </div>

                                <button type="submit" className="btn btn-primary" style={{width: '100%'}}>Gửi tin nhắn</button>
                            </form>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default Contact;

