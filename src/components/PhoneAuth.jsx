import { useState, useEffect, useCallback } from 'react'
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase'

const COUNTRIES = [
  { code: '+90', label: 'TR (+90)' },
  { code: '+1', label: 'US (+1)' },
  { code: '+44', label: 'UK (+44)' },
  { code: '+49', label: 'DE (+49)' },
  { code: '+33', label: 'FR (+33)' },
]

const PhoneAuth = ({ onAuthSuccess }) => {
  const [step, setStep] = useState('phone')
  const [countryCode, setCountryCode] = useState('+90')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmationResult, setConfirmationResult] = useState(null)

  const setupRecaptcha = useCallback(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      })
    }
  }, [])

  useEffect(() => {
    setupRecaptcha()
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear()
        window.recaptchaVerifier = null
      }
    }
  }, [setupRecaptcha])

  const checkOrCreateUser = async (user) => {
    const userDocRef = doc(db, 'users', user.uid)
    const userDoc = await getDoc(userDocRef)
    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        phoneNumber: user.phoneNumber,
        uid: user.uid,
        createdAt: serverTimestamp(),
      })
    }
  }

  const handleSendSms = async () => {
    setError('')
    const fullNumber = countryCode + phoneNumber.replace(/\s/g, '')
    if (!phoneNumber.trim() || fullNumber.length < 10) {
      setError('Geçerli bir telefon numarası giriniz.')
      return
    }
    setLoading(true)
    try {
      setupRecaptcha()
      const appVerifier = window.recaptchaVerifier
      const result = await signInWithPhoneNumber(auth, fullNumber, appVerifier)
      setConfirmationResult(result)
      setStep('verify')
    } catch (err) {
      console.error('SMS gönderme hatası:', err)
      switch (err.code) {
        case 'auth/invalid-phone-number':
          setError('Geçersiz telefon numarası.')
          break
        case 'auth/too-many-requests':
          setError('Çok fazla istek gönderildi. Lütfen biraz bekleyin.')
          break
        case 'auth/quota-exceeded':
          setError('SMS kotası doldu. Lütfen daha sonra tekrar deneyin.')
          break
        default:
          setError('SMS gönderilirken bir hata oluştu. Lütfen tekrar deneyin.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    setError('')
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Lütfen 6 haneli doğrulama kodunu giriniz.')
      return
    }
    setLoading(true)
    try {
      const result = await confirmationResult.confirm(verificationCode)
      await checkOrCreateUser(result.user)
      if (onAuthSuccess) onAuthSuccess(result.user)
    } catch (err) {
      console.error('Doğrulama hatası:', err)
      switch (err.code) {
        case 'auth/invalid-verification-code':
          setError('Geçersiz doğrulama kodu. Lütfen tekrar deneyin.')
          break
        case 'auth/code-expired':
          setError('Doğrulama kodunun süresi doldu. Lütfen tekrar SMS isteyin.')
          break
        default:
          setError('Doğrulama sırasında bir hata oluştu.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setStep('phone')
    setVerificationCode('')
    setError('')
    setConfirmationResult(null)
  }

  return (
    <div style={card}>
      <div id="recaptcha-container"></div>

      <div style={header}>
        <i className="fa-solid fa-shield-halved" style={{ color: '#C62828', fontSize: 20 }}></i>
        <h3 style={title}>
          {step === 'phone' ? 'Telefon ile Giriş' : 'Doğrulama Kodu'}
        </h3>
      </div>

      {step === 'phone' ? (
        <>
          <div style={phoneRow}>
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              style={select}
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code} style={{ background: '#1a1a1a' }}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              type="tel"
              placeholder="5xx xxx xx xx"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendSms()}
              style={input}
            />
          </div>
          {error && <p style={errorText}>{error}</p>}
          <button
            onClick={handleSendSms}
            disabled={loading}
            style={loading ? { ...btn, ...btnDisabled } : btn}
          >
            {loading ? (
              <><i className="fa-solid fa-spinner fa-spin"></i> Gönderiliyor...</>
            ) : (
              <><i className="fa-solid fa-envelope"></i> SMS Gönder</>
            )}
          </button>
        </>
      ) : (
        <>
          <p style={info}>
            <strong style={{ color: '#f5f0e8' }}>{countryCode}{phoneNumber}</strong> numarasına
            SMS ile 6 haneli doğrulama kodu gönderildi.
          </p>
          <div style={codeRow}>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="6 haneli kod"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyCode()}
              style={codeInput}
            />
          </div>
          {error && <p style={errorText}>{error}</p>}
          <button
            onClick={handleVerifyCode}
            disabled={loading}
            style={loading ? { ...btn, ...btnDisabled } : btn}
          >
            {loading ? (
              <><i className="fa-solid fa-spinner fa-spin"></i> Doğrulanıyor...</>
            ) : (
              <><i className="fa-solid fa-check"></i> Doğrula</>
            )}
          </button>
          <button
            onClick={handleReset}
            disabled={loading}
            style={backBtn}
          >
            <i className="fa-solid fa-arrow-left"></i> Farklı numara kullan
          </button>
        </>
      )}
    </div>
  )
}

const card = {
  maxWidth: 420,
  margin: '0 auto',
  padding: 32,
  background: '#111',
  borderRadius: 12,
  border: '1px solid #2a2725',
}

const header = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginBottom: 24,
}

const title = {
  fontFamily: "'Oswald', sans-serif",
  fontSize: 20,
  fontWeight: 500,
  color: '#f5f0e8',
  margin: 0,
}

const phoneRow = {
  display: 'flex',
  alignItems: 'stretch',
  border: '1px solid #2a2725',
  borderRadius: 8,
  background: '#1a1a1a',
  overflow: 'hidden',
  marginBottom: 4,
}

const select = {
  padding: '14px 10px',
  background: 'rgba(255,255,255,0.03)',
  border: 'none',
  borderRight: '1px solid #2a2725',
  color: '#f5f0e8',
  fontFamily: "'Inter', sans-serif",
  fontSize: 14,
  fontWeight: 600,
  outline: 'none',
  cursor: 'pointer',
  minWidth: 100,
}

const input = {
  flex: 1,
  padding: '14px 16px',
  background: 'transparent',
  border: 'none',
  color: '#f5f0e8',
  fontFamily: "'Inter', sans-serif",
  fontSize: 15,
  outline: 'none',
}

const codeRow = {
  border: '1px solid #2a2725',
  borderRadius: 8,
  background: '#1a1a1a',
  overflow: 'hidden',
  marginBottom: 4,
}

const codeInput = {
  width: '100%',
  padding: '14px 16px',
  background: 'transparent',
  border: 'none',
  color: '#f5f0e8',
  fontFamily: "'Inter', sans-serif",
  fontSize: 22,
  fontWeight: 600,
  textAlign: 'center',
  letterSpacing: 8,
  outline: 'none',
}

const errorText = {
  color: '#E53935',
  fontSize: 12,
  margin: '4px 0 12px',
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
  marginTop: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
}

const btnDisabled = {
  background: '#8B1A1A',
  cursor: 'not-allowed',
}

const info = {
  color: '#88807a',
  fontSize: 14,
  marginBottom: 20,
  lineHeight: 1.6,
}

const backBtn = {
  width: '100%',
  padding: '12px',
  background: 'transparent',
  color: '#88807a',
  border: 'none',
  borderRadius: 4,
  fontFamily: "'Inter', sans-serif",
  fontSize: 13,
  cursor: 'pointer',
  marginTop: 8,
  transition: 'color 0.3s',
}

export default PhoneAuth
