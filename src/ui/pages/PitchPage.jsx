import { Seo } from '../../seo/Seo.jsx'
import PitchLanding from '../../about-landing/PitchLanding.tsx'

const title = 'КарПас — две стороны, одна история авто'
const description =
  'КарПас: детейлинг и СТО ведут историю обслуживания, клиент видит её в приложении, хранит фото работ и записывается в один тап.'

// Вариант лендинга из презентации — превью для сравнения, пока не индексируем.
export default function PitchPage() {
  return (
    <>
      <Seo title={title} description={description} canonicalPath="/pitch" noindex />
      <h1 className="srOnly">{title}</h1>
      <PitchLanding />
    </>
  )
}
