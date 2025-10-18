'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FaUser, FaLock } from 'react-icons/fa'
import Image from 'next/image'

export default function RegisterPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      const res = await fetch("http://localhost:5000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (data.success) {
        localStorage.setItem("token", data.token)
        router.push("/dashboard")
      } else {
        setError(data.message || "Error al registrar")
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
          <p className="welcome-subtitle">Regístrate en <span>Co-Ingenio</span></p>
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
              <FaLock className="input-icon" />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="submit-button">Registrarse</button>
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
