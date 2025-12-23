import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/dashboard.css';
import { documentAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const Documents = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [folderStats, setFolderStats] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [filteredDocuments, setFilteredDocuments] = useState([]);
    const [loadingDocuments, setLoadingDocuments] = useState(false);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterMimeType, setFilterMimeType] = useState('all');
    const [sortBy, setSortBy] = useState('date-desc');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [documentToDelete, setDocumentToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [showMenuId, setShowMenuId] = useState(null);
    const fileInputRef = useRef(null);
    const dragCounterRef = useRef(0);

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

    // Load folder stats và documents khi component mount
    useEffect(() => {
        const loadData = async () => {
            if (!user) return;
            try {
                // Load folder stats
                const statsResult = await documentAPI.getFolderStats();
                setFolderStats(statsResult.data || {});
                
                // Load documents
                setLoadingDocuments(true);
                const docsResult = await documentAPI.getUserDocuments();
                const docs = docsResult.data?.documents || [];
                setDocuments(docs);
                setFilteredDocuments(docs);
            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setLoadingDocuments(false);
            }
        };
        loadData();
    }, [user]);

    // Apply filter và sort khi có thay đổi
    useEffect(() => {
        let filtered = [...documents];

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
    }, [documents, filterStatus, filterMimeType, sortBy]);

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

    // Xử lý upload files
    const handleFiles = useCallback(async (files) => {
        if (!user) {
            alert('Vui lòng đăng nhập để upload file');
            return;
        }

        if (!files || files.length === 0) {
            return;
        }

        setIsUploading(true);
        setUploadResult(null);

        try {
            const result = await documentAPI.uploadToQueue(files);
            
            setUploadResult({
                success: true,
                message: result.message || `Đã upload thành công ${result.data?.success || files.length}/${files.length} file`,
                data: result.data,
            });
            
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error) {
            console.error('Upload error:', error);
            setUploadResult({
                success: false,
                message: error.message || 'Có lỗi xảy ra khi upload file',
            });
        } finally {
            setIsUploading(false);
        }
    }, [user]);

    // Xử lý khi chọn file từ input
    const handleFileSelect = useCallback((e) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            handleFiles(files);
        }
    }, [handleFiles]);

    // Xử lý drag events
    const handleDragEnter = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current++;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
        }
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current--;
        if (dragCounterRef.current <= 0) {
            dragCounterRef.current = 0;
            setIsDragging(false);
        }
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'copy';
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        dragCounterRef.current = 0;

        const files = Array.from(e.dataTransfer.files || []);
        if (files.length > 0) {
            handleFiles(files);
        }
    }, [handleFiles]);

    // Handle folder click - navigate to category page
    const handleFolderClick = useCallback((categoryKey) => {
        console.log('handleFolderClick called with:', categoryKey);
        console.log('navigate function:', navigate);
        const path = `/documents/category/${categoryKey}`;
        console.log('Navigation path:', path);
        try {
            navigate(path);
            console.log('Navigation called successfully');
        } catch (error) {
            console.error('Navigation error:', error);
        }
    }, [navigate]);

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
            // Remove from documents
            setDocuments(prev => prev.filter(doc => doc.id !== documentToDelete.id));
            setShowDeleteConfirm(false);
            setDocumentToDelete(null);
        } catch (error) {
            console.error('Error deleting document:', error);
            alert('Có lỗi xảy ra khi xóa tài liệu: ' + (error.message || 'Unknown error'));
        } finally {
            setDeleting(false);
        }
    }, [documentToDelete]);

    // Handle document click - open file
    const handleDocumentClick = useCallback((storagePath) => {
        if (storagePath) {
            const fileUrl = `https://rtdqjujwbaotbvuioawp.supabase.co/storage/v1/object/public/${storagePath}`;
            window.open(fileUrl, '_blank');
        }
    }, []);

    // Format time relative
    const formatTime = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;
        if (diffHours < 24) return `${diffHours} giờ trước`;
        if (diffDays < 7) return `${diffDays} ngày trước`;
        return date.toLocaleDateString('vi-VN');
    };

    // Get category name from storage_path
    const getCategoryFromPath = (storagePath) => {
        if (!storagePath) return 'Khác';
        const pathParts = storagePath.split('/');
        const firstPart = pathParts[0] || '';
        
        const categoryMap = {
            'Legal & Contracts': 'Hợp đồng & Pháp lý',
            'Finance & Tax': 'Tài chính & Kế toán',
            'HR & Admin': 'HR & Admin',
            'Sales & CRM': 'Kinh doanh & Khách hàng',
            'Projects & Tech': 'Dự án & Kỹ thuật',
            'Marketing': 'Marketing & Truyền thông',
        };

        return categoryMap[firstPart] || 'Khác';
    };

    // Get status label
    const getStatusLabel = (status) => {
        const statusMap = {
            'uploaded': 'Đã upload',
            'processing': 'Đang xử lý',
            'classified': 'Đã phân loại',
            'signed': 'Đã ký',
            'archived': 'Đã lưu trữ',
            'deleted': 'Đã xóa',
        };
        return statusMap[status] || status;
    };

    // Get status color
    const getStatusColor = (status) => {
        const colorMap = {
            'uploaded': { bg: '#fef3c7', color: '#92400e' },
            'processing': { bg: '#fef3c7', color: '#92400e' },
            'classified': { bg: '#dcfce7', color: '#166534' },
            'signed': { bg: '#dcfce7', color: '#166534' },
            'archived': { bg: '#e0e7ff', color: '#3730a3' },
        };
        return colorMap[status] || { bg: '#f1f5f9', color: '#475569' };
    };

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

                {/* File Input - Hidden */}
                <input
                    ref={fileInputRef}
                    id="file-upload-input-documents"
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    accept="*/*"
                />

                {/* Upload Zone với drag & drop */}
                <div 
                    className="upload-zone"
                    style={{
                        border: `2px dashed ${isDragging ? '#3b82f6' : '#cbd5e1'}`,
                        backgroundColor: isDragging ? '#eff6ff' : 'transparent',
                        cursor: isUploading ? 'default' : 'pointer',
                        transition: 'all 0.3s ease',
                    }}
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    {isUploading ? (
                        <>
                            <div className="upload-icon">
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    border: '4px solid #e2e8f0',
                                    borderTop: '4px solid #3b82f6',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite',
                                    margin: '0 auto',
                                }}></div>
                            </div>
                            <h3 style={{fontSize: '16px', marginBottom: '5px'}}>Đang upload...</h3>
                            <p style={{color: 'var(--text-light)', fontSize: '13px'}}>Vui lòng chờ trong giây lát</p>
                        </>
                    ) : (
                        <>
                            <div className="upload-icon"><i className="fas fa-cloud-upload-alt"></i></div>
                            <h3 style={{fontSize: '16px', marginBottom: '5px'}}>Kéo thả tài liệu vào đây để AI xử lý</h3>
                            <p style={{color: 'var(--text-light)', fontSize: '13px', marginBottom: '15px'}}>Hỗ trợ PDF, DOCX, XLSX, JPG. AI sẽ tự động đọc, đổi tên và phân loại.</p>
                            <label
                                htmlFor="file-upload-input-documents"
                                style={{
                                    background: 'var(--accent)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s ease',
                                    display: 'inline-block',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#2563eb';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'var(--accent)';
                                }}
                            >
                                <i className="fas fa-folder-open" style={{ marginRight: '8px' }}></i>
                                Chọn file từ máy
                            </label>
                        </>
                    )}
                </div>

                {/* Upload Result Pop-up */}
                {uploadResult && (
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
                            zIndex: 9999,
                            padding: '20px',
                        }}
                        onClick={() => setUploadResult(null)}
                    >
                        <div
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '12px',
                                padding: '30px',
                                maxWidth: '500px',
                                width: '100%',
                                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
                                position: 'relative',
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close button */}
                            <button
                                onClick={() => setUploadResult(null)}
                                style={{
                                    position: 'absolute',
                                    top: '15px',
                                    right: '15px',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '20px',
                                    color: 'var(--text-light)',
                                    width: '30px',
                                    height: '30px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '50%',
                                    transition: 'background 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#f1f5f9';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'none';
                                }}
                            >
                                <i className="fas fa-times"></i>
                            </button>

                            {/* Content */}
                            <div style={{ textAlign: 'center', paddingTop: '10px' }}>
                                <i
                                    className={`fas ${uploadResult.success ? 'fa-check-circle' : 'fa-exclamation-circle'}`}
                                    style={{
                                        fontSize: '64px',
                                        color: uploadResult.success ? 'var(--success)' : 'var(--danger)',
                                        marginBottom: '20px',
                                    }}
                                ></i>
                                
                                <h3
                                    style={{
                                        fontWeight: '600',
                                        fontSize: '20px',
                                        color: uploadResult.success ? 'var(--success)' : 'var(--danger)',
                                        marginBottom: '15px',
                                    }}
                                >
                                    {uploadResult.message}
                                </h3>

                                {uploadResult.success && (
                                    <>
                                        <p style={{ 
                                            fontSize: '14px', 
                                            color: 'var(--text-light)', 
                                            marginBottom: '20px',
                                            lineHeight: '1.6'
                                        }}>
                                            Các file sẽ được xử lý sớm nhất có thể để giao đến các phòng ban
                                        </p>

                                        {uploadResult.data?.uploaded && uploadResult.data.uploaded.length > 0 && (
                                            <div style={{ 
                                                textAlign: 'left',
                                                backgroundColor: '#f8fafc',
                                                borderRadius: '8px',
                                                padding: '15px',
                                                marginBottom: '20px',
                                            }}>
                                                <div style={{ fontWeight: '600', marginBottom: '10px', fontSize: '14px' }}>
                                                    File đã upload:
                                                </div>
                                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                                    {uploadResult.data.uploaded.map((file, index) => (
                                                        <li
                                                            key={index}
                                                            style={{
                                                                padding: '8px 0',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '10px',
                                                                fontSize: '13px',
                                                            }}
                                                        >
                                                            <i className="fas fa-file" style={{ color: 'var(--accent)' }}></i>
                                                            <span style={{ flex: 1 }}>{file.name}</span>
                                                            {file.size && (
                                                                <span style={{ color: 'var(--text-light)', fontSize: '12px' }}>
                                                                    ({(file.size / 1024).toFixed(2)} KB)
                                                                </span>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </>
                                )}

                                {uploadResult.data?.failed && uploadResult.data.failed.length > 0 && (
                                    <div style={{ 
                                        textAlign: 'left',
                                        backgroundColor: '#fef2f2',
                                        borderRadius: '8px',
                                        padding: '15px',
                                        marginBottom: '20px',
                                    }}>
                                        <div style={{ fontWeight: '600', marginBottom: '10px', fontSize: '14px', color: 'var(--danger)' }}>
                                            File lỗi:
                                        </div>
                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                            {uploadResult.data.failed.map((error, index) => (
                                                <li key={index} style={{ padding: '5px 0', fontSize: '13px', color: 'var(--danger)' }}>
                                                    {error.fileName}: {error.error}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <button
                                    onClick={() => setUploadResult(null)}
                                    style={{
                                        background: uploadResult.success ? 'var(--success)' : 'var(--danger)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '12px 30px',
                                        borderRadius: '8px',
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'opacity 0.2s',
                                        marginTop: '10px',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.opacity = '0.9';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.opacity = '1';
                                    }}
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="folder-section">
                    <div className="section-title-sm">Thư mục tự động (Smart Folders)</div>
                    <div className="folder-grid">
                        {Object.entries(categoryNames).map(([categoryKey, categoryName]) => {
                            const count = folderStats?.[categoryKey] || 0;
                            return (
                                <div 
                                    key={categoryKey}
                                    className="folder-card" 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        console.log('Folder clicked:', categoryKey, categoryName);
                                        handleFolderClick(categoryKey);
                                    }}
                                    onMouseDown={(e) => {
                                        console.log('Folder mousedown:', categoryKey);
                                    }}
                                    style={{ cursor: 'pointer', position: 'relative', zIndex: 1 }}
                                >
                                    <i className="fas fa-folder folder-icon" style={{ pointerEvents: 'none' }}></i>
                                    <div style={{ pointerEvents: 'none' }}>
                                        <div style={{fontWeight: 600, fontSize: '14px'}}>{categoryName}</div>
                                        <div style={{fontSize: '12px', color: 'var(--text-light)'}}>{count} files</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="table-section">
                    <div className="section-header">
                        <div className="section-title-sm" style={{marginBottom: 0}}>Tài liệu gần đây</div>
                        <div className="filter-sort-container" style={{display: 'flex', gap: '10px', position: 'relative'}}>
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

                    {loadingDocuments ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: 'var(--accent)', marginBottom: '10px' }}></i>
                            <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>Đang tải...</p>
                        </div>
                    ) : filteredDocuments.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>
                            <i className="fas fa-folder-open" style={{ fontSize: '48px', marginBottom: '10px', opacity: 0.5 }}></i>
                            <p>Chưa có tài liệu nào</p>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, fontSize: '14px', color: '#64748b' }}>Tên tài liệu</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, fontSize: '14px', color: '#64748b' }}>Phân loại AI (Auto-Tag)</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, fontSize: '14px', color: '#64748b' }}>Trạng thái</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, fontSize: '14px', color: '#64748b' }}>Trạng thái Audit</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, fontSize: '14px', color: '#64748b' }}>Thời gian</th>
                                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, fontSize: '14px', color: '#64748b', width: '50px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDocuments.map((doc) => {
                                    const statusColor = getStatusColor(doc.status);
                                    const categoryName = getCategoryFromPath(doc.storage_path);
                                    return (
                                        <tr 
                                            key={doc.id} 
                                            style={{ 
                                                borderBottom: '1px solid #f1f5f9',
                                                cursor: 'pointer',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = '#f8fafc';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }}
                                            onClick={() => handleDocumentClick(doc.storage_path)}
                                        >
                                            <td style={{ padding: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <i className="fas fa-file-pdf" style={{ color: '#ef4444', fontSize: '18px' }}></i>
                                                    <div style={{ fontWeight: 500, fontSize: '14px', color: '#1e293b' }}>
                                                        {doc.title || 'Không có tiêu đề'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <span style={{
                                                    display: 'inline-block',
                                                    padding: '4px 12px',
                                                    borderRadius: '12px',
                                                    fontSize: '12px',
                                                    fontWeight: 500,
                                                    backgroundColor: '#f1f5f9',
                                                    color: '#64748b',
                                                }}>
                                                    {categoryName}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <span style={{
                                                    display: 'inline-block',
                                                    padding: '4px 12px',
                                                    borderRadius: '12px',
                                                    fontSize: '12px',
                                                    fontWeight: 500,
                                                    backgroundColor: statusColor.bg,
                                                    color: statusColor.color,
                                                }}>
                                                    {getStatusLabel(doc.status)}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <span style={{
                                                    display: 'inline-block',
                                                    padding: '4px 12px',
                                                    borderRadius: '12px',
                                                    fontSize: '12px',
                                                    fontWeight: 500,
                                                    backgroundColor: '#fee2e2',
                                                    color: '#991b1b',
                                                }}>
                                                    Bảo mật
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px', fontSize: '14px', color: '#64748b' }}>
                                                {formatTime(doc.update_at || doc.created_at)}
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'center' }}>
                                                <div className="document-menu" style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
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
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

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

                {/* CSS Animation for spinner */}
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
    );
};

export default Documents;