import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [modoClaro, setModoClaro] = useState(() => localStorage.getItem('modoTema') === 'claro')

  useEffect(() => {
    document.body.classList.toggle('light-mode-body', modoClaro)
    localStorage.setItem('modoTema', modoClaro ? 'claro' : 'escuro')
  }, [modoClaro])

  const toggleTheme = () => setModoClaro(v => !v)

  return (
    <ThemeContext.Provider value={{ modoClaro, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
