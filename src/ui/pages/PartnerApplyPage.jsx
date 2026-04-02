import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BackNav, Button, Card, Field, Input } from '../components.jsx'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { setSessionDetailingId } from '../auth.js'
import { partnerApplyErrorMessage } from '../authPartnerMessages.js'

export default function PartnerApplyPage() {
  const r = useRepo()
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const nav = useNavigate()
  const loc = useLocation()
  const from = loc.state?.from || '/'

  return (
    <div className="container authPage">
      <div className="row spread gap authPage__head">
        <div>
          <div className="row gap wrap" style={{ alignItems: 'center' }}>
            <BackNav to="/auth" title="К выбору входа" />
            <h1 className="h1" style={{ margin: 0 }}>
              Стать партнёром
            </h1>
          </div>
          <p className="muted">
            Заявка на подключение детейлинга или СТО. Укажите название, контактную почту и телефон — в демо пароль для входа
            задаётся автоматически (<strong>1111</strong>). После отправки откроется заполнение профиля организации.
          </p>
        </div>
        <div className="row gap wrap" style={{ justifyContent: 'flex-end', alignItems: 'center' }}>
          <Link className="btn" data-variant="ghost" to="/">
            На главную
          </Link>
        </div>
      </div>

      <div className="authPage__single">
        <Card className="card pad">
          <div className="formGrid authFormGrid authFormGrid--owner">
            <Field className="field--full" label="Название">
              <Input
                className="input"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Например: Студия Детейлинг"
                autoComplete="organization"
              />
            </Field>
            <Field className="field--full" label="Почта">
              <Input
                className="input"
                type="email"
                autoComplete="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="studio@example.com"
              />
            </Field>
            <div className="partnerApplyRow">
              <Field label="Телефон" className="partnerApplyRow__phone">
                <Input
                  className="input"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="+7 …"
                />
              </Field>
              <div className="partnerApplyRow__submit">
                <Button
                  className="btn"
                  variant="primary"
                  onClick={() => {
                    const d = r.registerDetailing({
                      name: regName,
                      email: regEmail,
                      phone: regPhone,
                    })
                    if (d?.error) {
                      alert(partnerApplyErrorMessage(d.error))
                      return
                    }
                    setSessionDetailingId(d.id)
                    invalidateRepo()
                    nav('/detailing/settings', { replace: true })
                  }}
                >
                  Подать заявку
                </Button>
              </div>
            </div>
          </div>
          <p className="muted small" style={{ marginTop: 16 }}>
            Уже есть аккаунт?{' '}
            <Link className="link" to="/auth/partner" state={{ from }}>
              Вход партнёра
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
