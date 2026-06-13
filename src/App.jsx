import { useState } from 'react'
import PhoneAuth from './components/PhoneAuth'
import RandevuForm from './components/RandevuForm'
import AdminPanel from './components/AdminPanel'

const ADMIN_PHONE = '+905303667322'

const App = () => {
  const [user, setUser] = useState(null)

  return (
    <div>
      <nav style={navbar}>
        <div style={container}>
          <a href="#" style={logo}>
            <span style={logoMain}>Hair Art</span>
            <span style={logoSub}>Mehmet Kalkan</span>
          </a>
          <ul style={navLinks}>
            <li><a href="#hero" style={navLink}>Ana Sayfa</a></li>
            <li><a href="#appointment" style={navLink}>
              {user?.phoneNumber === ADMIN_PHONE ? 'Yönetim' : 'Randevu'}
            </a></li>
            <li><a href="#contact" style={navLink}>İletişim</a></li>
          </ul>
        </div>
      </nav>

      <section style={hero}>
        <div style={heroOverlay}></div>
        <div style={{ ...container, position: 'relative', zIndex: 2 }}>
          <div style={heroContent}>
            <div style={badge}>Premium Barber &amp; Stylist</div>
            <h1 style={heroTitle}>
              Hair Art<br /><em style={{ fontStyle: 'italic', color: '#C62828' }}>Mehmet Kalkan</em>
            </h1>
            <p style={heroSub}>Tarzınızı Profesyonel Ellere Bırakın</p>
            <div style={heroActions}>
              <a href="#appointment" style={btnPrimary}>
                <i className="fa-regular fa-calendar-check"></i> Randevu Al
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="appointment" style={section}>
        <div style={container}>
          {!user ? (
            <>
              <span style={sectionLabel}>Randevu</span>
              <h2 style={sectionTitle}>Online Randevu Al</h2>
              <div style={redDivider}></div>
              <p style={sectionDesc}>
                Telefon numaranızla giriş yapın, dakikalar içinde randevunuzu oluşturun.
              </p>
              <div style={{ marginTop: 40 }}>
                <PhoneAuth onAuthSuccess={(u) => setUser(u)} />
              </div>
            </>
          ) : user.phoneNumber === ADMIN_PHONE ? (
            <>
              <span style={sectionLabel}>Yönetim Paneli</span>
              <h2 style={sectionTitle}>Randevu Yönetimi</h2>
              <div style={redDivider}></div>
              <p style={sectionDesc}>
                Tüm randevuları görüntüleyin ve durumlarını güncelleyin.
              </p>
              <div style={{ marginTop: 40 }}>
                <AdminPanel user={user} />
              </div>
            </>
          ) : (
            <>
              <span style={sectionLabel}>Randevu</span>
              <h2 style={sectionTitle}>Online Randevu Al</h2>
              <div style={redDivider}></div>
              <p style={sectionDesc}>
                Telefon numaranızla giriş yapın, dakikalar içinde randevunuzu oluşturun.
              </p>
              <div style={{ marginTop: 40 }}>
                <RandevuForm user={user} />
              </div>
            </>
          )}
        </div>
      </section>

      <section id="contact" style={{ ...section, background: '#111' }}>
        <div style={container}>
          <span style={sectionLabel}>İletişim</span>
          <h2 style={sectionTitle}>Randevu &amp; Adres</h2>
          <div style={redDivider}></div>
          <div style={contactGrid}>
            <div>
              <div style={contactItem}>
                <i className="fa-solid fa-location-dot" style={{ color: '#C62828', width: 20 }}></i>
                <div>
                  <h4 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Adres</h4>
                  <p style={{ color: '#88807a', fontSize: 14 }}>Yenibağlar, Eti Cd. No:1<br />26000 Tepebaşı/Eskişehir</p>
                </div>
              </div>
              <div style={contactItem}>
                <i className="fa-solid fa-phone" style={{ color: '#C62828', width: 20 }}></i>
                <div>
                  <h4 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Telefon</h4>
                  <p style={{ color: '#88807a', fontSize: 14 }}>+90 542 508 26 47</p>
                </div>
              </div>
            </div>
            <div>
              <div style={hoursBox}>
                <h4 style={{ color: '#C62828', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                  Çalışma Saatleri
                </h4>
                <div style={hoursRow}><span>Pazartesi - Cuma</span><span>09:00 - 20:00</span></div>
                <div style={hoursRow}><span>Cumartesi</span><span>10:00 - 18:00</span></div>
                <div style={hoursRow}><span>Pazar</span><span>Kapalı</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid #2a2725', padding: '32px 0', textAlign: 'center' }}>
        <div style={container}>
          <p style={{ fontSize: 13, color: '#88807a' }}>
            &copy; 2026 <a href="#" style={{ color: '#C62828' }}>Hair Art Mehmet Kalkan</a>. Tüm hakları saklıdır.
          </p>
        </div>
      </footer>
    </div>
  )
}

const container = {
  maxWidth: 1200,
  margin: '0 auto',
  padding: '0 24px',
}

const navbar = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  zIndex: 1000,
  padding: '20px 0',
  background: 'rgba(7,7,7,0.92)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  borderBottom: '1px solid rgba(198,40,40,0.15)',
}

const logo = {
  display: 'flex',
  flexDirection: 'column',
  lineHeight: 1.1,
  textDecoration: 'none',
}

const logoMain = {
  fontFamily: "'Oswald', sans-serif",
  fontSize: 22,
  fontWeight: 600,
  color: '#C62828',
  letterSpacing: 2,
}

const logoSub = {
  fontSize: 10,
  fontWeight: 300,
  letterSpacing: 4,
  textTransform: 'uppercase',
  color: '#88807a',
}

const navLinks = {
  display: 'flex',
  alignItems: 'center',
  gap: 36,
  listStyle: 'none',
}

const navLink = {
  fontSize: 13,
  fontWeight: 500,
  letterSpacing: 1,
  textTransform: 'uppercase',
  color: '#88807a',
  transition: 'color 0.3s',
  textDecoration: 'none',
}

const hero = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  position: 'relative',
  overflow: 'hidden',
  background: 'linear-gradient(135deg, #070707 0%, #111111 40%, #1a1510 100%)',
}

const heroOverlay = {
  position: 'absolute',
  inset: 0,
  background: 'radial-gradient(ellipse at 20% 50%, rgba(198,40,40,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(198,40,40,0.04) 0%, transparent 50%)',
  pointerEvents: 'none',
}

const heroContent = {
  maxWidth: 820,
}

const badge = {
  display: 'inline-block',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 4,
  textTransform: 'uppercase',
  color: '#C62828',
  border: '1px solid rgba(198,40,40,0.3)',
  padding: '8px 20px',
  borderRadius: 4,
  marginBottom: 32,
}

const heroTitle = {
  fontFamily: "'Oswald', sans-serif",
  fontSize: 'clamp(44px, 8vw, 96px)',
  fontWeight: 600,
  lineHeight: 1.05,
  color: '#f5f0e8',
  marginBottom: 8,
}

const heroSub = {
  fontFamily: "'Oswald', sans-serif",
  fontSize: 'clamp(16px, 2vw, 22px)',
  fontWeight: 400,
  color: '#88807a',
  marginBottom: 40,
  fontStyle: 'italic',
}

const heroActions = {
  display: 'flex',
  gap: 20,
  flexWrap: 'wrap',
}

const btnPrimary = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  padding: '16px 36px',
  fontFamily: "'Inter', sans-serif",
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: 2,
  textTransform: 'uppercase',
  borderRadius: 4,
  cursor: 'pointer',
  background: '#C62828',
  color: '#070707',
  border: 'none',
  textDecoration: 'none',
  transition: 'all 0.3s',
}

const section = {
  padding: '100px 0',
}

const sectionLabel = {
  fontFamily: "'Inter', sans-serif",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: 4,
  textTransform: 'uppercase',
  color: '#C62828',
  marginBottom: 12,
  display: 'block',
}

const sectionTitle = {
  fontFamily: "'Oswald', sans-serif",
  fontSize: 'clamp(32px, 5vw, 52px)',
  fontWeight: 600,
  color: '#f5f0e8',
  marginBottom: 16,
}

const redDivider = {
  width: 60,
  height: 2,
  background: '#C62828',
  margin: '20px 0 30px',
}

const sectionDesc = {
  fontSize: 16,
  color: '#88807a',
  maxWidth: 600,
  lineHeight: 1.8,
}

const contactGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 60,
  marginTop: 50,
}

const contactItem = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 16,
  marginBottom: 24,
}

const hoursBox = {
  marginTop: 36,
  paddingTop: 28,
  borderTop: '1px solid #2a2725',
}

const hoursRow = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 14,
  padding: '8px 0',
  color: '#88807a',
}

export default App
