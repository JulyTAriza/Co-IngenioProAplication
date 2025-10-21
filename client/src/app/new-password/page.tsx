// app/nueva-contrasena/page.tsx
'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FaArrowLeft, FaLock, FaEye, FaEyeSlash, FaCheck } from 'react-icons/fa'
import Image from 'next/image'
import { useResetPasswordMutation } from '@/state/api'
import '../login/login.css'

function NuevaContrasenaContent() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [resetPassword] = useResetPasswordMutation()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    if (!token) {
      setError('Token de seguridad no encontrado')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setIsLoading(true)

    try {
      const response = await resetPassword({ 
        token_reset: token,
        password 
      }).unwrap()

      if (response.success) {
        setIsSuccess(true)
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      } else {
        setError(response.message || 'Error al restablecer la contraseña')
      }
    } catch (err: any) {
      console.error(err)
      setError(err?.data?.message || 'Error de conexión con el servidor')
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="login-wrapper">
        <div className="login-card">
          <div className="login-left">
            <div className="error-container">
              <h2 className="welcome-title">Error de Seguridad</h2>
              <p className="error-message">
                Token de seguridad no válido o expirado.
              </p>
              <button 
                onClick={() => router.push('/forgot')}
                className="submit-button"
              >
                Iniciar Proceso Nuevamente
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="login-wrapper">
        <div className="login-card">
          <div className="login-left">
            <div className="success-container">
              <div className="success-icon">
                <FaCheck size={48} />
              </div>
              <h2 className="welcome-title">¡Contraseña Actualizada!</h2>
              <p className="success-message">
                Tu contraseña ha sido restablecida exitosamente.
              </p>
              <p className="success-submessage">
                Serás redirigido al inicio de sesión en unos segundos...
              </p>
              <button 
                onClick={() => router.push('/login')}
                className="submit-button"
              >
                Ir al Inicio de Sesión
              </button>
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

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-left">
          <button 
            onClick={() => router.push('/verification')}
            className="back-button"
          >
            <FaArrowLeft className="back-icon" />
            Volver Atrás
          </button>
          
          <h2 className="welcome-title">Nueva Contraseña</h2>
          <p className="welcome-subtitle">
            Crea una nueva contraseña segura para tu cuenta
          </p>
          
          {error && (
            <div className="error-message">
              <strong>⚠️ Error:</strong> {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="form">
            <div className="input-group password-group">
              <FaLock className="input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Nueva contraseña (mínimo 6 caracteres)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <div className="input-group password-group">
              <FaLock className="input-icon" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirmar nueva contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <div className="password-strength">
              <h4>Requisitos de Seguridad:</h4>
              <ul>
                <li className={password.length >= 6 ? 'valid' : ''}>
                  {password.length >= 6 ? '✅' : '❌'} Mínimo 6 caracteres
                </li>
                <li className={password === confirmPassword && password ? 'valid' : ''}>
                  {password === confirmPassword && password ? '✅' : '❌'} Contraseñas coinciden
                </li>
              </ul>
            </div>
            
            <button 
              type="submit" 
              className="submit-button" 
              disabled={isLoading || password.length < 6 || password !== confirmPassword}
            >
              {isLoading ? "Actualizando..." : "Establecer Nueva Contraseña"}
            </button>
          </form>

          <div className="security-tips">
            <h4>💡 Consejos para una Contraseña Segura</h4>
            <ul>
              <li>Usa una combinación de letras, números y símbolos</li>
              <li>Evita información personal fácil de adivinar</li>
              <li>No reutilices contraseñas de otros servicios</li>
              <li>Considera usar una frase memorable</li>
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
          <div className="completion-guide">
            <h3>Proceso Completo</h3>
            <div className="step completed">
              <span>✅</span>
              <p>Información verificada</p>
            </div>
            <div className="step completed">
              <span>✅</span>
              <p>Código validado</p>
            </div>
            <div className="step current">
              <span>🔐</span>
              <p>Nueva contraseña</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NuevaContrasenaPage() {
  return (
    <Suspense fallback={
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
    }>
      <NuevaContrasenaContent />
    </Suspense>
  )
}