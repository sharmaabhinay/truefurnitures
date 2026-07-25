import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="bg-[color:var(--brand-dark)] text-white pt-16 sm:pt-20 pb-8 px-6 md:px-10">
      <div className="max-w-6xl mx-auto grid gap-12 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="text-2xl font-display font-bold tracking-tight mb-3">True Furniture&apos;s</div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--brand-accent)] mb-5">Fully Customizable Furniture</p>
          <p className="text-white/40 text-sm font-light leading-relaxed">
            Bespoke sofas hand-tailored in Central India. Serving the discerning homes of Indore &amp; Ujjain since 2018.
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-accent)] mb-5">Studio</p>
          <ul className="space-y-3 text-sm text-white/60 font-light">
            <li><Link to="/collections" className="hover:text-white transition-colors">Collections</Link></li>
            <li><Link to="/about" className="hover:text-white transition-colors">The Atelier</Link></li>
            <li><Link to="/showrooms" className="hover:text-white transition-colors">Showrooms</Link></li>
            <li><Link to="/blog" className="hover:text-white transition-colors">Journal</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-accent)] mb-5">Company</p>
          <ul className="space-y-3 text-sm text-white/60 font-light">
            <li><Link to="/careers" className="hover:text-white transition-colors">Careers</Link></li>
            <li><Link to="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
            <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-accent)] mb-5">Connect</p>
          <ul className="space-y-3 text-sm text-white/60 font-light">
            <li><a href="https://instagram.com" className="hover:text-white transition-colors">Instagram</a></li>
            <li><a href="https://wa.me/917773896496" className="hover:text-white transition-colors">WhatsApp · +91 77738 96496</a></li>
            <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
            <li><a href="mailto:hello@truefurnitures.in" className="hover:text-white transition-colors">hello@truefurnitures.in</a></li>
          </ul>
        </div>
      </div>
      <div className="max-w-6xl mx-auto mt-14 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-white/30">
        <span>© {new Date().getFullYear()} True Furniture&apos;s · Hand-tailored in Indore &amp; Ujjain</span>
        <span>GST · 23ABCDE1234F1Z5</span>
      </div>
    </footer>
  );
}