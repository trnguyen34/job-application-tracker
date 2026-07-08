import { useTheme } from '../../lib/theme'

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const dark = theme === 'dark'
  return (
    <button
      className="theme-toggle"
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggle}
    >
      {dark ? '☀' : '☾'}
    </button>
  )
}
