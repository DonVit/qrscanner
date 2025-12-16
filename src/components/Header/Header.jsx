import { useState } from 'react';
import Logo from './Logo';
import NavMenu from './NavMenu';
import AuthButtons from './AuthButtons';
import { Menu, X } from 'lucide-react';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-gray-800 border-b relative">
      <Logo />

      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center gap-6">
        <NavMenu />
        <AuthButtons />
      </div>

      {/* Mobile Menu Button */}
      <button
        className="md:hidden p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {menuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Navigation Drawer */}
      {menuOpen && (
        <div className="absolute top-full left-0 w-full bg-white dark:bg-gray-800 border-t shadow-md flex flex-col p-4 space-y-3 md:hidden z-50">
          <NavMenu mobile onClickLink={() => setMenuOpen(false)} />
          <AuthButtons />
        </div>
      )}
    </header>
  );
}
