'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FaUser, FaLock } from 'react-icons/fa'
import { MdEmail } from 'react-icons/md'
import Image from 'next/image'
import { useRegisterMutation } from '@/state/api'
import '../login/login.css' // se reutiliza el mismo estilo del login

export default function RegisterPage() {
  const [username, setUsername] = useState('')
  const [eMail, setEMail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const [register, { isLoading }] = useRegisterMutation()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      const res = await register({ username, password, e_mail: eMail }).unwrap()

      if (res.success) {
        if (res.token) {
          localStorage.setItem("token", res.token)
        }
        router.push("/login")
      } else {
        setError(res.message || "Error al registrar")
      }
    } catch (err) {
      console.error(err)
      setError("Error de conexión con el servidor")
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-left">
          <h2 className="welcome-title">Crear cuenta</h2>
          <p className="welcome-subtitle">
            Regístrate en <span>Co-Ingenio</span>
          </p>
          {error && <p className="error-message">{error}</p>}
          <form onSubmit={handleSubmit} className="form">
            <div className="input-group">
              <FaUser className="input-icon" />
              <input
                type="text"
                placeholder="Usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <MdEmail className="input-icon" />
              <input
                type="email"
                placeholder="Correo electrónico"
                value={eMail}
                onChange={(e) => setEMail(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <FaLock className="input-icon" />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="submit-button" disabled={isLoading}>
              {isLoading ? "Cargando..." : "Registrarse"}
            </button>
          </form>
          <div className="links">
            <a href="/login">¿Ya tienes cuenta? Inicia sesión</a>
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
