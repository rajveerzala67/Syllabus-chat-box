import React, { useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { AuthContext, api } from '../context/AuthContext';
import { Upload, Trash2, Download, File, Loader } from 'lucide-react';

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

    // Client side type check (images or pdf)
    const validFiles = selectedFiles.filter(file => {
      const type = file.type;
      return type.startsWith('image/') || type === 'application/pdf';
    });

    if (validFiles.length !== selectedFiles.length) {
      alert('Some files were ignored. Only images and PDF files are allowed!');
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

  return (
    <div className="container files-container fade-in">
      <div className="glass-card files-card">
        <h2>📎 Shared Class Files</h2>

        {canUpload && (
          <div className="upload-section glass-card inner-card">
            <h3>Upload Class Resource</h3>
            <div className="upload-controls">
              <input
                type="file"
                id="file-upload-input"
                accept="image/*,application/pdf"
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
                    <span>Upload</span>
                  </>
                )}
              </button>
            </div>
            <small className="help-text">Allowed formats: Images, PDF. Max file size: 10MB.</small>
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
                const isImage = file.mimeType.startsWith('image/');
                const when = new Date(file.uploadedAt).toLocaleString();
                return (
                  <div key={file._id} className="file-item-card glass-card inner-card">
                    <div className="file-info-left">
                      <div className="file-icon-box">
                        <File className="file-icon" size={24} />
                      </div>
                      <div className="file-metadata">
                        <span className="file-name">{file.name}</span>
                        <span className="file-details">
                          {file.mimeType} • {when}
                        </span>
                      </div>
                    </div>

                    <div className="file-actions">
                      <button 
                        onClick={() => handleDownload(file)} 
                        className="download-btn"
                        title="Download file"
                      >
                        <Download size={18} />
                      </button>
                      
                      {canUpload && (
                        <button 
                          onClick={() => handleDelete(file._id)} 
                          className="delete-btn"
                          title="Delete file"
                        >
                          <Trash2 size={18} />
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
