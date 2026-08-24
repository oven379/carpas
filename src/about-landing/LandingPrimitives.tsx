import { useState } from 'react'

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
