import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import Takvim from './Takvim'

const DAYS_TR = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']

const ALL_SLOTS = []
for (let h = 9; h <= 19; h++) {
  ALL_SLOTS.push(`${String(h).padStart(2, '0')}:00`)
}

const RandevuForm = ({ user }) => {
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [bookedSlots, setBookedSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [booking, setBooking] = useState(false)
  const [success, setSuccess] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const [shopSettings, setShopSettings] = useState(null)
  const [settingsLoading, setSettingsLoading] = useState(true)

  const DEFAULTS = { openTime: '09:00', closeTime: '20:00', lunchBreak: '', closedDays: [] }

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'shop'))
        if (snap.exists()) {
          setShopSettings({ ...DEFAULTS, ...snap.data() })
        } else {
          setShopSettings({ ...DEFAULTS })
        }
      } catch (err) {
        console.error('Ayarlar yüklenirken hata:', err)
        setShopSettings({ ...DEFAULTS })
      } finally {
        setSettingsLoading(false)
      }
    }
    loadSettings()
  }, [])

  const today = new Date().toISOString().split('T')[0]

  const handleDateChange = async (date) => {
    setSelectedDate(date)
    setSelectedTime('')
    setError('')
    setSuccess(false)
    if (!date) return

    if (shopSettings?.closedDays?.length) {
      const dayIndex = new Date(date + 'T00:00:00').getDay()
      const dayName = DAYS_TR[dayIndex]
      if (shopSettings.closedDays.includes(dayName)) {
        setError(`${dayName} günleri kapalıyız. Lütfen başka bir gün seçin.`)
        return
      }
    }

    setLoading(true)
    try {
      const disabled = new Set()

      const q = query(collection(db, 'appointments'), where('date', '==', date), where('status', '!=', 'iptal edildi'))
      const snapshot = await getDocs(q)
      snapshot.forEach((d) => disabled.add(d.data().time))

      const blockedSnap = await getDoc(doc(db, 'blocked_slots', date))
      if (blockedSnap.exists()) {
        (blockedSnap.data().blocked || []).forEach((t) => disabled.add(t))
      }

      setBookedSlots([...disabled])
    } catch (err) {
      console.error('Randevu sorgulama hatasi:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime) return
    const trimmed = name.trim()
    if (!trimmed || trimmed.length < 3) {
      setError('Lütfen randevuyu tamamlamak için adınızı ve soyadınızı giriniz.')
      return
    }
    if (!/^[a-zA-ZçÇğĞıİöÖşŞüÜ\s]+$/.test(trimmed)) {
      setError('Lütfen geçerli bir ad soyad giriniz (Rakam veya sembol kullanılamaz).')
      return
    }
    setError('')
    setBooking(true)
    try {
      await addDoc(collection(db, 'appointments'), {
        userId: user.uid,
        phoneNumber: user.phoneNumber,
        name: name.trim(),
        date: selectedDate,
        time: selectedTime,
        status: 'onaylandı',
        createdAt: serverTimestamp(),
      })
      setSuccess(true)
    } catch (err) {
      console.error('Randevu kayit hatasi:', err)
      setError('Randevu kaydedilirken bir hata oluştu.')
    } finally {
      setBooking(false)
    }
  }

  if (settingsLoading) {
    return (
      <div style={{ ...card, textAlign: 'center', padding: 60 }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ color: '#C62828', fontSize: 28 }}></i>
      </div>
    )
  }

  if (success) {
    return (
      <div style={card}>
        <div style={successInner}>
          <div style={successIcon}>
            <i className="fa-solid fa-check"></i>
          </div>
          <h3 style={successTitle}>Randevunuz Başarıyla Oluşturuldu</h3>
          <div style={successDetails}>
            <div style={successRow}>
              <i className="fa-regular fa-calendar" style={{ color: '#C62828', width: 18 }}></i>
              <span>{selectedDate}</span>
            </div>
            <div style={successRow}>
              <i className="fa-regular fa-clock" style={{ color: '#C62828', width: 18 }}></i>
              <span>{selectedTime}</span>
            </div>
          </div>
          <p style={successNote}>Randevunuz onaylanmıştır. Lütfen seçtiğiniz saatte dükkanda olunuz.</p>
          <button
            onClick={() => {
              setSuccess(false)
              setSelectedDate('')
              setSelectedTime('')
              setBookedSlots([])
            }}
            style={btn}
          >
            <i className="fa-solid fa-calendar-plus"></i> Yeni Randevu Al
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={card}>
      <div style={header}>
        <i className="fa-regular fa-calendar-check" style={{ color: '#C62828', fontSize: 20 }}></i>
        <h3 style={title}>Randevu Oluştur</h3>
      </div>

      <div style={userBadge}>
        <i className="fa-solid fa-user" style={{ color: '#88807a', fontSize: 12 }}></i>
        <span>{user.phoneNumber}</span>
      </div>

      <div style={fieldGroup}>
        <label style={label}>Adınız ve Soyadınız</label>
        <input
          type="text"
          placeholder="Adınız ve soyadınız"
          value={name}
          onChange={(e) => { setName(e.target.value.replace(/[^a-zA-ZçÇğĞıİöÖşŞüÜ\s]/g, '')); setError('') }}
          style={nameInput}
        />
      </div>

      <div style={fieldGroup}>
        <label style={label}>Tarih Seçin</label>
        <Takvim
          selectedDate={selectedDate}
          onDateSelect={handleDateChange}
          minDate={today}
          closedDays={shopSettings?.closedDays || []}
        />
        {selectedDate && (
          <div style={selectedDateBadge}>
            <i className="fa-regular fa-calendar" style={{ color: '#C62828' }}></i>
            <span>{selectedDate}</span>
          </div>
        )}
      </div>

      {selectedDate && !error && (
        <div style={fieldGroup}>
          <label style={label}>
            {loading ? 'Saatler yükleniyor...' : 'Saat Seçin'}
            {!loading && bookedSlots.length > 0 && (
              <span style={{ color: '#88807a', fontSize: 11, fontWeight: 400, marginLeft: 8 }}>
                ({bookedSlots.length} dolu)
              </span>
            )}
          </label>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ color: '#C62828', fontSize: 24 }}></i>
            </div>
          ) : (
            <div style={slotsGrid}>
              {ALL_SLOTS.length === 0 ? (
                <p style={{ color: '#88807a', fontSize: 13, gridColumn: '1 / -1' }}>
                  Bu gün için uygun saat bulunmuyor.
                </p>
              ) : (
                ALL_SLOTS.map((time) => {
                  const isBooked = bookedSlots.includes(time)
                  const isSelected = selectedTime === time
                  return (
                    <button
                      key={time}
                      onClick={() => !isBooked && setSelectedTime(time)}
                      disabled={isBooked}
                      style={{
                        ...slotBtn,
                        ...(isBooked ? slotDisabled : {}),
                        ...(isSelected ? slotSelected : {}),
                      }}
                    >
                      {time}
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={errorBox}>
          <i className="fa-solid fa-circle-exclamation" style={{ color: '#E53935' }}></i>
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={handleConfirm}
        disabled={!selectedTime || booking}
        style={!selectedTime || booking ? { ...btn, ...btnDisabled } : btn}
      >
        {booking ? (
          <><i className="fa-solid fa-spinner fa-spin"></i> Kaydediliyor...</>
        ) : (
          <><i className="fa-solid fa-check"></i> Randevuyu Onayla</>
        )}
      </button>
    </div>
  )
}

const card = {
  maxWidth: 480,
  margin: '0 auto',
  padding: 36,
  background: '#111',
  borderRadius: 12,
  border: '1px solid #2a2725',
}

const header = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginBottom: 20,
}

const title = {
  fontFamily: "'Oswald', sans-serif",
  fontSize: 20,
  fontWeight: 500,
  color: '#f5f0e8',
  margin: 0,
}

const userBadge = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 14px',
  background: '#1a1a1a',
  borderRadius: 20,
  fontSize: 13,
  color: '#88807a',
  marginBottom: 24,
}

const nameInput = {
  width: '100%',
  padding: '14px 16px',
  background: '#1a1a1a',
  border: '1px solid #2a2725',
  borderRadius: 8,
  color: '#f5f0e8',
  fontFamily: "'Inter', sans-serif",
  fontSize: 15,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
}

const fieldGroup = {
  marginBottom: 20,
}

const selectedDateBadge = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  marginTop: 12,
  padding: '8px 16px',
  background: '#1a1a1a',
  borderRadius: 8,
  fontSize: 14,
  color: '#f5f0e8',
}

const label = {
  display: 'block',
  fontFamily: "'Inter', sans-serif",
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: 1,
  textTransform: 'uppercase',
  color: '#f5f0e8',
  marginBottom: 10,
}

const slotsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
  gap: 8,
}

const slotBtn = {
  padding: '10px 6px',
  background: '#1a1a1a',
  border: '1px solid #2a2725',
  borderRadius: 6,
  color: '#f5f0e8',
  fontFamily: "'Inter', sans-serif",
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s',
}

const slotDisabled = {
  background: 'rgba(139,26,26,0.15)',
  borderColor: 'rgba(198,40,40,0.2)',
  color: '#555',
  cursor: 'not-allowed',
  textDecoration: 'line-through',
}

const slotSelected = {
  background: '#C62828',
  borderColor: '#C62828',
  color: '#fff',
  fontWeight: 600,
}

const btn = {
  width: '100%',
  padding: '16px 36px',
  background: '#C62828',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  fontFamily: "'Inter', sans-serif",
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: 2,
  textTransform: 'uppercase',
  cursor: 'pointer',
  transition: 'background 0.3s',
  marginTop: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
}

const btnDisabled = {
  background: '#8B1A1A',
  cursor: 'not-allowed',
}

const errorBox = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '12px 16px',
  background: 'rgba(229,57,53,0.1)',
  border: '1px solid rgba(229,57,53,0.3)',
  borderRadius: 8,
  color: '#E53935',
  fontSize: 13,
  fontWeight: 500,
  marginBottom: 16,
}

const successInner = {
  textAlign: 'center',
}

const successIcon = {
  width: 64,
  height: 64,
  borderRadius: '50%',
  background: 'rgba(34,197,94,0.12)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 20px',
  fontSize: 28,
  color: '#22c55e',
}

const successTitle = {
  fontFamily: "'Oswald', sans-serif",
  fontSize: 22,
  fontWeight: 500,
  color: '#f5f0e8',
  marginBottom: 20,
}

const successDetails = {
  display: 'flex',
  justifyContent: 'center',
  gap: 32,
  marginBottom: 16,
}

const successRow = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 15,
  color: '#f5f0e8',
}

const successNote = {
  fontSize: 13,
  color: '#88807a',
  marginBottom: 24,
}

export default RandevuForm
