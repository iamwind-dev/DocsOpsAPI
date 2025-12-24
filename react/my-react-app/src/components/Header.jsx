import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/style.css';

const Header = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => {
            const header = document.getElementById('header');
            if (header) {
                if (window.scrollY > 50) {
                    header.style.boxShadow = "0 4px 6px -1px rgba(0,0,0,0.1)";
                    header.style.background = "rgba(255, 255, 255, 0.98)";
                } else {
                    header.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
                    header.style.background = "rgba(255, 255, 255, 0.9)";
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const isActive = (path) => {
        return location.pathname === path;
    };

    return (
        <header id="header">
            <div className="container">
                <nav>
                    <div className="logo">
                        <i className="fa-solid fa-cube"></i> AI DocOps
                    </div>
                    
                    <ul className={`nav-links ${isMenuOpen ? 'active' : ''}`} id="navLinks">
                        <li><Link to="/#agents" onClick={() => setIsMenuOpen(false)}>Sản phẩm</Link></li>
                        <li><Link to="/#workflow" onClick={() => setIsMenuOpen(false)}>Quy trình</Link></li>
                        <li><Link to="/pricing" onClick={() => setIsMenuOpen(false)}>Bảng giá</Link></li>
                        <li><Link to="/contact" onClick={() => setIsMenuOpen(false)}>Liên hệ</Link></li>
                        <li className="mobile-auth">
                            <Link to="/login" className="btn-outline" onClick={() => setIsMenuOpen(false)}>Đăng nhập</Link>
                        </li>
                    </ul>

                    <div className="nav-actions">
                        <Link to="/login" className="btn-login">Đăng nhập</Link>
                        <Link to="/register" className="btn btn-primary">Dùng thử miễn phí</Link>
                    </div>

                    <div className="mobile-toggle" id="mobileToggle" onClick={toggleMenu}>
                        <i className={`fas ${isMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
                    </div>
                </nav>
            </div>
        </header>
    );
};

export default Header;
