const links = ['Scneaza', 'Lista'];

export default function NavMenu({ mobile = false, onClickLink }) {
  return (
    <nav className={mobile ? 'flex flex-col gap-3' : 'flex gap-4'}>
      {links.map(link => (
        <a key={link} href="#" onClick={onClickLink} className="hover:text-gray-700 dark:hover:text-gray-300">
          {link}
        </a>
      ))}
    </nav>
  );
}
