import { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { QrCode, Download, Copy, Check, X } from 'lucide-react';
import './ShopQRCode.css';

/**
 * Reusable Shop QR Code Component
 * Can be embedded directly inside Dashboard / ShopDetail or shown in a modal dialog.
 */
export default function ShopQRCode({
  shopId,
  shopName = 'Local Store',
  shopCategory = '',
  size = 180,
  variant = 'card', // 'card' | 'modal'
  onClose,
}) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const qrWrapperRef = useRef(null);

  // Compute full direct URL to the shop's detail page
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shopUrl = `${origin}/shop/${shopId}`;

  // Copy link handler
  async function handleCopyLink() {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shopUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      }
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  }

  // Generate high-resolution downloadable printable placard
  function handleDownload() {
    setDownloading(true);
    try {
      const qrCanvas = qrWrapperRef.current?.querySelector('canvas');
      if (!qrCanvas) {
        throw new Error('QR canvas not found');
      }

      // Create an offscreen canvas with high DPI for crisp print quality
      const printCanvas = document.createElement('canvas');
      const ctx = printCanvas.getContext('2d');
      const width = 600;
      const height = 800;
      printCanvas.width = width;
      printCanvas.height = height;

      // Background fill
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Card border
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 4;
      ctx.strokeRect(16, 16, width - 32, height - 32);

      // Accent top banner
      ctx.fillStyle = '#0f766e'; // LocalHive teal
      ctx.fillRect(20, 20, width - 40, 16);

      // App Title / Brand
      ctx.fillStyle = '#0f766e';
      ctx.font = 'bold 26px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('LocalHive', width / 2, 75);

      ctx.fillStyle = '#64748b';
      ctx.font = '500 15px Inter, system-ui, sans-serif';
      ctx.fillText('HYPERLOCAL STOREFRONT', width / 2, 98);

      // Divider line
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(60, 120);
      ctx.lineTo(width - 60, 120);
      ctx.stroke();

      // Shop Name
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 32px Inter, system-ui, sans-serif';
      const cleanName = shopName.length > 24 ? `${shopName.slice(0, 22)}…` : shopName;
      ctx.fillText(cleanName, width / 2, 175);

      if (shopCategory) {
        ctx.fillStyle = '#0f766e';
        ctx.font = '600 16px Inter, system-ui, sans-serif';
        ctx.fillText(`${shopCategory.toUpperCase()} STORE`, width / 2, 205);
      }

      // Draw QR Code centered with border
      const qrSize = 340;
      const qrX = (width - qrSize) / 2;
      const qrY = 240;

      // Subtle shadow / backing box for QR
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(qrX - 16, qrY - 16, qrSize + 32, qrSize + 32);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.strokeRect(qrX - 16, qrY - 16, qrSize + 32, qrSize + 32);

      // Draw image from QR canvas
      ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

      // Call to action
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 22px Inter, system-ui, sans-serif';
      ctx.fillText('Scan with Phone Camera', width / 2, 635);

      ctx.fillStyle = '#475569';
      ctx.font = '500 16px Inter, system-ui, sans-serif';
      ctx.fillText('Browse our inventory, check prices & contact us', width / 2, 665);

      // URL display
      ctx.fillStyle = '#0f766e';
      ctx.font = '14px monospace';
      const displayUrl = shopUrl.replace(/^https?:\/\//, '');
      ctx.fillText(displayUrl, width / 2, 720);

      // Trigger download
      const pngUrl = printCanvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      const safeFilename = (shopName || 'shop')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      downloadLink.download = `${safeFilename}-localhive-qr.png`;
      downloadLink.href = pngUrl;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (err) {
      console.error('Error generating QR download:', err);
    } finally {
      setDownloading(false);
    }
  }

  const content = (
    <div
      className="shop-qr-container"
      id={`shop-qr-container-${shopId}`}
    >
      <div className="shop-qr-header">
        <div className="shop-qr-title-row">
          <QrCode size={20} color="var(--color-primary)" />
          <h3 className="shop-qr-title">Store QR Code</h3>
        </div>
        <p className="shop-qr-subtitle">
          Scan to open this shop on any smartphone
        </p>
      </div>

      {/* QR Canvas Display */}
      <div
        ref={qrWrapperRef}
        className="shop-qr-canvas-wrapper"
        id={`qr-code-wrapper-${shopId}`}
      >
        <QRCodeCanvas
          value={shopUrl}
          size={size}
          level="H"
          marginSize={2}
          bgColor="#ffffff"
          fgColor="#0f172a"
          style={{ display: 'block', borderRadius: '4px' }}
        />
        <span className="shop-qr-shop-badge">
          {shopName}
        </span>
      </div>

      {/* URL Display with Copy Link */}
      <div className="shop-qr-url-box" id="shop-qr-url-display">
        <span className="shop-qr-url-text" title={shopUrl}>
          {shopUrl}
        </span>
        <button
          type="button"
          className="shop-qr-copy-btn"
          onClick={handleCopyLink}
          id="copy-shop-qr-link-btn"
          title="Copy shop URL"
        >
          {copied ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>

      {/* Download Action */}
      <div className="shop-qr-actions">
        <button
          type="button"
          className="shop-qr-download-btn"
          onClick={handleDownload}
          disabled={downloading}
          id="download-qr-btn"
        >
          <Download size={16} />
          <span>{downloading ? 'Preparing…' : 'Download QR Code'}</span>
        </button>
      </div>
    </div>
  );

  if (variant === 'modal') {
    return (
      <div
        className="shop-qr-modal-backdrop"
        onClick={onClose}
        id="shop-qr-modal-overlay"
      >
        <div
          className="shop-qr-modal-card"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="shop-qr-modal-close"
            onClick={onClose}
            aria-label="Close modal"
            id="close-qr-modal-btn"
          >
            <X size={18} />
          </button>
          {content}
        </div>
      </div>
    );
  }

  return content;
}
