import { Link } from "@tanstack/react-router";
import amazingflyLogo from "@/assets/amazingfly-logo.jpeg";

export function Logo({ className = "h-11 w-11" }: { className?: string }) {
  return (
    <Link to="/" className="flex items-center gap-3" aria-label="Amazingfly.ng home">
      <img
        src={amazingflyLogo}
        alt="Amazingfly Travels logo"
        className={`${className} rounded-full object-cover`}
        width={44}
        height={44}
      />
      <span className="flex flex-col leading-tight">
        <span className="text-base font-extrabold tracking-tight text-navy">Amazingfly Travels</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange">
          Amazingfly.ng
        </span>
      </span>
    </Link>
  );
}
