import type { ReactNode } from 'react'
import { useState } from 'react'
import { motion } from 'framer-motion'

export function HowStep({
  n,
  title,
  desc,
  showStem,
}: {
  n: string
  title: string
  desc: string
  showStem: boolean
}) {
  return (
    <div className="al-step">
      <div className="al-step__rail">
        <span className="al-step__num">{n}</span>
        {showStem ? <span className="al-step__stem" aria-hidden /> : null}
      </div>
      <div className="al-step__body">
        <h3 className="al-step__title">{title}</h3>
        <p className="al-step__desc">{desc}</p>
      </div>
    </div>
  )
}

export function TimelineItem({
  index,
  active,
  hasStem,
  muted,
  date,
  name,
  badge,
  text,
  footerLeft,
  footerRight,
}: {
  index: number
  active: boolean
  hasStem: boolean
  muted?: boolean
  date: string
  name: string
  badge: string
  text: string
  footerLeft?: ReactNode
  footerRight?: string
}) {
  return (
    <motion.div
      className={`al-tlItem${muted ? ' al-tlItem--faded' : ''}`}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.2, delay: index * 0.08 }}
      viewport={{ once: true }}
    >
      <div className="al-tlItem__rail">
        <span className={`al-tlItem__dot${active ? ' al-tlItem__dot--gold' : ' al-tlItem__dot--muted'}`} />
        {hasStem ? <span className="al-tlItem__stem" aria-hidden /> : null}
      </div>
      <div>
        <div className={`al-tlItem__date${active ? ' al-tlItem__date--gold' : ' al-tlItem__date--muted'}`}>{date}</div>
        <div className="al-tlCard">
          <div className="al-tlCard__top">
            <span className="al-tlCard__name">{name}</span>
            <span className="al-tlCard__badge">{badge}</span>
          </div>
          <p className="al-tlCard__text">{text}</p>
          {footerLeft != null && footerRight != null ? (
            <div className="al-tlCard__foot">
              <span className="al-tlCard__master">{footerLeft}</span>
              <span className="al-tlCard__status">{footerRight}</span>
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  )
}

export function FaqAccordion({ items }: { items: { question: string; answer: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  return (
    <div className="al-faq">
      {items.map((item, index) => {
        const isOpen = openIndex === index
        return (
          <div className="al-faq__item" key={item.question}>
            <button
              type="button"
              className="al-faq__q"
              aria-expanded={isOpen}
              onClick={() => setOpenIndex(isOpen ? null : index)}
            >
              <span>{item.question}</span>
              <span className={`al-faq__chev${isOpen ? ' al-faq__chev--open' : ''}`} aria-hidden="true">
                ⌄
              </span>
            </button>
            {isOpen ? <div className="al-faq__a">{item.answer}</div> : null}
          </div>
        )
      })}
    </div>
  )
}
