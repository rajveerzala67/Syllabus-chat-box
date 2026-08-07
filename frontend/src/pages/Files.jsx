import React, { useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { AuthContext, api } from '../context/AuthContext';
import { Upload, Trash2, Download, File, Loader, Eye } from 'lucide-react';

const Files = () => {
  const { user } = useContext(AuthContext);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const canUpload = user?.role === 'coordinator' || user?.role === 'teacher' || user?.role === 'admin';

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const res = await api.get('/files');
      setFiles(res.data);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load shared files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleFileChange = (e) => {
    setSelectedFiles(Array.from(e.target.files));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      alert('Please choose at least one file');
      return;
    }

    // Client side type check (images, pdf, word, ppt, excel, text notes)
    const validFiles = selectedFiles.filter(file => {
      const type = (file.type || '').toLowerCase();
      const ext = (file.name || '').toLowerCase();
      const validExt = /\.(jpg|jpeg|png|webp|gif|svg|pdf|doc|docx|ppt|pptx|xls|xlsx|txt|csv|md)$/.test(ext);
      return type.startsWith('image/') || type.includes('pdf') || type.includes('document') || type.includes('presentation') || type.includes('sheet') || type.includes('text') || validExt;
    });

    if (validFiles.length !== selectedFiles.length) {
      alert('Some files were ignored. Supported formats: PDF, Word (DOCX), PowerPoint (PPTX), Excel (XLSX), Text notes, and Images!');
    }

    if (validFiles.length === 0) return;

    setUploading(true);
    setErrorMsg('');

    const formData = new FormData();
    validFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      await api.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setSelectedFiles([]);
      // Reset input element
      const fileInput = document.getElementById('file-upload-input');
      if (fileInput) fileInput.value = '';
      
      alert('Upload complete');
      fetchFiles();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Error uploading files');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    try {
      await api.delete(`/files/${id}`);
      fetchFiles();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to delete file');
    }
  };

  const handleDownload = async (file) => {
    try {
      let downloadUrl = file.url;
      const fileName = file.name || 'class-file';

      // 1. If direct URL is missing, request download info from backend
      if (!downloadUrl || (!downloadUrl.startsWith('http') && !downloadUrl.startsWith('data:'))) {
        const res = await api.get(`/files/download/${file._id}`);
        if (res.data?.downloadUrl) {
          downloadUrl = res.data.downloadUrl;
        }
      }

      if (!downloadUrl) {
        alert('This old file was uploaded before Cloudinary integration and is no longer stored on server disk. Please delete it and upload a new copy.');
        return;
      }

      // 2. Handle Data URIs directly
      if (downloadUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        return;
      }

      // 3. For Cloudinary/HTTP URLs: Fetch raw binary ArrayBuffer using clean un-authenticated Axios
      // and explicitly construct a Blob with proper MIME type (application/pdf for PDFs)
      try {
        const cleanAxios = axios.create(); // Clean instance without Authorization header
        const response = await cleanAxios.get(downloadUrl, { responseType: 'arraybuffer' });

        // Determine correct MIME type explicitly based on file extension
        let mime = file.mimeType || 'application/octet-stream';
        const lowerName = fileName.toLowerCase();
        if (lowerName.endsWith('.pdf')) {
          mime = 'application/pdf';
        } else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
          mime = 'image/jpeg';
        } else if (lowerName.endsWith('.png')) {
          mime = 'image/png';
        } else if (lowerName.endsWith('.webp')) {
          mime = 'image/webp';
        } else if (lowerName.endsWith('.docx') || lowerName.endsWith('.doc')) {
          mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        } else if (lowerName.endsWith('.pptx') || lowerName.endsWith('.ppt')) {
          mime = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        } else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
          mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        } else if (lowerName.endsWith('.txt') || lowerName.endsWith('.md')) {
          mime = 'text/plain';
        }

        const fileBlob = new Blob([response.data], { type: mime });
        const blobUrl = window.URL.createObjectURL(fileBlob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 15000);
        return;
      } catch (fetchErr) {
        console.warn('ArrayBuffer fetch fallback to direct link:', fetchErr);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.target = '_blank';
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (err) {
      console.error('Download error:', err);
      const errMsg = err.response?.data?.message || 'Unable to download file. It may have been uploaded prior to server restart. Please delete and re-upload.';
      alert(errMsg);
    }
  };

  const handlePreview = async (file) => {
    try {
      let previewUrl = file.url;
      const fileName = (file.name || '').toLowerCase();

      if (!previewUrl || (!previewUrl.startsWith('http') && !previewUrl.startsWith('data:'))) {
        const res = await api.get(`/files/download/${file._id}`);
        if (res.data?.downloadUrl) {
          previewUrl = res.data.downloadUrl;
        }
      }

      if (!previewUrl) {
        alert('File preview unavailable. Please delete and re-upload this file.');
        return;
      }

      const mime = (file.mimeType || '').toLowerCase();
      const isImage = mime.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/.test(fileName);
      const isPdf = mime.includes('pdf') || fileName.endsWith('.pdf');
      const isTxt = mime.includes('text') || fileName.endsWith('.txt') || fileName.endsWith('.md');
      const isOfficeDoc = /\.(doc|docx|ppt|pptx|xls|xlsx)$/.test(fileName) || mime.includes('word') || mime.includes('presentation') || mime.includes('spreadsheet');

      if (isImage || isPdf || isTxt || previewUrl.startsWith('data:')) {
        window.open(previewUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      if (isOfficeDoc && (previewUrl.startsWith('http://') || previewUrl.startsWith('https://'))) {
        const gviewUrl = `https://docs.google.com/gview?url=${encodeURIComponent(previewUrl)}&embedded=true`;
        window.open(gviewUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      window.open(previewUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Preview error:', err);
      if (file.url) {
        window.open(file.url, '_blank', 'noopener,noreferrer');
      }
    }
  };

  return (
    <div className="container files-container fade-in">
      <div className="glass-card files-card">
        <h2>📎 Shared Class Files & Lecture Notes</h2>

        {canUpload && (
          <div className="upload-section glass-card inner-card">
            <h3>Upload Class Resource & Notes</h3>
            <div className="upload-controls">
              <input
                type="file"
                id="file-upload-input"
                accept="image/*,application/pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.md"
                multiple
                onChange={handleFileChange}
              />
              <button 
                onClick={handleUpload} 
                className="primary-btn size-auto upload-btn"
                disabled={uploading || selectedFiles.length === 0}
              >
                {uploading ? (
                  <>
                    <Loader className="spinner mr-6" size={16} />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload size={16} className="mr-6" />
                    <span>Upload Notes / Files</span>
                  </>
                )}
              </button>
            </div>
            <small className="help-text">Allowed formats: PDF, Word (DOCX), PowerPoint (PPTX), Excel (XLSX), Text notes, and Images. Max file size: 20MB.</small>
          </div>
        )}

        {errorMsg && <div className="error-alert">{errorMsg}</div>}

        <div className="files-list">
          {loading ? (
            <div className="loading-spinner">
              <Loader className="spinner" size={24} />
              <span>Fetching files...</span>
            </div>
          ) : files.length === 0 ? (
            <p className="no-files-msg">No files uploaded yet.</p>
          ) : (
            <div className="files-grid">
              {files.map((file) => {
                const when = new Date(file.uploadedAt).toLocaleString();
                return (
                  <div key={file._id} className="file-item-card glass-card inner-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', gap: '16px' }}>
                    <div className="file-info-left" style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                      <div className="file-icon-box" style={{ background: 'rgba(2, 132, 199, 0.2)', color: '#38bdf8', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <File className="file-icon" size={26} />
                      </div>
                      <div className="file-metadata" style={{ overflow: 'hidden' }}>
                        <span className="file-name" style={{ display: 'block', fontSize: '16px', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {file.name}
                        </span>
                        <span className="file-details" style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px', display: 'block' }}>
                          {file.mimeType} • {when}
                        </span>
                      </div>
                    </div>

                    <div className="file-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                      {/* BRIGHT BLUE EYE BUTTON FOR WATCHING/VIEWING FILE */}
                      <button 
                        type="button"
                        onClick={() => handlePreview(file)} 
                        className="blue-eye-btn"
                        title="Watch / View file in browser"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                          color: '#ffffff',
                          padding: '9px 16px',
                          borderRadius: '10px',
                          border: 'none',
                          fontWeight: '800',
                          fontSize: '14px',
                          cursor: 'pointer',
                          boxShadow: '0 4px 16px rgba(2, 132, 199, 0.45)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Eye size={18} style={{ color: '#ffffff' }} />
                        <span>Watch / View</span>
                      </button>

                      {/* DOWNLOAD BUTTON */}
                      <button 
                        type="button"
                        onClick={() => handleDownload(file)} 
                        className="download-btn"
                        title="Download file"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#34d399',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                          padding: '9px 14px',
                          borderRadius: '10px',
                          fontWeight: '700',
                          fontSize: '13px',
                          cursor: 'pointer'
                        }}
                      >
                        <Download size={16} />
                        <span>Download</span>
                      </button>
                      
                      {canUpload && (
                        <button 
                          type="button"
                          onClick={() => handleDelete(file._id)} 
                          className="delete-btn"
                          title="Delete file"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            padding: '9px 12px',
                            borderRadius: '10px',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Files;
