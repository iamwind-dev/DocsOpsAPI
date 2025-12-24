import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/dashboard.css';
import { documentAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const DocumentsCategory = () => {
    const { categoryKey } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [allDocuments, setAllDocuments] = useState([]); // Tất cả documents từ API
    const [filteredDocuments, setFilteredDocuments] = useState([]); // Documents sau khi filter
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Filter và Sort states
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all'); // all, uploaded, processing, classified, signed, archived, deleted
    const [filterMimeType, setFilterMimeType] = useState('all'); // all, application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, etc.
    const [sortBy, setSortBy] = useState('date-desc'); // date-desc, date-asc, title-asc, title-desc, status-asc, status-desc
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [documentToDelete, setDocumentToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [showMenuId, setShowMenuId] = useState(null);

    // Mapping từ category key sang tên tiếng Việt
    const categoryNames = {
        'hop-dong-phap-ly': 'Hợp đồng & Pháp lý',
        'tai-chinh-ke-toan': 'Tài chính & Kế toán',
        'nhan-su-hanh-chinh': 'Nhân sự & Hành chính',
        'kinh-doanh-khach-hang': 'Kinh doanh & Khách hàng',
        'du-an-ky-thuat': 'Dự án & Kỹ thuật',
        'marketing-truyen-thong': 'Marketing & Truyền thông',
        'khac': 'Khác',
    };

    const categoryName = categoryNames[categoryKey] || 'Không xác định';

    // Load documents khi component mount hoặc categoryKey thay đổi
    useEffect(() => {
        const loadDocuments = async () => {
            if (!user || !categoryKey) return;

            setLoading(true);
            setError(null);
            try {
                const result = await documentAPI.getDocumentsByCategory(categoryKey);
                const docs = result.data?.documents || [];
                setAllDocuments(docs);
                setFilteredDocuments(docs);
            } catch (err) {
                console.error('Error loading category documents:', err);
                setError(err.message || 'Có lỗi xảy ra khi tải danh sách tài liệu');
            } finally {
                setLoading(false);
            }
        };

        loadDocuments();
    }, [user, categoryKey]);

    // Apply filter và sort khi có thay đổi
    useEffect(() => {
        let filtered = [...allDocuments];

    // Exclude deleted documents
    filtered = filtered.filter(doc => doc.status !== 'deleted');

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(doc => doc.status === filterStatus);
    }

        // Apply mime type filter
        if (filterMimeType !== 'all') {
            filtered = filtered.filter(doc => doc.mime_type === filterMimeType);
        }

        // Apply sort
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'date-desc':
                    return new Date(b.update_at || b.created_at) - new Date(a.update_at || a.created_at);
                case 'date-asc':
                    return new Date(a.update_at || a.created_at) - new Date(b.update_at || b.created_at);
                case 'title-asc':
                    return (a.title || '').localeCompare(b.title || '', 'vi');
                case 'title-desc':
                    return (b.title || '').localeCompare(a.title || '', 'vi');
                case 'status-asc':
                    return (a.status || '').localeCompare(b.status || '', 'vi');
                case 'status-desc':
                    return (b.status || '').localeCompare(a.status || '', 'vi');
                default:
                    return 0;
            }
        });

        setFilteredDocuments(filtered);
    }, [allDocuments, filterStatus, filterMimeType, sortBy]);

    // Handle document click - open file
    const handleDocumentClick = useCallback((storagePath) => {
        if (storagePath) {
            const fileUrl = `https://rtdqjujwbaotbvuioawp.supabase.co/storage/v1/object/public/${storagePath}`;
            window.open(fileUrl, '_blank');
        }
    }, []);

    // Format file size
    const formatFileSize = (bytes) => {
        if (!bytes) return 'N/A';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.filter-sort-container')) {
                setShowFilterDropdown(false);
                setShowSortDropdown(false);
            }
            if (!event.target.closest('.document-menu')) {
                setShowMenuId(null);
            }
        };

        if (showFilterDropdown || showSortDropdown || showMenuId) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showFilterDropdown, showSortDropdown, showMenuId]);

    // Handle delete document
    const handleDeleteClick = useCallback((doc, e) => {
        e.stopPropagation();
        setDocumentToDelete(doc);
        setShowDeleteConfirm(true);
        setShowMenuId(null);
    }, []);

    // Confirm delete
    const confirmDelete = useCallback(async () => {
        if (!documentToDelete) return;

        setDeleting(true);
        try {
            await documentAPI.deleteDocument(documentToDelete.id);
            // Remove from allDocuments
            setAllDocuments(prev => prev.filter(doc => doc.id !== documentToDelete.id));
            setShowDeleteConfirm(false);
            setDocumentToDelete(null);
        } catch (error) {
            console.error('Error deleting document:', error);
            alert('Có lỗi xảy ra khi xóa tài liệu: ' + (error.message || 'Unknown error'));
        } finally {
            setDeleting(false);
        }
    }, [documentToDelete]);

    return (
        <div className="dashboard-body">
            {/* Header với nút quay lại */}
            <div className="page-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button
                        onClick={() => navigate('/documents')}
                        style={{
                            background: 'none',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: '#64748b',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f8fafc';
                            e.currentTarget.style.borderColor = '#3b82f6';
                            e.currentTarget.style.color = '#3b82f6';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.borderColor = '#e2e8f0';
                            e.currentTarget.style.color = '#64748b';
                        }}
                    >
                        <i className="fas fa-arrow-left"></i>
                        <span>Quay lại</span>
                    </button>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>{categoryName}</h2>
                        <p style={{ margin: '4px 0 0 0', color: 'var(--text-light)', fontSize: '14px' }}>
                            {filteredDocuments.length} / {allDocuments.length} tài liệu
                            {(filterStatus !== 'all' || filterMimeType !== 'all') && (
                                <span style={{ marginLeft: '8px', color: '#3b82f6' }}>
                                    (đã lọc)
                                </span>
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: 'var(--accent)', marginBottom: '16px' }}></i>
                    <p style={{ color: 'var(--text-light)', fontSize: '16px' }}>Đang tải danh sách tài liệu...</p>
                </div>
            ) : error ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <i className="fas fa-exclamation-circle" style={{ fontSize: '48px', color: 'var(--danger)', marginBottom: '16px' }}></i>
                    <p style={{ color: 'var(--danger)', fontSize: '16px', marginBottom: '8px' }}>Có lỗi xảy ra</p>
                    <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>{error}</p>
                </div>
            ) : filteredDocuments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <i className="fas fa-folder-open" style={{ fontSize: '64px', color: 'var(--text-light)', marginBottom: '16px', opacity: 0.5 }}></i>
                    <p style={{ color: 'var(--text-light)', fontSize: '16px', marginBottom: '8px' }}>
                        {allDocuments.length === 0 ? 'Chưa có tài liệu nào' : 'Không tìm thấy tài liệu phù hợp'}
                    </p>
                    <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>
                        {allDocuments.length === 0 
                            ? 'Thư mục này hiện chưa có tài liệu nào' 
                            : 'Thử thay đổi bộ lọc để xem thêm tài liệu'}
                    </p>
                    {allDocuments.length > 0 && (
                        <button
                            onClick={() => {
                                setFilterStatus('all');
                                setFilterMimeType('all');
                            }}
                            style={{
                                marginTop: '16px',
                                padding: '10px 20px',
                                border: '1px solid #3b82f6',
                                borderRadius: '8px',
                                background: 'white',
                                color: '#3b82f6',
                                cursor: 'pointer',
                                fontSize: '14px',
                            }}
                        >
                            Xóa bộ lọc
                        </button>
                    )}
                </div>
            ) : (
                <div className="table-section">
                    <div className="section-header">
                        <div className="section-title-sm" style={{ marginBottom: 0 }}>Danh sách tài liệu</div>
                        <div className="filter-sort-container" style={{ display: 'flex', gap: '10px', position: 'relative' }}>
                            {/* Filter Dropdown */}
                            <div style={{ position: 'relative' }}>
                                <button 
                                    className="btn-sm" 
                                    style={{ 
                                        border: '1px solid #e2e8f0', 
                                        background: (filterStatus !== 'all' || filterMimeType !== 'all') ? '#eff6ff' : 'white',
                                        color: (filterStatus !== 'all' || filterMimeType !== 'all') ? '#3b82f6' : 'inherit',
                                    }}
                                    onClick={() => {
                                        setShowFilterDropdown(!showFilterDropdown);
                                        setShowSortDropdown(false);
                                    }}
                                >
                                    <i className="fas fa-filter"></i> Lọc
                                    {(filterStatus !== 'all' || filterMimeType !== 'all') && (
                                        <span style={{ marginLeft: '4px', fontSize: '10px' }}>●</span>
                                    )}
                                </button>
                                {showFilterDropdown && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        right: 0,
                                        marginTop: '8px',
                                        backgroundColor: 'white',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                        border: '1px solid #e2e8f0',
                                        padding: '16px',
                                        zIndex: 1000,
                                        minWidth: '250px',
                                    }}>
                                        <div style={{ marginBottom: '16px' }}>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: '#64748b' }}>
                                                Trạng thái
                                            </label>
                                            <select
                                                value={filterStatus}
                                                onChange={(e) => setFilterStatus(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 12px',
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: '6px',
                                                    fontSize: '14px',
                                                }}
                                            >
                                                <option value="all">Tất cả</option>
                                                <option value="uploaded">Đã upload</option>
                                                <option value="processing">Đang xử lý</option>
                                                <option value="classified">Đã phân loại</option>
                                                <option value="signed">Đã ký</option>
                                                <option value="archived">Đã lưu trữ</option>
                                                <option value="deleted">Đã xóa</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: '#64748b' }}>
                                                Loại file
                                            </label>
                                            <select
                                                value={filterMimeType}
                                                onChange={(e) => setFilterMimeType(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 12px',
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: '6px',
                                                    fontSize: '14px',
                                                }}
                                            >
                                                <option value="all">Tất cả</option>
                                                <option value="application/pdf">PDF</option>
                                                <option value="application/vnd.openxmlformats-officedocument.wordprocessingml.document">DOCX</option>
                                                <option value="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">XLSX</option>
                                                <option value="image/jpeg">JPEG</option>
                                                <option value="image/png">PNG</option>
                                            </select>
                                        </div>
                                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => {
                                                    setFilterStatus('all');
                                                    setFilterMimeType('all');
                                                }}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px',
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: '6px',
                                                    background: 'white',
                                                    cursor: 'pointer',
                                                    fontSize: '13px',
                                                }}
                                            >
                                                Xóa bộ lọc
                                            </button>
                                            <button
                                                onClick={() => setShowFilterDropdown(false)}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    background: '#3b82f6',
                                                    color: 'white',
                                                    cursor: 'pointer',
                                                    fontSize: '13px',
                                                }}
                                            >
                                                Áp dụng
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Sort Dropdown */}
                            <div style={{ position: 'relative' }}>
                                <button 
                                    className="btn-sm" 
                                    style={{ border: '1px solid #e2e8f0', background: 'white' }}
                                    onClick={() => {
                                        setShowSortDropdown(!showSortDropdown);
                                        setShowFilterDropdown(false);
                                    }}
                                >
                                    <i className="fas fa-sort"></i> Sắp xếp
                                </button>
                                {showSortDropdown && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        right: 0,
                                        marginTop: '8px',
                                        backgroundColor: 'white',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                        border: '1px solid #e2e8f0',
                                        padding: '8px',
                                        zIndex: 1000,
                                        minWidth: '200px',
                                    }}>
                                        {[
                                            { value: 'date-desc', label: 'Ngày mới nhất' },
                                            { value: 'date-asc', label: 'Ngày cũ nhất' },
                                            { value: 'title-asc', label: 'Tên A-Z' },
                                            { value: 'title-desc', label: 'Tên Z-A' },
                                            { value: 'status-asc', label: 'Trạng thái A-Z' },
                                            { value: 'status-desc', label: 'Trạng thái Z-A' },
                                        ].map((option) => (
                                            <div
                                                key={option.value}
                                                onClick={() => {
                                                    setSortBy(option.value);
                                                    setShowSortDropdown(false);
                                                }}
                                                style={{
                                                    padding: '10px 12px',
                                                    cursor: 'pointer',
                                                    borderRadius: '6px',
                                                    fontSize: '14px',
                                                    backgroundColor: sortBy === option.value ? '#eff6ff' : 'transparent',
                                                    color: sortBy === option.value ? '#3b82f6' : '#1e293b',
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (sortBy !== option.value) {
                                                        e.currentTarget.style.backgroundColor = '#f8fafc';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (sortBy !== option.value) {
                                                        e.currentTarget.style.backgroundColor = 'transparent';
                                                    }
                                                }}
                                            >
                                                {sortBy === option.value && (
                                                    <i className="fas fa-check" style={{ marginRight: '8px', fontSize: '12px' }}></i>
                                                )}
                                                {option.label}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                        {filteredDocuments.map((doc) => (
                            <div
                                key={doc.id}
                                onClick={() => handleDocumentClick(doc.storage_path)}
                                style={{
                                    padding: '16px 20px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    backgroundColor: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '16px',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#f8fafc';
                                    e.currentTarget.style.borderColor = '#3b82f6';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'white';
                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '8px',
                                    backgroundColor: '#eff6ff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <i className="fas fa-file" style={{ color: '#3b82f6', fontSize: '24px' }}></i>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontWeight: 600,
                                        fontSize: '16px',
                                        color: '#1e293b',
                                        marginBottom: '6px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {doc.title || 'Không có tiêu đề'}
                                    </div>
                                    {doc.description && (
                                        <div style={{
                                            fontSize: '14px',
                                            color: '#64748b',
                                            marginBottom: '4px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {doc.description}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                                        <span>
                                            <i className="fas fa-calendar" style={{ marginRight: '4px' }}></i>
                                            {formatDate(doc.update_at || doc.created_at)}
                                        </span>
                                        {doc.mime_type && (
                                            <span>
                                                <i className="fas fa-file-alt" style={{ marginRight: '4px' }}></i>
                                                {doc.mime_type}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                                    {doc.status && (
                                        <span style={{
                                            padding: '4px 12px',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                            fontWeight: 500,
                                            backgroundColor: doc.status === 'signed' ? '#dcfce7' : '#fef3c7',
                                            color: doc.status === 'signed' ? '#166534' : '#92400e',
                                        }}>
                                            {doc.status}
                                        </span>
                                    )}
                                    <div className="document-menu" style={{ position: 'relative' }}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowMenuId(showMenuId === doc.id ? null : doc.id);
                                            }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '8px',
                                                borderRadius: '4px',
                                                color: '#94a3b8',
                                                fontSize: '18px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = '#f1f5f9';
                                                e.currentTarget.style.color = '#64748b';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                e.currentTarget.style.color = '#94a3b8';
                                            }}
                                        >
                                            <i className="fas fa-ellipsis-v"></i>
                                        </button>
                                        {showMenuId === doc.id && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '100%',
                                                right: 0,
                                                marginTop: '4px',
                                                backgroundColor: 'white',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                                border: '1px solid #e2e8f0',
                                                padding: '4px',
                                                zIndex: 1000,
                                                minWidth: '120px',
                                            }}>
                                                <button
                                                    onClick={(e) => handleDeleteClick(doc, e)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px 12px',
                                                        border: 'none',
                                                        background: 'transparent',
                                                        textAlign: 'left',
                                                        cursor: 'pointer',
                                                        borderRadius: '6px',
                                                        fontSize: '14px',
                                                        color: '#ef4444',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = '#fef2f2';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'transparent';
                                                    }}
                                                >
                                                    <i className="fas fa-trash"></i>
                                                    <span>Xóa</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && documentToDelete && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10000,
                        padding: '20px',
                    }}
                    onClick={() => {
                        if (!deleting) {
                            setShowDeleteConfirm(false);
                            setDocumentToDelete(null);
                        }
                    }}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '12px',
                            padding: '30px',
                            maxWidth: '400px',
                            width: '100%',
                            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
                            position: 'relative',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                backgroundColor: '#fef2f2',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 16px',
                            }}>
                                <i className="fas fa-exclamation-triangle" style={{ fontSize: '32px', color: '#ef4444' }}></i>
                            </div>
                            <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: '#1e293b' }}>
                                Xác nhận xóa
                            </h3>
                            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
                                Bạn có chắc chắn muốn xóa tài liệu này?
                            </p>
                            <p style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b', marginTop: '12px' }}>
                                {documentToDelete.title || 'Không có tiêu đề'}
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => {
                                    if (!deleting) {
                                        setShowDeleteConfirm(false);
                                        setDocumentToDelete(null);
                                    }
                                }}
                                disabled={deleting}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    background: 'white',
                                    cursor: deleting ? 'not-allowed' : 'pointer',
                                    fontSize: '15px',
                                    fontWeight: 500,
                                    color: '#64748b',
                                    opacity: deleting ? 0.5 : 1,
                                }}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={deleting}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    background: deleting ? '#94a3b8' : '#ef4444',
                                    cursor: deleting ? 'not-allowed' : 'pointer',
                                    fontSize: '15px',
                                    fontWeight: 500,
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                }}
                            >
                                {deleting ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin"></i>
                                        <span>Đang xóa...</span>
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-trash"></i>
                                        <span>Xóa</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentsCategory;

