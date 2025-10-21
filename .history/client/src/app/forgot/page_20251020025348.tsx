'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FaArrowLeft, FaUser, FaEnvelope } from 'react-icons/fa'
import Image from 'next/image'
import { useVerifyUserMutation } from '@/state/api'
import '../login/login.css'

export default function OlvidarContrasenaPage() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const [verifyUser] = useVerifyUserMutation()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await verifyUser({ email, username }).unwrap()

      if (response.success) {
        router.push(`/verificar-codigo?id_usuario=${response.id_usuario}`)
      } else {
        setError(response.message || 'Error al verificar la información')
      }
    } catch (err: any) {
      console.error(err)
      setError(err?.data?.message || 'Error de conexión con el servidor')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-left">
          <button 
            onClick={() => router.push('/login')}
            className="back-button"
          >
            <FaArrowLeft className="back-icon" />
            Volver al Login
          </button>
          
          <h2 className="welcome-title">Recuperar Contraseña</h2>
          <p className="welcome-subtitle">
            Ingresa tu información para verificar tu identidad
          </p>
          
          {error && (
            <div className="error-message">
              <strong>⚠️ Error:</strong> {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="form">
            <div className="input-group">
              <FaEnvelope className="input-icon" />
              <input
                type="email"
                placeholder="Correo electrónico registrado"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="input-group">
              <FaUser className="input-icon" />
              <input
                type="text"
                placeholder="Nombre de usuario exacto"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            
            <button 
              type="submit" 
              className="submit-button" 
              disabled={isLoading}
            >
              {isLoading ? "Verificando..." : "Verificar Identidad"}
            </button>
          </form>

          <div className="security-notice">
            <h4>🔒 Medidas de Seguridad</h4>
            <ul>
              <li>Se enviará un código de verificación a tu correo</li>
              <li>El código expira en 5 minutos</li>
              <li>Máximo 3 intentos fallidos antes del bloqueo</li>
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