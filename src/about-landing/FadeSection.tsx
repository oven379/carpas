import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

export function FadeSection({
  className,
  id,
  children,
}: {
  className?: string
  id?: string
  children: ReactNode
}) {
  return (
    <motion.section
      id={id}
      className={className}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      viewport={{ once: true, amount: 0.15 }}
    >
      {children}
    </motion.section>
  )
}
