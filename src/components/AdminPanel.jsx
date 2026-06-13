import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDoc, setDoc, addDoc, serverTimestamp, getDocs, where } from 'firebase/firestore'
import { db } from '../firebase'
import Takvim from './Takvim'

const STATUS_MAP = {
  bekliyor: { label: 'Bekliyor', color: '#f59e0b' },
  tamamlandi: { label: 'Tamamlandı', color: '#22c55e' },
  'iptal edildi': { label: 'İptal Edildi', color: '#E53935' },
}

const DAYS_TR = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
const DAYS_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']

const ALL_SLOTS = []
for (let h = 9; h <= 19; h++) {
  ALL_SLOTS.push(`${String(h).padStart(2, '0')}:00`)
}

const AdminPanel = ({ user }) => {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)

  const [slotDate, setSlotDate] = useState('')
  const [blockedSlots, setBlockedSlots] = useState([])
  const [slotLoading, setSlotLoading] = useState(false)
  const [savingSlots, setSavingSlots] = useState(false)
  const [slotMessage, setSlotMessage] = useState('')

  const [closedDays, setClosedDays] = useState(['Pazar'])
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [creating, setCreating] = useState(false)
  const [focusedField, setFocusedField] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'appointments'), orderBy('date', 'asc'), orderBy('time', 'asc'))
    const unsub = onSnapshot(q, (snapshot) => {
      const data = []
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }))
      setAppointments(data)
      setLoading(false)
    })
    return unsub
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'shop'))
        if (snap.exists()) {
          const s = snap.data()
          setClosedDays(s.closedDays || ['Pazar'])
        }
      } catch (err) {
        console.error('Ayarlar yüklenirken hata:', err)
      } finally {
        setSettingsLoading(false)
      }
    }
    load()
  }, [])

  const loadBlockedSlots = async (date) => {
    if (!date) {
      setBlockedSlots([])
      return
    }
    setSlotLoading(true)
    try {
      const snap = await getDoc(doc(db, 'blocked_slots', date))
      if (snap.exists()) {
        setBlockedSlots(snap.data().blocked || [])
      } else {
        setBlockedSlots([])
      }
    } catch (err) {
      console.error('Bloke saatler yüklenirken hata:', err)
    } finally {
      setSlotLoading(false)
    }
  }

  const toggleSlot = async (time) => {
    const newBlocked = blockedSlots.includes(time)
      ? blockedSlots.filter((t) => t !== time)
      : [...blockedSlots, time]

    setBlockedSlots(newBlocked)
    setSavingSlots(true)
    setSlotMessage('')
    try {
      await setDoc(doc(db, 'blocked_slots', slotDate), { blocked: newBlocked }, { merge: true })
    } catch (err) {
      console.error('Saat güncellenirken hata:', err)
      loadBlockedSlots(slotDate)
    } finally {
      setSavingSlots(false)
    }
  }

  const handleCloseAll = async () => {
    setSavingSlots(true)
    setSlotMessage('')
    try {
      const all = [...ALL_SLOTS]
      setBlockedSlots(all)
      await setDoc(doc(db, 'blocked_slots', slotDate), { blocked: all }, { merge: true })
    } catch (err) {
      console.error('Toplu kapatma hatasi:', err)
    } finally {
      setSavingSlots(false)
    }
  }

  const handleOpenAll = async () => {
    setSavingSlots(true)
    setSlotMessage('')
    try {
      const q = query(collection(db, 'appointments'), where('date', '==', slotDate))
      const snapshot = await getDocs(q)
      const booked = new Set()
      snapshot.forEach((d) => {
        if (d.data().status !== 'iptal edildi') booked.add(d.data().time)
      })
      const openable = ALL_SLOTS.filter((t) => !booked.has(t))
      setBlockedSlots([])
      await setDoc(doc(db, 'blocked_slots', slotDate), { blocked: [] }, { merge: true })
    } catch (err) {
      console.error('Toplu açma hatasi:', err)
    } finally {
      setSavingSlots(false)
    }
  }

  const handleStatusUpdate = async (id, newStatus) => {
    setUpdating(id)
    try {
      await updateDoc(doc(db, 'appointments', id), { status: newStatus })
    } catch (err) {
      console.error('Durum güncelleme hatasi:', err)
    } finally {
      setUpdating(null)
    }
  }

  const toggleDay = (day) => {
    setClosedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const handleSaveClosedDays = async () => {
    setSaving(true)
    setSaveMsg('')
    try {
      await setDoc(doc(db, 'settings', 'shop'), { closedDays }, { merge: true })
      setSaveMsg('Kapalı günler kaydedildi.')
      setTimeout(() => setSaveMsg(''), 3000)
    } catch (err) {
      console.error('Hata:', err)
      setSaveMsg('Kayıt sırasında hata oluştu.')
    } finally {
      setSaving(false)
    }
  }

  // ---------- Modal helpers ----------

  const [modalBlockedSlots, setModalBlockedSlots] = useState([])

  useEffect(() => {
    if (!showModal || !newDate) {
      setModalBlockedSlots([])
      return
    }
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'blocked_slots', newDate))
        if (snap.exists()) {
          setModalBlockedSlots(snap.data().blocked || [])
        } else {
          setModalBlockedSlots([])
        }
      } catch {
        setModalBlockedSlots([])
      }
    }
    load()
  }, [showModal, newDate])

  const isModalDateClosed = newDate && closedDays.includes(DAYS_TR[new Date(newDate + 'T00:00:00').getDay()])

  const modalBookedSlots = newDate
    ? appointments
        .filter((a) => a.date === newDate && a.status !== 'iptal edildi')
        .map((a) => a.time)
    : []

  useEffect(() => {
    if (newTime && (isModalDateClosed || modalBlockedSlots.includes(newTime) || modalBookedSlots.includes(newTime))) {
      setNewTime('')
    }
  }, [newTime, isModalDateClosed, modalBlockedSlots, modalBookedSlots])

  const modalAvailableSlots = isModalDateClosed
    ? []
    : ALL_SLOTS.filter((t) => !modalBlockedSlots.includes(t) && !modalBookedSlots.includes(t))

  const uniqueCustomers = {}
  appointments.forEach((a) => {
    if (a.name && a.phoneNumber) {
      uniqueCustomers[a.phoneNumber] = { name: a.name, phone: a.phoneNumber }
    }
  })
  const customerList = Object.values(uniqueCustomers)

  const suggestions = (() => {
    const q = (newName + newPhone).toLowerCase().trim()
    if (!q || q.length < 1 || !focusedField) return []
    return customerList.filter((c) =>
      c.name.toLowerCase().includes(q) || c.phone.includes(q)
    ).slice(0, 6)
  })()

  const handleSelectCustomer = (c) => {
    setNewName(c.name)
    setNewPhone(c.phone)
    setFocusedField(null)
  }

  const handleBlurSuggestions = () => {
    setTimeout(() => setFocusedField(null), 200)
  }

  const handleCreateAppointment = async (e) => {
    e.preventDefault()
    if (!newName.trim() || !newPhone.trim() || !newDate || !newTime) return
    setCreating(true)
    try {
      await addDoc(collection(db, 'appointments'), {
        name: newName.trim(),
        phoneNumber: newPhone.trim(),
        date: newDate,
        time: newTime,
        status: 'onaylandı',
        createdAt: serverTimestamp(),
      })
      setShowModal(false)
      setNewName('')
      setNewPhone('')
      setNewDate('')
      setNewTime('')
    } catch (err) {
      console.error('Randevu oluşturulurken hata:', err)
    } finally {
      setCreating(false)
    }
  }

  // ---------- Derived ----------

  const today = new Date().toISOString().split('T')[0]

  const isSlotDateClosed = slotDate && closedDays.includes(DAYS_TR[new Date(slotDate + 'T00:00:00').getDay()])

  const bookedSlots = slotDate
    ? appointments
        .filter((a) => a.date === slotDate && a.status !== 'iptal edildi')
        .map((a) => a.time)
    : []

  const stats = {
    total: appointments.length,
    today: appointments.filter((a) => a.date === today).length,
    pending: appointments.filter((a) => a.status === 'bekliyor').length,
  }

  // ---------- Render ----------

  return (
    <div>
      <div style={statsRow}>
        <div style={statCard}>
          <span style={statValue}>{stats.total}</span>
          <span style={statLabel}>Toplam Randevu</span>
        </div>
        <div style={statCard}>
          <span style={statValue}>{stats.today}</span>
          <span style={statLabel}>Bugün</span>
        </div>
        <div style={statCard}>
          <span style={statValue}>{stats.pending}</span>
          <span style={statLabel}>Bekleyen</span>
        </div>
      </div>

      <div style={addBtnRow}>
        <button onClick={() => setShowModal(true)} style={addBtn}>
          <i className="fa-solid fa-plus"></i> Yeni Randevu Ekle
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ color: '#C62828', fontSize: 32 }}></i>
        </div>
      ) : appointments.length === 0 ? (
        <div style={emptyState}>
          <i className="fa-regular fa-calendar" style={{ fontSize: 40, color: '#88807a' }}></i>
          <p style={{ color: '#88807a', fontSize: 15, marginTop: 12 }}>Henüz randevu bulunmuyor.</p>
        </div>
      ) : (
        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>İsim</th>
                <th style={th}>Telefon</th>
                <th style={th}>Tarih</th>
                <th style={th}>Saat</th>
                <th style={th}>Durum</th>
                <th style={th}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => {
                const statusInfo = STATUS_MAP[a.status] || { label: a.status, color: '#88807a' }
                return (
                  <tr key={a.id} style={tr}>
                    <td style={td}>{a.name || '-'}</td>
                    <td style={td}>{a.phoneNumber}</td>
                    <td style={td}>{a.date}</td>
                    <td style={td}>{a.time}</td>
                    <td style={td}>
                      <span
                        style={{
                          ...statusBadge,
                          background: `${statusInfo.color}18`,
                          color: statusInfo.color,
                          borderColor: `${statusInfo.color}40`,
                        }}
                      >
                        {statusInfo.label}
                      </span>
                    </td>
                    <td style={{ ...td, display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleStatusUpdate(a.id, 'tamamlandi')}
                        disabled={updating === a.id || a.status === 'tamamlandi'}
                        style={{
                          ...actionBtn,
                          ...(a.status === 'tamamlandi' ? actionActiveGreen : {}),
                          opacity: updating === a.id ? 0.5 : 1,
                        }}
                      >
                        {updating === a.id ? (
                          <i className="fa-solid fa-spinner fa-spin"></i>
                        ) : (
                          <i className="fa-solid fa-check"></i>
                        )}
                        Tamamlandı
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(a.id, 'iptal edildi')}
                        disabled={updating === a.id || a.status === 'iptal edildi'}
                        style={{
                          ...actionBtn,
                          ...(a.status === 'iptal edildi' ? actionActiveRed : {}),
                          opacity: updating === a.id ? 0.5 : 1,
                        }}
                      >
                        {updating === a.id ? (
                          <i className="fa-solid fa-spinner fa-spin"></i>
                        ) : (
                          <i className="fa-solid fa-xmark"></i>
                        )}
                        İptal Et
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------- Yeni Randevu Modal ---------- */}

      {showModal && (
        <div style={modalOverlay} onClick={() => setShowModal(false)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeader}>
              <h3 style={modalTitle}><i className="fa-solid fa-calendar-plus"></i> Yeni Randevu Oluştur</h3>
              <button onClick={() => setShowModal(false)} style={modalClose}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form onSubmit={handleCreateAppointment} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ position: 'relative' }}>
                <label style={modalLabel}>Müşteri Adı Soyadı</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => { setNewName(e.target.value); setFocusedField('name') }}
                  onFocus={() => setFocusedField('name')}
                  onBlur={handleBlurSuggestions}
                  placeholder="Ad Soyad"
                  required
                  style={modalInput}
                />
                {focusedField && suggestions.length > 0 && (
                  <div style={suggestionBox}>
                    {suggestions.map((c) => (
                      <button
                        key={c.phone}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleSelectCustomer(c) }}
                        style={suggestionItem}
                      >
                        <span style={suggestionName}>{c.name}</span>
                        <span style={suggestionPhone}>{c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <label style={modalLabel}>Telefon Numarası</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={newPhone}
                  onChange={(e) => { setNewPhone(e.target.value); setFocusedField('phone') }}
                  onFocus={() => setFocusedField('phone')}
                  onBlur={handleBlurSuggestions}
                  placeholder="05XX XXX XX XX"
                  required
                  style={modalInput}
                />
                {focusedField && suggestions.length > 0 && (
                  <div style={suggestionBox}>
                    {suggestions.map((c) => (
                      <button
                        key={c.phone}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleSelectCustomer(c) }}
                        style={suggestionItem}
                      >
                        <span style={suggestionName}>{c.name}</span>
                        <span style={suggestionPhone}>{c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label style={modalLabel}>Tarih</label>
                <div style={quickDateWrap}>
                  {(() => {
                    const days = []
                    for (let i = 0; i < 14; i++) {
                      const d = new Date()
                      d.setDate(d.getDate() + i)
                      const y = d.getFullYear()
                      const m = String(d.getMonth() + 1).padStart(2, '0')
                      const day = String(d.getDate()).padStart(2, '0')
                      const dateStr = `${y}-${m}-${day}`
                      const dayIndex = d.getDay()
                      const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
                      let label
                      if (i === 0) label = `Bugün, ${parseInt(day)} ${monthNames[d.getMonth()]}`
                      else if (i === 1) label = `Yarın, ${parseInt(day)} ${monthNames[d.getMonth()]}`
                      else label = `${DAYS_SHORT[dayIndex]}, ${parseInt(day)} ${monthNames[d.getMonth()]}`
                      const isSelected = newDate === dateStr
                      days.push(
                        <button
                          key={dateStr}
                          type="button"
                          onClick={() => { setNewDate(dateStr); setNewTime('') }}
                          style={{
                            ...quickDateBtn,
                            ...(isSelected ? quickDateBtnActive : {}),
                          }}
                        >
                          {label}
                        </button>
                      )
                    }
                    return days
                  })()}
                </div>
                {newDate && isModalDateClosed && (
                  <p style={{ color: '#E53935', fontSize: 12, marginTop: 6 }}>
                    Bu gün kapalı gün olarak işaretlenmiş.
                  </p>
                )}
              </div>
              <div>
                <label style={modalLabel}>Saat</label>
                <select
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  required
                  style={modalSelect}
                >
                  <option value="" disabled>Saat seçin</option>
                  {ALL_SLOTS.map((t) => {
                    const booked = modalBookedSlots.includes(t)
                    const blocked = modalBlockedSlots.includes(t)
                    const unavailable = booked || blocked
                    let suffix = ''
                    if (booked) suffix = ' (Dolu)'
                    else if (blocked) suffix = ' (Kapalı)'
                    return (
                      <option key={t} value={t} disabled={unavailable}>
                        {`${t}${suffix}`}
                      </option>
                    )
                  })}
                </select>
                {newDate && !isModalDateClosed && modalAvailableSlots.length === 0 && (
                  <p style={{ color: '#f59e0b', fontSize: 12, marginTop: 4 }}>
                    Bu tarihte müsait saat bulunamadı.
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={creating || modalAvailableSlots.length === 0 || isModalDateClosed}
                style={{
                  ...modalSubmit,
                  ...((creating || modalAvailableSlots.length === 0 || isModalDateClosed) ? modalSubmitDisabled : {}),
                }}
              >
                {creating ? (
                  <><i className="fa-solid fa-spinner fa-spin"></i> Oluşturuluyor...</>
                ) : (
                  <><i className="fa-solid fa-check"></i> Randevuyu Oluştur</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ---------- Günlük Saat Yönetimi ---------- */}

      <div style={slotCard}>
        <div style={slotHeader}>
          <i className="fa-solid fa-clock" style={{ color: '#C62828', fontSize: 20 }}></i>
          <h3 style={slotTitle}>Günlük Saat Yönetimi</h3>
        </div>

        <Takvim
          selectedDate={slotDate}
          onDateSelect={(date) => {
            setSlotDate(date)
            loadBlockedSlots(date)
          }}
          minDate={today}
          closedDays={closedDays}
        />

        {slotDate && isSlotDateClosed && (
          <div style={closedWarning}>
            <i className="fa-solid fa-circle-exclamation" style={{ color: '#E53935' }}></i>
            <span>Bu gün genel ayarlardan (Kapalı Günler) tamamen kapatılmıştır. Saat seçimi yapılamaz.</span>
          </div>
        )}

        {slotDate && !isSlotDateClosed && (
          <div style={slotInfoBar}>
            <span style={slotInfoText}>
              <i className="fa-regular fa-calendar" style={{ color: '#C62828' }}></i>
              {' '}{slotDate}
            </span>
            <span style={slotInfoText}>
              <i className="fa-solid fa-lock" style={{ color: blockedSlots.length > 0 ? '#C62828' : '#88807a' }}></i>
              {' '}{blockedSlots.length} kapalı
            </span>
            <span style={slotInfoText}>
              <i className="fa-regular fa-calendar-check" style={{ color: bookedSlots.length > 0 ? '#f59e0b' : '#88807a' }}></i>
              {' '}{bookedSlots.length} dolu
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={handleCloseAll} disabled={savingSlots} style={bulkBtn}>
                <i className="fa-solid fa-lock"></i> Tümünü Kapat
              </button>
              <button onClick={handleOpenAll} disabled={savingSlots} style={bulkBtn}>
                <i className="fa-solid fa-lock-open"></i> Tümünü Aç
              </button>
            </div>
          </div>
        )}

        {slotDate && !isSlotDateClosed && (
          <div style={slotGrid}>
            {slotLoading ? (
              <div style={{ textAlign: 'center', padding: 24, gridColumn: '1 / -1' }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ color: '#C62828', fontSize: 20 }}></i>
              </div>
            ) : (
              ALL_SLOTS.map((time) => {
                const isBooked = bookedSlots.includes(time)
                const isBlocked = blockedSlots.includes(time)
                let stateStyle = slotItemActive
                let label = null
                if (isBooked) {
                  stateStyle = slotItemBooked
                  label = <><i className="fa-solid fa-user" style={{ fontSize: 9 }}></i> Dolu</>
                } else if (isBlocked) {
                  stateStyle = slotItemBlocked
                  label = <i className="fa-solid fa-lock" style={{ fontSize: 9, opacity: 0.6 }}></i>
                }
                return (
                  <button
                    key={time}
                    onClick={() => !isBooked && toggleSlot(time)}
                    disabled={isBooked || savingSlots}
                    style={{
                      ...slotItem,
                      ...stateStyle,
                    }}
                  >
                    <span>{time}</span>
                    {label && <span style={{ fontSize: 9, display: 'flex', alignItems: 'center', gap: 3 }}>{label}</span>}
                  </button>
                )
              })
            )}
          </div>
        )}

        {!slotDate && (
          <p style={{ color: '#88807a', fontSize: 13, textAlign: 'center', padding: 20 }}>
            Bir tarih seçerek saatleri yönetmeye başlayın.
          </p>
        )}
      </div>

      {/* ---------- Kapalı Günler ---------- */}

      <div style={closedCard}>
        <div style={closedHeader}>
          <i className="fa-solid fa-calendar-xmark" style={{ color: '#C62828', fontSize: 20 }}></i>
          <h3 style={closedTitle}>Kapalı Günler</h3>
        </div>
        {settingsLoading ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ color: '#C62828', fontSize: 20 }}></i>
          </div>
        ) : (
          <>
            <div style={daysRow}>
              {DAYS_TR.map((day) => {
                const active = closedDays.includes(day)
                return (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    style={{
                      ...dayChip,
                      ...(active ? dayChipActive : {}),
                    }}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
            <button
              onClick={handleSaveClosedDays}
              disabled={saving}
              style={{
                ...closedBtn,
                ...(saving ? closedBtnDisabled : {}),
              }}
            >
              {saving ? (
                <><i className="fa-solid fa-spinner fa-spin"></i> Kaydediliyor...</>
              ) : (
                <><i className="fa-solid fa-floppy-disk"></i> Kapalı Günleri Kaydet</>
              )}
            </button>
            {saveMsg && (
              <p style={{ color: '#22c55e', fontSize: 13, marginTop: 12, textAlign: 'center' }}>{saveMsg}</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ---------- Styles ----------

const statsRow = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
  gap: 12,
}

const statCard = {
  padding: '20px 16px',
  background: '#111',
  borderRadius: 10,
  border: '1px solid #2a2725',
  textAlign: 'center',
}

const statValue = {
  display: 'block',
  fontFamily: "'Oswald', sans-serif",
  fontSize: 32,
  fontWeight: 500,
  color: '#f5f0e8',
  lineHeight: 1.1,
}

const statLabel = {
  display: 'block',
  fontSize: 12,
  color: '#88807a',
  marginTop: 4,
  letterSpacing: 1,
  textTransform: 'uppercase',
}

const addBtnRow = {
  marginTop: 20,
  display: 'flex',
  justifyContent: 'flex-end',
}

const addBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 22px',
  background: '#C62828',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontFamily: "'Inter', sans-serif",
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
  letterSpacing: 0.5,
}

const emptyState = {
  textAlign: 'center',
  padding: 60,
  marginTop: 20,
  background: '#111',
  borderRadius: 10,
  border: '1px solid #2a2725',
}

const tableWrap = {
  marginTop: 20,
  overflowX: 'auto',
  background: '#111',
  borderRadius: 10,
  border: '1px solid #2a2725',
}

const table = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 13,
}

const th = {
  padding: '12px 14px',
  textAlign: 'left',
  color: '#88807a',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 1,
  textTransform: 'uppercase',
  borderBottom: '1px solid #2a2725',
  whiteSpace: 'nowrap',
}

const td = {
  padding: '12px 14px',
  color: '#f5f0e8',
  borderBottom: '1px solid #2a2725',
  whiteSpace: 'nowrap',
}

const tr = {
  transition: 'background 0.15s',
}

const statusBadge = {
  display: 'inline-block',
  padding: '4px 10px',
  borderRadius: 4,
  fontSize: 11,
  fontWeight: 600,
  border: '1px solid',
}

const actionBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '6px 12px',
  border: 'none',
  borderRadius: 4,
  fontFamily: "'Inter', sans-serif",
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s',
  background: '#1a1a1a',
  color: '#88807a',
}

const actionActiveGreen = {
  background: 'rgba(34,197,94,0.12)',
  color: '#22c55e',
}

const actionActiveRed = {
  background: 'rgba(229,57,53,0.12)',
  color: '#E53935',
}

// Modal styles

const modalOverlay = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 20,
}

const modalBox = {
  width: '100%',
  maxWidth: 420,
  background: '#111',
  borderRadius: 12,
  border: '1px solid #2a2725',
  padding: '28px 24px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
}

const modalHeader = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 24,
}

const modalTitle = {
  fontFamily: "'Oswald', sans-serif",
  fontSize: 20,
  fontWeight: 500,
  color: '#f5f0e8',
  margin: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}

const modalClose = {
  background: 'transparent',
  border: 'none',
  color: '#88807a',
  fontSize: 22,
  cursor: 'pointer',
  padding: '4px 8px',
  borderRadius: 4,
  transition: 'color 0.15s',
}

const modalLabel = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#88807a',
  marginBottom: 6,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
}

const modalInput = {
  width: '100%',
  padding: '10px 12px',
  background: '#1a1a1a',
  border: '1px solid #2a2725',
  borderRadius: 6,
  color: '#f5f0e8',
  fontFamily: "'Inter', sans-serif",
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
}

const modalSelect = {
  width: '100%',
  padding: '12px 12px',
  background: '#1a1a1a',
  border: '1px solid #2a2725',
  borderRadius: 6,
  color: '#f5f0e8',
  fontFamily: "'Inter', sans-serif",
  fontSize: 15,
  outline: 'none',
  boxSizing: 'border-box',
  cursor: 'pointer',
  appearance: 'auto',
}

const modalSubmit = {
  width: '100%',
  padding: '12px',
  background: '#C62828',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontFamily: "'Inter', sans-serif",
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  transition: 'background 0.2s',
  marginTop: 4,
}

const modalSubmitDisabled = {
  background: '#8B1A1A',
  cursor: 'not-allowed',
}

const quickDateWrap = {
  display: 'flex',
  gap: 8,
  overflowX: 'auto',
  WebkitOverflowScrolling: 'touch',
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
  paddingBottom: 4,
}

const quickDateBtn = {
  flex: '0 0 auto',
  padding: '12px 16px',
  background: '#1a1a1a',
  border: '1px solid #2a2725',
  borderRadius: 8,
  color: '#88807a',
  fontFamily: "'Inter', sans-serif",
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'all 0.15s',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  touchAction: 'manipulation',
}

const quickDateBtnActive = {
  background: 'rgba(198,40,40,0.15)',
  borderColor: '#C62828',
  color: '#f5f0e8',
  fontWeight: 600,
}

const suggestionBox = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  zIndex: 10,
  background: '#1a1a1a',
  border: '1px solid #2a2725',
  borderTop: 'none',
  borderRadius: '0 0 6px 6px',
  overflow: 'hidden',
  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
}

const suggestionItem = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: '10px 12px',
  background: 'transparent',
  border: 'none',
  borderBottom: '1px solid #2a2725',
  color: '#f5f0e8',
  fontFamily: "'Inter', sans-serif",
  fontSize: 13,
  cursor: 'pointer',
  transition: 'background 0.1s',
  textAlign: 'left',
  boxSizing: 'border-box',
}

const suggestionName = {
  fontWeight: 500,
  color: '#f5f0e8',
}

const suggestionPhone = {
  color: '#88807a',
  fontSize: 12,
}

// Slot management styles

const slotCard = {
  marginTop: 32,
  padding: '24px 16px',
  background: '#111',
  borderRadius: 10,
  border: '1px solid #2a2725',
}

const slotHeader = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginBottom: 24,
}

const slotTitle = {
  fontFamily: "'Oswald', sans-serif",
  fontSize: 20,
  fontWeight: 500,
  color: '#f5f0e8',
  margin: 0,
}

const slotInfoBar = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: 10,
  marginTop: 20,
  marginBottom: 20,
  padding: '12px 14px',
  background: '#1a1a1a',
  borderRadius: 8,
  border: '1px solid #2a2725',
}

const slotInfoText = {
  fontSize: 13,
  color: '#88807a',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}

const closedWarning = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
  padding: '14px 16px',
  background: 'rgba(229,57,53,0.1)',
  border: '1px solid rgba(229,57,53,0.3)',
  borderRadius: 8,
  color: '#E53935',
  fontSize: 13,
  fontWeight: 500,
  lineHeight: 1.5,
}

const slotGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
  gap: 6,
}

const slotItem = {
  padding: '8px 4px',
  border: 'none',
  borderRadius: 5,
  fontFamily: "'Inter', sans-serif",
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.15s',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 2,
}

const slotItemActive = {
  background: '#1a1a1a',
  color: '#f5f0e8',
  border: '1px solid #2a2725',
}

const slotItemBlocked = {
  background: 'rgba(198,40,40,0.12)',
  color: '#C62828',
  border: '1px solid rgba(198,40,40,0.3)',
}

const slotItemBooked = {
  background: 'rgba(245,158,11,0.1)',
  color: '#f59e0b',
  border: '1px solid rgba(245,158,11,0.25)',
  cursor: 'not-allowed',
  opacity: 0.85,
}

const bulkBtn = {
  padding: '6px 12px',
  border: 'none',
  borderRadius: 4,
  background: '#111',
  color: '#88807a',
  fontFamily: "'Inter', sans-serif",
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  whiteSpace: 'nowrap',
}

// Closed Days styles

const closedCard = {
  marginTop: 20,
  padding: 28,
  background: '#111',
  borderRadius: 10,
  border: '1px solid #2a2725',
}

const closedHeader = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginBottom: 16,
}

const closedTitle = {
  fontFamily: "'Oswald', sans-serif",
  fontSize: 20,
  fontWeight: 500,
  color: '#f5f0e8',
  margin: 0,
}

const daysRow = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
}

const dayChip = {
  padding: '8px 16px',
  background: '#1a1a1a',
  border: '1px solid #2a2725',
  borderRadius: 8,
  color: '#88807a',
  fontFamily: "'Inter', sans-serif",
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s',
}

const dayChipActive = {
  background: 'rgba(198,40,40,0.15)',
  borderColor: 'rgba(198,40,40,0.5)',
  color: '#C62828',
  fontWeight: 600,
}

const closedBtn = {
  width: '100%',
  padding: '12px 36px',
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
  marginTop: 20,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
}

const closedBtnDisabled = {
  background: '#8B1A1A',
  cursor: 'not-allowed',
}

export default AdminPanel
