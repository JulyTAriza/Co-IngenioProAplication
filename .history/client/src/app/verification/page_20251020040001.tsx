'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FaArrowLeft, FaClock } from 'react-icons/fa'
import Image from 'next/image'
import { useVerifyCodeMutation } from '@/state/api'
import '../login/login.css'

function VerificarCodigoContent() {
  const [codigo, setCodigo] = useState(['', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutos en segundos
  const [intentos, setIntentos] = useState(0)
  const [bloqueado, setBloqueado] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const idUsuario = searchParams.get('id_usuario')

  const [verifyCode] = useVerifyCodeMutation()

  const MAX_INTENTOS = 3

  // ⏱️ Contador regresivo del tiempo
  useEffect(() => {
    if (timeLeft <= 0) {
      setBloqueado(true)
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setBloqueado(true)
          return 0
        }
        return t - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleCodeChange = (index: number, value: string) => {
    if (bloqueado || success) return
    if (value.length > 1) return // Solo un carácter por input

    const newCodigo = [...codigo]
    newCodigo[index] = value
    setCodigo(newCodigo)

    // Autoenfocar siguiente input
    if (value && index < 3) {
      const nextInput = document.getElementById(`code-${index + 1}`)
      nextInput?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (bloqueado || success) return
    if (e.key === 'Backspace' && !codigo[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`)
      prevInput?.focus()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!idUsuario) {
      setError('ID de usuario no encontrado')
      return
    }

    const codigoCompleto = codigo.join('')

    if (codigoCompleto.length !== 4) {
      setError('Por favor ingresa el código completo de 4 dígitos')
      return
    }

    if (timeLeft <= 0) {
      setError('El código ha expirado. Solicita uno nuevo.')
      setBloqueado(true)
      return
    }

    if (bloqueado) {
      setError('Has excedido el número máximo de intentos. Solicita un nuevo código.')
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess(false)

    try {
      const response = await verifyCode({
        id_usuario: parseInt(idUsuario),
        codigo: codigoCompleto,
      }).unwrap()

      if (response.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push(`/nueva-contrasena?token=${response.token_reset}`)
        }, 2000)
      } else {
        const nuevoIntentos = intentos + 1
        setIntentos(nuevoIntentos)
        
        if (nuevoIntentos >= MAX_INTENTOS) {
          setBloqueado(true)
          setError(`Has excedido el número máximo de intentos (${MAX_INTENTOS}). Solicita un nuevo código.`)
        } else {
          setError(
            `${response.message || 'Código incorrecto'}. Te quedan ${MAX_INTENTOS - nuevoIntentos} intento(s).`
          )
        }
        
        // Limpiar los inputs después de un intento fallido
        setCodigo(['', '', '', ''])
        setTimeout(() => {
          document.getElementById('code-0')?.focus()
        }, 100)
      }
    } catch (err: any) {
      console.error(err)
      const nuevoIntentos = intentos + 1
      setIntentos(nuevoIntentos)
      
      if (nuevoIntentos >= MAX_INTENTOS) {
        setBloqueado(true)
        setError(`Has excedido el número máximo de intentos (${MAX_INTENTOS}). Solicita un nuevo código.`)
      } else {
        setError(
          `${err?.data?.message || 'Error de conexión con el servidor'}. Te quedan ${MAX_INTENTOS - nuevoIntentos} intento(s).`
        )
      }
      
      // Limpiar los inputs después de un intento fallido
      setCodigo(['', '', '', ''])
      setTimeout(() => {
        document.getElementById('code-0')?.focus()
      }, 100)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = () => {
    router.push('/olvidar-contrasena')
  }

  // 🧩 Validación: si no existe el ID del usuario
  if (!idUsuario) {
    return (
      <div className="login-wrapper">
        <div className="login-card">
          <div className="login-left">
            <div className="error-container">
              <h2 className="welcome-title">Error</h2>
              <p className="welcome-subtitle">
                No se encontró el ID de usuario. Por favor, inicia el proceso nuevamente.
              </p>
              <button
                onClick={() => router.push('/olvidar-contrasena')}
                className="submit-button"
              >
                Volver al Inicio
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 💡 Pantalla principal de verificación
  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-left">
          <button
            onClick={() => router.push('/olvidar-contrasena')}
            className="back-button"
          >
            <FaArrowLeft className="back-icon" />
            Volver Atrás
          </button>

          <h2 className="welcome-title">Verificación de Código</h2>
          <p className="welcome-subtitle">
            Ingresa el código de 4 dígitos que enviamos a tu correo
          </p>

          {error && (
            <div className="error-message">
              <strong>⚠️ Error:</strong> {error}
            </div>
          )}

          {success && (
            <div className="success-message">
              <strong>✅ ¡Código verificado!</strong> Redirigiendo...
            </div>
          )}

          <form onSubmit={handleSubmit} className="form">
            <div
              className={`timer-container ${
                timeLeft < 60 ? 'timer-warning' : ''
              }`}
            >
              <FaClock className="timer-icon" />
              <span className="timer-text">
                Tiempo restante: {formatTime(timeLeft)}
              </span>
            </div>

            <div className="code-inputs-container">
              {codigo.map((digit, index) => (
                <input
                  key={index}
                  id={`code-${index}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="code-input"
                  disabled={isLoading || bloqueado || success}
                  autoFocus={index === 0}
                />
              ))}
            </div>

            <button
              type="submit"
              className="submit-button"
              disabled={
                isLoading || bloqueado || codigo.join('').length !== 4 || success
              }
            >
              {isLoading ? 'Verificando...' : 'Verificar Código'}
            </button>
          </form>

          <div className="code-help">
            <p>¿No recibiste el código?</p>
            <button
              onClick={handleResendCode}
              className="resend-button"
              disabled={!bloqueado && timeLeft > 0 && !isLoading}
            >
              Solicitar nuevo código
            </button>
          </div>

          <div className="security-notice">
            <h4>📱 Información Importante</h4>
            <ul>
              <li>Revisa tu bandeja de entrada y spam</li>
              <li>El código es válido por 5 minutos</li>
              <li>
                Tienes {MAX_INTENTOS} intentos
                {intentos > 0 && !bloqueado && ` (${MAX_INTENTOS - intentos} restante${MAX_INTENTOS - intentos !== 1 ? 's' : ''})`}
              </li>
            </ul>
          </div>
        </div>

        <div className="login-right">
          <Image
            src="/assets/logo.png"
            alt="Logo Co-Ingenio"
            width={280}
            height={280}
            className="logo"
          />
        </div>
      </div>
    </div>
  )
}

// 🌐 Página principal con Suspense (fallback)
export default function VerificarCodigoPage() {
  return (
    <Suspense
      fallback={
        <div className="login-wrapper">
          <div className="login-card">
            <div className="login-left">
              <div className="loading-container">
                <div className="spinner"></div>
                <p>Cargando...</p>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <VerificarCodigoContent />
    </Suspense>
  )
}