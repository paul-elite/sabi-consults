import type { Metadata } from 'next'
import Image from 'next/image'
import { Archivo, Merriweather } from 'next/font/google'
import { getSettings } from '@/lib/settings'
import house from '../../../public/mbora/house.webp'
import s from './mbora.module.css'

// Built from Figma "Sabi - Mbora" (Sabi Consults, node 1:1228)

const archivo = Archivo({ subsets: ['latin'], display: 'swap', variable: '--font-archivo' })
const merriweather = Merriweather({
  subsets: ['latin'],
  style: 'italic',
  weight: 'variable',
  axes: ['opsz'],
  display: 'swap',
  variable: '--font-merriweather',
})

export const metadata: Metadata = {
  title: 'Mbora: off-plan prices',
  description: 'Off-plan duplexes and flats at Mbora, Abuja, from ₦110 million.',
}

const units = [
  ['5 Bedroom Fully Detached Duplex with BQ', '₦220Million'],
  ['4 Bedroom Terrace Duplex with BQ', '₦136Million'],
  ['4 Bedroom Quad Duplex', '₦120Million'],
  ['3 Bedroom Block of Flats with BQ', '₦110Million'],
] as const

const ADDRESS = '3rd Floor, 137 Ademola Adetokunbo Crescent, Wuse 2, FCT-Abuja'

export default async function MboraPage() {
  const settings = await getSettings()
  const wa = (unit: string, price: string) =>
    `https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(`Hi, I'm interested in the ${unit} at Mbora (off-plan ${price}).`)}`

  return (
    <main className={`${s.page} ${archivo.variable} ${merriweather.variable}`}>
      <div className={s.frame}>
        <article className={s.flyer} aria-label="Mbora off-plan prices">
          {/* layers in Figma's order, bottom to top */}
          <div className={`${s.abs} ${s.house}`}>
            <Image src={house} alt="The Mbora duplex at dusk, lit from inside, with a car in the garage" priority sizes="(max-width: 1080px) 102vw, 1101px" quality={90} />
          </div>

          <h1 className={`${s.abs} ${s.title}`}>Mbora</h1>
          <div className={`${s.abs} ${s.footer}`} />
          <div className={`${s.abs} ${s.band}`} aria-hidden>
            <img src="/mbora/band.svg" alt="" />
          </div>
          <div className={`${s.abs} ${s.lower}`} />
          <div className={`${s.abs} ${s.pattern}`} aria-hidden>
            {[
              [528.01, -4920.01, 'pattern'],
              [264.01, -2460.01, 'pattern'],
              [-263.99, 2459.99, 'pattern'],
              [-527.99, 4919.99, 'pattern-end'],
            ].map(([x, y, f]) => (
              <div
                key={y}
                className={`${s.abs} ${s.patternRow}`}
                style={{ left: `calc(50% + ${x} * var(--u))`, top: `calc(50% + ${y} * var(--u))` }}
              >
                <img src={`/mbora/${f}.svg`} alt="" />
              </div>
            ))}
          </div>

          <header className={`${s.abs} ${s.header}`}>
            <a href="/" aria-label="Sabi Consults home">
              <img className={s.logo} src="/logo.svg" alt="Sabi Consults Ltd" />
            </a>
            <a className={s.site} href="https://sabiconsults.com.ng">
              <img src="/mbora/globe.svg" alt="" />
              www.sabiconsults.com.ng
            </a>
          </header>

          <div className={`${s.abs} ${s.fade}`} />

          <footer className={`${s.abs} ${s.contacts}`}>
            <a className={s.address} href={`https://maps.google.com/?q=${encodeURIComponent(ADDRESS)}`} target="_blank" rel="noopener noreferrer">
              <img src="/mbora/pin.svg" alt="" />
              <span>{ADDRESS}</span>
            </a>
            <div className={s.links}>
              <a className={s.link} href="https://sabiconsults.com.ng">
                <img src="/mbora/web.svg" alt="" />
                sabiconsults.com.ng
              </a>
              <a className={s.link} href="https://instagram.com/sabi_consults" target="_blank" rel="noopener noreferrer">
                <img src="/mbora/instagram.svg" alt="" />
                sabi_consults
              </a>
            </div>
          </footer>

          <div className={`${s.abs} ${s.footMask}`} aria-hidden>
            <img src="/mbora/footer-mask.svg" alt="" />
          </div>
          <section className={`${s.abs} ${s.offer}`} aria-label="Off plan prices">
            <h2 className={s.badge}>OFF PLAN PRICES</h2>
            <ul className={s.rows}>
              {[units.slice(0, 2), units.slice(2)].map((pair, i) => (
                <li key={i} className={s.row}>
                  {pair.map(([unit, price]) => (
                    <a key={unit} className={s.card} href={wa(unit, price)} target="_blank" rel="noopener noreferrer" aria-label={`${unit}, ${price}. Enquire on WhatsApp`}>
                      <p className={s.name}>{unit}</p>
                      <p className={s.price}>{price}</p>
                    </a>
                  ))}
                </li>
              ))}
            </ul>
          </section>
        </article>
      </div>
    </main>
  )
}
