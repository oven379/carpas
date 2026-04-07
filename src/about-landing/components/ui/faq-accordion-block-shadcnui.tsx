import { Badge } from "@/components/ui/badge";
import { BlurFade } from "@/components/ui/blur-fade";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

const faqs = [
  {
    question: "Покупатель увидит всё про меня?",
    answer:
      "Нет. Публичная ссылка предназначена для истории авто. Пароль и данные кабинета детейлинга не раскрываются.",
  },
  {
    question: "Что именно фиксируется при визите?",
    answer:
      "Дата/время, пробег, перечень работ (мойка/осмотр/полировка и т.д.), заметки, а также фото/документы при необходимости.",
  },
  {
    question: "Можно ли отозвать публичную ссылку?",
    answer:
      "В полной версии — да (отзыв токена). В текущем MVP ссылку можно пересоздать, и старую отключим на этапе бэкенда.",
  },
  {
    question: "Это приложение уже подключено к серверу?",
    answer:
      "Сейчас данные локальные (для прототипа). Но API‑контракт уже заложен — подключение сервера будет заменой режима с mock на real.",
  },
];

export function FAQAccordionBlock() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      className="relative w-full overflow-hidden bg-black px-4 py-16 md:py-24"
      aria-labelledby="faq-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(199,130,255,0.08),transparent_60%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-4xl">
        <div className="mb-10 text-center md:mb-14">
          <BlurFade inView className="mb-4 flex justify-center" delay={0} inViewMargin="-60px">
            <Badge>FAQ</Badge>
          </BlurFade>
          <BlurFade inView className="mb-3 block" delay={0.14} inViewMargin="-60px">
            <h2
              id="faq-heading"
              className="text-balance text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-[2.75rem] lg:leading-tight"
            >
              Часто задаваемые вопросы
            </h2>
          </BlurFade>
          <BlurFade inView className="block" delay={0.28} inViewMargin="-60px">
            <p className="mx-auto max-w-2xl text-pretty text-base text-white/55 md:text-lg">
              Кратко о приватности, визитах, ссылках и прототипе — если останутся вопросы, напишите нам после запуска.
            </p>
          </BlurFade>
        </div>

        <div className="space-y-3 md:space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <motion.div
                key={faq.question}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-20px" }}
                transition={{ delay: index * 0.06, duration: 0.35 }}
              >
                <Card className="overflow-hidden transition-all hover:border-[#C782FF]/25 hover:shadow-[0_4px_24px_rgba(199,130,255,0.06)]">
                  <motion.button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-[#C782FF]/[0.04] md:p-6"
                    whileTap={{ scale: 0.995 }}
                  >
                    <span className="text-[15px] font-semibold leading-snug text-white md:text-lg">
                      {faq.question}
                    </span>
                    <motion.span
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="flex shrink-0"
                      aria-hidden
                    >
                      <ChevronDown className="h-5 w-5 text-white/45" />
                    </motion.span>
                  </motion.button>

                  <AnimatePresence initial={false}>
                    {isOpen ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-white/[0.08] p-4 md:p-6 md:pt-5">
                          <p className="text-sm leading-relaxed text-white/65 md:text-base">
                            {faq.answer}
                          </p>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15, duration: 0.45 }}
          className="mt-12 flex flex-col items-stretch justify-center gap-3 sm:mt-16 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center"
        >
          <Link
            to="/auth"
            className={cn(
              "inline-flex w-full items-center justify-center font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C782FF]/45 sm:w-auto",
              "bg-[#C782FF] text-white shadow-[0_0_24px_rgba(199,130,255,0.28)] hover:brightness-110 hover:shadow-[0_0_32px_rgba(199,130,255,0.4)]",
              "h-16 rounded-[15px] px-6 text-[15px] leading-none no-underline sm:px-7",
            )}
          >
            Начать пользоваться
          </Link>
          <Link
            to="/auth/partner"
            className={cn(
              "inline-flex w-full items-center justify-center font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C782FF]/45 sm:w-auto",
              "border border-white/20 bg-white/[0.04] text-white backdrop-blur-sm hover:border-white/30 hover:bg-white/[0.08]",
              "h-16 rounded-[15px] px-6 text-[15px] leading-none no-underline sm:px-7",
            )}
          >
            Стать партнёром
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
