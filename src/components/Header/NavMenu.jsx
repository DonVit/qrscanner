const links = [
  { label: 'Bonuri', href: '#' },
  { label: 'Statistics', href: '#stats' },
];

export default function NavMenu({ mobile = false, onClickLink }) {
  return (
    <nav className={mobile ? 'flex flex-col gap-3' : 'flex gap-4'}>
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          onClick={(event) => {
            if (onClickLink) {
              onClickLink();
            }
            if (link.href === '#stats') {
              window.location.hash = '#stats';
            } else {
              window.location.hash = '';
            }
            event.preventDefault();
          }}
          className="hover:text-gray-700 dark:hover:text-gray-300"
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}
