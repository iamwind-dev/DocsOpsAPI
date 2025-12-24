import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/style.css';

const Footer = () => {
    return (
        <footer>
            <div className="container">
                <div className="footer-content">
                    <div className="footer-brand">
                        <div className="logo"><i className="fa-solid fa-cube"></i> AI DocOps</div>
                        <p>Giải pháp SaaS B2B hàng đầu cho quản lý tài liệu doanh nghiệp.</p>
                    </div>
                    <div className="footer-links">
                        <h4>Sản phẩm</h4>
                        <ul>
                            <li><Link to="/features">Tính năng</Link></li>
                            <li><Link to="/pricing">Bảng giá</Link></li>
                            <li><a href="#">API</a></li>
                        </ul>
                    </div>
                    <div className="footer-links">
                        <h4>Công ty</h4>
                        <ul>
                            <li><a href="#">Về chúng tôi</a></li>
                            <li><a href="#">Tuyển dụng</a></li>
                            <li><a href="#">Blog</a></li>
                        </ul>
                    </div>
                    <div className="footer-social">
                        <h4>Kết nối</h4>
                        <div className="social-icons">
                            <a href="#"><i className="fab fa-facebook"></i></a>
                            <a href="#"><i className="fab fa-linkedin"></i></a>
                            <a href="#"><i className="fab fa-twitter"></i></a>
                        </div>
                    </div>
                </div>
                <div className="footer-bottom">
                    &copy; 2025 AI DocOps. All rights reserved.
                </div>
            </div>
        </footer>
    );
};

export default Footer;
