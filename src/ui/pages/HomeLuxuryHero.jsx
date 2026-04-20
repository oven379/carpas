import { Link } from 'react-router-dom'
import Logo from '../Logo.jsx'

/** Полноэкранный герой главной (гость): палитра и шрифт как в остальном приложении (`index.css` / `.btn`). */
export default function HomeLuxuryHero() {
  return (
    <div className="relative box-border flex h-full min-h-0 w-full flex-col overflow-hidden bg-[var(--bg)] [font-family:var(--sans)] antialiased">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,color-mix(in_oklab,var(--code-bg)_72%,white)_0%,transparent_55%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[color-mix(in_oklab,var(--code-bg)_50%,var(--bg))] via-[var(--bg)] to-[var(--bg)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-[20%] top-[18%] h-[42vh] w-[70vw] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--text-h)_10%,transparent),transparent)] blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-[15%] bottom-[12%] h-[38vh] w-[55vw] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_16%,transparent),transparent)] blur-3xl"
        aria-hidden="true"
      />
      {/* Низ: глубина + мягкие блики без линий */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[min(52vh,520px)] bg-gradient-to-t from-[color-mix(in_oklab,var(--code-bg)_78%,var(--bg))] via-[color-mix(in_oklab,var(--border)_28%,transparent)] to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-[-18%] left-1/2 aspect-square w-[min(120vw,720px)] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_22%,transparent),transparent_72%)] blur-3xl opacity-70"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-[2%] left-[8%] aspect-square w-[min(55vw,380px)] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--text-h)_10%,transparent),transparent_65%)] blur-3xl opacity-50"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_85%_70%_at_50%_108%,transparent_52%,color-mix(in_oklab,var(--bg)_55%,black)_100%)] opacity-75"
        aria-hidden="true"
      />

      <div className="relative z-10 box-border flex min-h-0 flex-1 flex-col items-center justify-center px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <div
            className="mb-8 h-px w-12 bg-gradient-to-r from-transparent via-[color-mix(in_oklab,var(--accent)_55%,transparent)] to-transparent sm:mb-10 sm:w-16"
            aria-hidden="true"
          />
          <div className="mb-5 flex w-full justify-center sm:mb-7 [&_img]:!h-[clamp(52px,12.5vw,132px)]">
            <Logo tagline={false} size={128} className="max-w-full" />
          </div>
          <p className="muted mt-2 max-w-md text-[clamp(0.8rem,2.2vw,0.9375rem)] font-normal leading-relaxed">
            Для тех, кто любит свой автомобиль
          </p>

          <div className="homeLandingHub mt-12 w-full max-w-md sm:mt-14">
            <Link className="btn authHub__btn authHub__btn--cta" to="/auth/owner">
              Войти
            </Link>
            <Link className="btn authHub__btn authHub__btn--neutral" to="/auth/owner?register=1">
              Регистрация
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
