import { Badge } from "@/components/ui/badge";
import { BlurFade } from "@/components/ui/blur-fade";
import { BentoGrid, type BentoItem } from "@/components/ui/bento-grid";
import { Building2, Car, Link2, Wrench } from "lucide-react";

const ACCENT_ICON = "text-[#C782FF]";

const howItWorksItems: BentoItem[] = [
  {
    step: "01",
    title: "Добавляете авто в гараж",
    description:
      "Создайте карточку авто и храните историю обслуживания в одном месте",
    icon: <Car className={`h-5 w-5 ${ACCENT_ICON}`} strokeWidth={1.75} />,
    colSpan: 2,
    hasPersistentHover: true,
  },
  {
    step: "02",
    title: "Сервисы фиксируют визиты",
    description:
      "Детейлинг/СТО добавляет работы, пробег, фото и рекомендации — история становится «подтверждённой»",
    icon: <Wrench className={`h-5 w-5 ${ACCENT_ICON}`} strokeWidth={1.75} />,
    colSpan: 1,
  },
  {
    step: "03",
    title: "Делитесь ссылкой при необходимости",
    description:
      "Получатель открывает публичную страницу и читает историю без доступа к кабинету детейлинга",
    icon: <Link2 className={`h-5 w-5 ${ACCENT_ICON}`} strokeWidth={1.75} />,
    colSpan: 1,
  },
  {
    step: "04",
    title: "Сервисы получают инструмент",
    description:
      "Партнёры ведут историю работы и повышают доверие клиентов за счёт прозрачности",
    icon: <Building2 className={`h-5 w-5 ${ACCENT_ICON}`} strokeWidth={1.75} />,
    colSpan: 2,
  },
];

export default function HowItWorksSection() {
  return (
    <section
      className="relative border-t border-white/[0.06] bg-black py-20 sm:py-24"
      aria-labelledby="how-it-works-heading"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(199,130,255,0.12),transparent_55%)] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-12 max-w-2xl">
          <BlurFade inView className="mb-4 block" delay={0} inViewMargin="-80px">
            <Badge>КАРПАС</Badge>
          </BlurFade>
          <BlurFade inView className="mb-3 block" delay={0.12} inViewMargin="-80px">
            <h2
              id="how-it-works-heading"
              className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-tight"
            >
              Как это работает
            </h2>
          </BlurFade>
          <BlurFade inView className="mt-4 block" delay={0.24} inViewMargin="-80px">
            <p className="text-pretty text-base leading-relaxed text-white/55 sm:text-lg">
              Четыре шага от гаража до прозрачной истории авто — для владельцев и партнёров.
            </p>
          </BlurFade>
        </div>

        <BentoGrid items={howItWorksItems} className="p-0" />
      </div>
    </section>
  );
}
