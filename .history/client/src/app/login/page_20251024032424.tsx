'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FaUser, FaLock } from 'react-icons/fa'
import Image from 'next/image'
import './login.css'

// Hook del API
import { useLoginMutation } from '@/state/api'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const [login, { isLoading }] = useLoginMutation()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      const res = await login({ username, password }).unwrap()

      if (res.success) {
        setError('')
        if (res.token) {
          localStorage.setItem('token', res.token)
          if (res.usuario) {
            localStorage.setItem('usuario', JSON.stringify(res.usuario))
          }
        }
        
        const rol = res.usuario?.rol
        
        if (rol === 'Administrador') {
          router.push('/dashboard')
        } else if (rol === 'Supervisor') {
          router.push('/proyectos')
        } else if (rol === 'Operario') {
          router.push('/cronograma')
        } else {
          router.push('/dashboard')
        }
      } else {
        setError(res.message || 'Credenciales no válidas')
      }
    } catch (err) {
      console.error(err)
      setError('Error de conexión con el servidor')
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const isExpired = payload.exp * 1000 < Date.now();

        if (!isExpired) {
          const usuarioGuardado = localStorage.getItem('usuario')
          if (usuarioGuardado) {
            const usuario = JSON.parse(usuarioGuardado)
            const rol = usuario.rol
            
            if (rol === 'Administrador') {
              router.push('/dashboard')
            } else if (rol === 'Supervisor') {
              router.push('/proyectos')
            } else if (rol === 'Operario') {
              router.push('/cronograma')
            } else {
              router.push('/dashboard')
            }
          } else {
            router.push('/dashboard')
          }
        } else {
          localStorage.removeItem("token")
          localStorage.removeItem("usuario")
        }
      } catch {
        localStorage.removeItem("token")
        localStorage.removeItem("usuario")
      }
    }
  }, [router])

  return (
    <div className="login-wrapper">
      <div className="login-card login-card-simple"> {/* ← Clase adicional */}
        <div className="login-left login-left-centered"> {/* ← Clase adicional */}
          <div> {/* ← Envuelve todo el contenido */}
            <h2 className="welcome-title">¡Bienvenido de nuevo!</h2>
            <p className="welcome-subtitle">
              Inicia sesión en <span>Co-Ingenio</span> para continuar
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
                {isLoading ? 'Cargando...' : 'Iniciar Sesión'}
              </button>
            </form>
            <div className="links">
              <a href="/olvidar-contrasena">¿Olvidaste tu contraseña?</a>
              <a href="/register">Registrarse</a>
            </div>
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