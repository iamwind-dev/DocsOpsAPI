import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/auth.css';

const Register = () => {
    const navigate = useNavigate();
    const { signUp } = useAuth();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (password.length < 6) {
            setError('Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }

        if (password !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp');
            return;
        }

        setLoading(true);

        try {
            await signUp(email, password, fullName, companyName);
            navigate('/settings'); // Redirect đến Settings để cấu hình email phòng ban
        } catch (err) {
            setError(err.message || 'Đăng ký thất bại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-side-image">
                <div className="auth-quote">
                    <h2>Bắt đầu hành trình chuyển đổi số của bạn.</h2>
                    <p>Tham gia cùng hơn 500+ doanh nghiệp đang sử dụng AI để tự động hóa quy trình tài liệu.</p>
                    <div style={{marginTop: '30px'}}>
                        <div style={{fontWeight: 600, marginBottom: '10px'}}><i className="fas fa-check-circle" style={{color: '#3b82f6', marginRight: '8px'}}></i> Dùng thử miễn phí 14 ngày</div>
                        <div style={{fontWeight: 600, marginBottom: '10px'}}><i className="fas fa-check-circle" style={{color: '#3b82f6', marginRight: '8px'}}></i> Không cần thẻ tín dụng</div>
                        <div style={{fontWeight: 600}}><i className="fas fa-check-circle" style={{color: '#3b82f6', marginRight: '8px'}}></i> Hỗ trợ cài đặt 1-1</div>
                    </div>
                </div>
            </div>

            <div className="auth-form-container">
                <div className="auth-box">
                    <Link to="/" className="logo"><i className="fa-solid fa-cube"></i> AI DocOps</Link>
                    <h1 className="auth-title">Tạo tài khoản mới</h1>
                    <p className="auth-subtitle">Trải nghiệm sức mạnh của 5 AI Agents ngay hôm nay.</p>

                    {error && (
                        <div style={{ 
                            padding: '12px', 
                            background: '#fee2e2', 
                            color: '#dc2626', 
                            borderRadius: '8px', 
                            marginBottom: '20px',
                            fontSize: '14px'
                        }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Họ và tên</label>
                            <input 
                                type="text" 
                                className="form-input" 
                                placeholder="Nguyễn Văn A" 
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required 
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Email công việc</label>
                            <input 
                                type="email" 
                                className="form-input" 
                                placeholder="name@company.com" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required 
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Tên doanh nghiệp</label>
                            <input 
                                type="text" 
                                className="form-input" 
                                placeholder="Tech Solutions JSC" 
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                required 
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Mật khẩu</label>
                            <input 
                                type="password" 
                                className="form-input" 
                                placeholder="Tối thiểu 6 ký tự" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required 
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Xác nhận mật khẩu</label>
                            <input 
                                type="password" 
                                className="form-input" 
                                placeholder="Nhập lại mật khẩu" 
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required 
                            />
                        </div>

                        <div className="form-group">
                            <label className="checkbox" style={{alignItems: 'flex-start', fontSize: '13px'}}>
                                <input type="checkbox" style={{marginTop: '4px'}} required />
                                <span>Tôi đồng ý với <a href="#">Điều khoản sử dụng</a> và <a href="#">Chính sách bảo mật</a>.</span>
                            </label>
                        </div>

                        <button type="submit" className="btn-auth" disabled={loading}>
                            {loading ? 'Đang đăng ký...' : 'Đăng ký tài khoản'}
                        </button>
                    </form>

                    <div className="divider"><span>Hoặc đăng ký bằng</span></div>

                    <div className="social-login">
                        <button className="btn-social"><i className="fab fa-google" style={{color: '#DB4437'}}></i> Google</button>
                        <button className="btn-social"><i className="fab fa-microsoft" style={{color: '#00A4EF'}}></i> Microsoft</button>
                    </div>

                    <div className="form-footer">
                        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;



