import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import Loader from '../components/Loader';
import { Download } from 'lucide-react';

const QRMenu = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get('/restaurants/my-profile');
        setProfile(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const downloadQR = () => {
    const svg = document.getElementById("qr-code-svg");
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = "white"; // Add white background
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR_${profile.slug}.png`;
      downloadLink.href = `${pngFile}`;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  if (loading) return <Loader />;

  if (!profile) {
    return (
      <div>
        <h2>QR Menu</h2>
        <Card className="mt-4 text-center">
          <p>Please setup your restaurant profile first to generate your QR code.</p>
        </Card>
      </div>
    );
  }

  const menuUrl = `${window.location.origin}/menu/${profile.slug}`;

  return (
    <div>
      <div className="dashboard-page-header">
        <div>
          <h2>QR Menu Generator</h2>
          <p className="text-muted">Download and print your custom QR code.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1.5rem' }}>
          <h3>Your Custom QR Code</h3>
          <div style={{ padding: '1rem', background: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
            <QRCodeSVG 
              id="qr-code-svg"
              value={menuUrl} 
              size={256} 
              level="H"
              includeMargin={true}
              fgColor="#0f172a"
            />
          </div>
          <Button onClick={downloadQR} icon={<Download size={18} />}>
            Download PNG
          </Button>
        </Card>

        <Card>
          <h3>How to use it?</h3>
          <ul style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--text-muted)' }}>
            <li><strong>1. Download</strong> your QR code using the button on the left.</li>
            <li><strong>2. Print</strong> the QR code on your tables, menus, or posters.</li>
            <li><strong>3. Diners scan</strong> the code with their smartphone camera.</li>
            <li><strong>4. They view</strong> your beautiful digital menu instantly.</li>
          </ul>

          <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '0.5rem' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Direct Menu URL:</p>
            <a href={menuUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)', wordBreak: 'break-all' }}>
              {menuUrl}
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default QRMenu;
