export function Footer() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
        <p>KronoStore &copy; {new Date().getFullYear()} — Aprendizado Full-Stack</p>
      </div>
    </footer>
  );
}
