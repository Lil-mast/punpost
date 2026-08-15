export function Footer() {
  const links = ["Privacy", "Terms", "Changelog", "Support"];

  return (
    <footer className="border-t border-foreground/5 px-6 py-16 md:px-12 lg:px-16">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 md:flex-row md:items-center">
        <div className="text-lg font-semibold text-foreground/60">PunPost</div>

        <div className="flex flex-wrap gap-6">
          {links.map((link) => (
            <a
              key={link}
              href="#"
              className="text-sm text-foreground/40 transition-colors hover:text-foreground"
            >
              {link}
            </a>
          ))}
        </div>

        <p className="text-sm text-foreground/30">
          &copy; {new Date().getFullYear()} PunPost. Seriously punny content.
        </p>
      </div>
    </footer>
  );
}
