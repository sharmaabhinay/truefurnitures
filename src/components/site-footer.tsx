import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="bg-[color:var(--brand-dark)] text-white py-20 px-6 md:px-10">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
        <div className="max-w-xs">
          <div className="text-2xl font-display font-bold tracking-tight mb-6 uppercase">AVANT</div>
          <p className="text-white/40 text-sm font-light leading-relaxed">
            Defining the standard of custom-made furniture in Madhya Pradesh since 2018.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-16">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-accent)] mb-6">Studio</p>
            <ul className="space-y-3 text-sm text-white/60 font-light">
              <li><Link to="/collections" className="hover:text-white transition-colors">Collections</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors">The Atelier</Link></li>
              <li><Link to="/showrooms" className="hover:text-white transition-colors">Showrooms</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-accent)] mb-6">Connect</p>
            <ul className="space-y-3 text-sm text-white/60 font-light">
              <li><a href="https://instagram.com" className="hover:text-white transition-colors">Instagram</a></li>
              <li><a href="https://wa.me/919999999999" className="hover:text-white transition-colors">WhatsApp</a></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto mt-16 pt-8 border-t border-white/5 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-white/30">
        <span>© {new Date().getFullYear()} Avant-Garde Atelier</span>
        <span>Designed for Indore &amp; Ujjain</span>
      </div>
    </footer>
  );
}