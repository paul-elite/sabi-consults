import { useId } from 'react'

/**
 * Formless-style sticker icons built from Hugeicons (Stroke Rounded) geometry.
 * Each recipe fills the original 24-unit outline with a gradient and wraps the
 * union of its shapes in a white sticker rim with a soft shadow.
 */

type Stop = string | [number, string, number?]
type ShapeOpts = { gloss?: number; edge?: string; grain?: number; dir?: [number, number, number, number] }
type Recipe = { defs: string; art: string; sticker: { d: string; w?: number; fill?: boolean }[] }

const SW = 3.4 // sticker rim stroke width (1.7 per side)
let n = 0

const lg = (id: string, stops: Stop[], x1 = 0.25, y1 = 0, x2 = 0.75, y2 = 1) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
  stops.map((c, i) => Array.isArray(c)
    ? `<stop offset="${c[0]}" stop-color="${c[1]}" stop-opacity="${c[2] ?? 1}"/>`
    : `<stop offset="${i / (stops.length - 1)}" stop-color="${c}"/>`).join('') +
  `</linearGradient>`

// A filled shape with gradient, top gloss, inner edge and optional grain.
function shape(u: string, d: string, stops: Stop[], o: ShapeOpts = {}) {
  const k = u + 'x' + (n++)
  const defs = lg(k + 'g', stops, ...(o.dir ?? [0.25, 0, 0.75, 1])) +
    `<clipPath id="${k}c"><path d="${d}"/></clipPath>` +
    lg(k + 'h', [[0, '#fff', o.gloss ?? 0.5], [0.55, '#fff', 0]], 0, 0, 0, 1)
  let s = `<path d="${d}" fill="url(#${k}g)"/><g clip-path="url(#${k}c)">`
  if (o.grain) s += `<rect x="-6" y="-6" width="36" height="36" filter="url(#${u}grain)" opacity="${o.grain}" style="mix-blend-mode:soft-light"/>`
  if (o.gloss !== 0) s += `<path d="${d}" fill="url(#${k}h)"/>`
  s += `<path d="${d}" fill="none" stroke="${o.edge ?? 'rgba(10,20,40,.16)'}" stroke-width="1"/></g>`
  return { defs, s }
}
const line = (d: string, c: string, w = 1.6, extra = '') =>
  `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`
const circ = (cx: number, cy: number, r: number) =>
  `M${cx + r} ${cy}a${r} ${r} 0 1 1 ${-2 * r} 0a${r} ${r} 0 1 1 ${2 * r} 0Z`

const P = {
  ig: 'M3 12C3 7.75736 3 5.63604 4.31802 4.31802C5.63604 3 7.75736 3 12 3C16.2426 3 18.364 3 19.682 4.31802C21 5.63604 21 7.75736 21 12C21 16.2426 21 18.364 19.682 19.682C18.364 21 16.2426 21 12 21C7.75736 21 5.63604 21 4.31802 19.682C3 18.364 3 16.2426 3 12Z',
  home: 'M3 11.9896V14.5C3 17.7998 3 19.4497 4.02513 20.4749C5.05025 21.5 6.70017 21.5 10 21.5H14C17.2998 21.5 18.9497 21.5 19.9749 20.4749C21 19.4497 21 17.7998 21 14.5V11.9896C21 10.3083 21 9.46773 20.6441 8.74005C20.2882 8.01237 19.6247 7.49628 18.2976 6.46411L16.2976 4.90855C14.2331 3.30285 13.2009 2.5 12 2.5C10.7991 2.5 9.76689 3.30285 7.70242 4.90855L5.70241 6.46411C4.37533 7.49628 3.71179 8.01237 3.3559 8.74005C3 9.46773 3 10.3083 3 11.9896Z',
  tower: 'M3 22V6.71724C3 4.20649 3 2.95111 3.79118 2.32824C4.58237 1.70537 5.74742 2.04355 8.07752 2.7199L13.0775 4.17122C14.4836 4.57937 15.1867 4.78344 15.5933 5.33965C16 5.89587 16 6.65344 16 8.16857V22Z',
  annex: 'M16 10L18.1494 10.6448C19.5226 11.0568 20.2092 11.2628 20.6046 11.7942C21 12.3256 21 13.0425 21 14.4761V22H16Z',
  bdoor: 'M12 22V19C12 18.0572 12 17.5858 11.7071 17.2929C11.4142 17 10.9428 17 10 17H9C8.05719 17 7.58579 17 7.29289 17.2929C7 17.5858 7 18.0572 7 19V22Z',
  pin: 'M13.6177 21.367C13.1841 21.773 12.6044 22 12.0011 22C11.3978 22 10.8182 21.773 10.3845 21.367C6.41302 17.626 1.09076 13.4469 3.68627 7.37966C5.08963 4.09916 8.45834 2 12.0011 2C15.5439 2 18.9126 4.09916 20.316 7.37966C22.9082 13.4393 17.599 17.6389 13.6177 21.367Z',
  map: 'M5.25345 4.19584L4.02558 4.90813C3.03739 5.48137 2.54329 5.768 2.27164 6.24483C2 6.72165 2 7.30233 2 8.46368V16.6283C2 18.1542 2 18.9172 2.34226 19.3418C2.57001 19.6244 2.88916 19.8143 3.242 19.8773C3.77226 19.9719 4.42148 19.5953 5.71987 18.8421C6.60156 18.3306 7.45011 17.7994 8.50487 17.9435C8.98466 18.009 9.44231 18.2366 10.3576 18.6917L14.1715 20.588C14.9964 20.9982 15.004 21 15.9214 21H18C19.8856 21 20.8284 21 21.4142 20.4013C22 19.8026 22 18.8389 22 16.9117V10.1715C22 8.24423 22 7.2806 21.4142 6.68188C20.8284 6.08316 19.8856 6.08316 18 6.08316H15.9214C15.004 6.08316 14.9964 6.08139 14.1715 5.6712L10.8399 4.01463C9.44884 3.32297 8.75332 2.97714 8.01238 3.00117C7.27143 3.02521 6.59877 3.41542 5.25345 4.19584Z',
  mapL: 'M8 3C7.27 3.03 6.6 3.42 5.25 4.2L4.03 4.91C3.04 5.48 2.54 5.77 2.27 6.24C2 6.72 2 7.3 2 8.46V16.63C2 18.15 2 18.92 2.34 19.34C2.57 19.62 2.89 19.81 3.24 19.88C3.77 19.97 4.42 19.6 5.72 18.84C6.5 18.39 7.25 17.92 8 17.9Z',
  mapM: 'M8 3C8.75 2.99 9.45 3.32 10.84 4.01L14.17 5.67C14.55 5.86 14.78 5.98 15 6.03V20.97C14.78 20.92 14.56 20.79 14.17 20.59L10.36 18.69C9.44 18.24 8.98 18.01 8.5 17.94C8.33 17.92 8.17 17.9 8 17.9Z',
  mapR: 'M15 6.03C15.25 6.08 15.5 6.08 15.92 6.08H18C19.89 6.08 20.83 6.08 21.41 6.68C22 7.28 22 8.24 22 10.17V16.91C22 18.84 22 19.8 21.41 20.4C20.83 21 19.89 21 18 21H15.92C15.5 21 15.25 21 15 20.97Z',
  shield: 'M18.7088 3.49534C16.8165 2.55382 14.5009 2 12 2C9.4991 2 7.1835 2.55382 5.29116 3.49534C4.36318 3.95706 3.89919 4.18792 3.4496 4.91378C3 5.63965 3 6.34248 3 7.74814V11.2371C3 16.9205 7.54236 20.0804 10.173 21.4338C10.9067 21.8113 11.2735 22 12 22C12.7265 22 13.0933 21.8113 13.8269 21.4338C16.4576 20.0804 21 16.9205 21 11.2371L21 7.74814C21 6.34249 21 5.63966 20.5504 4.91378C20.1008 4.18791 19.6368 3.95706 18.7088 3.49534Z',
  phone: 'M4.91 3H6.42C6.98 3 7.45 3.45 7.57 3.99C7.7 4.58 7.89 5.27 8.06 5.84C8.28 6.57 8.09 7.36 7.55 7.9L6.6 8.85C8.2 11.9 12 15.8 15.15 17.4L16.04 16.51C16.61 15.94 17.46 15.77 18.23 16.01C18.76 16.18 19.4 16.36 20 16.47C20.55 16.57 21 17.02 21 17.58V19.09C21 20.2 20.1 21.11 18.99 20.99C10.6 20.06 3.94 13.4 3.01 5.01C2.89 3.9 3.8 3 4.91 3Z',
  env: 'M2.01577 13.4756C2.08114 16.5412 2.11383 18.0739 3.24496 19.2094C4.37608 20.3448 5.95033 20.3843 9.09883 20.4634C11.0393 20.5122 12.9607 20.5122 14.9012 20.4634C18.0497 20.3843 19.6239 20.3448 20.7551 19.2094C21.8862 18.0739 21.9189 16.5412 21.9842 13.4756C22.0053 12.4899 22.0053 11.5101 21.9842 10.5244C21.9189 7.45886 21.8862 5.92609 20.7551 4.79066C19.6239 3.65523 18.0497 3.61568 14.9012 3.53657C12.9607 3.48781 11.0393 3.48781 9.09882 3.53656C5.95033 3.61566 4.37608 3.65521 3.24495 4.79065C2.11382 5.92608 2.08114 7.45885 2.01576 10.5244C1.99474 11.5101 1.99475 12.4899 2.01577 13.4756Z',
  cal: 'M13 4H11C7.22876 4 5.34315 4 4.17157 5.17157C3 6.34315 3 8.22876 3 12V14C3 17.7712 3 19.6569 4.17157 20.8284C5.34315 22 7.22876 22 11 22H13C16.7712 22 18.6569 22 19.8284 20.8284C21 19.6569 21 17.7712 21 14V12C21 8.22876 21 6.34315 19.8284 5.17157C18.6569 4 16.7712 4 13 4Z',
  file: 'M20 13.3431V10C20 6.22876 20 4.34315 18.8284 3.17157C17.6569 2 15.7712 2 12 2C8.22877 2 6.34315 2 5.17157 3.17157C4 4.34314 4 6.22876 4 10L4 14.5442C4 17.7892 4 19.4117 4.88607 20.5107C5.06508 20.7327 5.26731 20.9349 5.48933 21.1139C6.58831 22 8.21082 22 11.4558 22C12.1614 22 12.5141 22 12.8372 21.886C12.9044 21.8623 12.9702 21.835 13.0345 21.8043C13.3436 21.6564 13.593 21.407 14.0919 20.9081L18.8284 16.1716C19.4065 15.5935 19.6955 15.3045 19.8478 14.9369C20 14.5694 20 14.1606 20 13.3431Z',
  fold: 'M13 21.85V21C13 18.1716 13 16.7574 13.8787 15.8787C14.7574 15 16.1716 15 19 15H19.85Z',
  key: 'M15.5 14.5C18.8137 14.5 21.5 11.8137 21.5 8.5C21.5 5.18629 18.8137 2.5 15.5 2.5C12.1863 2.5 9.5 5.18629 9.5 8.5C9.5 9.38041 9.68962 10.2165 10.0303 10.9697L2.5 18.5V21.5H5.5V19.5H7.5V17.5H9.5L13.0303 13.9697C13.7835 14.3104 14.6196 14.5 15.5 14.5Z',
  walletTop: 'M14 3H5C3.89543 3 3 3.89543 3 5C3 6.10457 3.89543 7 5 7H18C18 6.07003 18 5.60504 17.8978 5.22354C17.6204 4.18827 16.8117 3.37962 15.7765 3.10222C15.395 3 14.93 3 14 3Z',
  wallet: 'M3 5V15C3 17.8284 3 19.2426 3.87868 20.1213C4.75736 21 6.17157 21 9 21H15C17.8284 21 19.2426 21 20.1213 20.1213C21 19.2426 21 17.8284 21 15V13C21 10.1716 21 8.75736 20.1213 7.87868C19.2426 7 17.8284 7 15 7H5C3.9 7 3 6.1 3 5Z',
  pocket: 'M21 12H19C18.535 12 18.3025 12 18.1118 12.0511C17.5941 12.1898 17.1898 12.5941 17.0511 13.1118C17 13.3025 17 13.535 17 14C17 14.465 17 14.6975 17.0511 14.8882C17.1898 15.4059 17.5941 15.8102 18.1118 15.9489C18.3025 16 18.535 16 19 16H21Z',
  squircle: 'M12 1.5C19.6 1.5 22.5 4.4 22.5 12C22.5 19.6 19.6 22.5 12 22.5C4.4 22.5 1.5 19.6 1.5 12C1.5 4.4 4.4 1.5 12 1.5Z',
  paper: 'M16 3.5H11C10.07 3.5 9.60504 3.5 9.22354 3.60222C8.18827 3.87962 7.37962 4.68827 7.10222 5.72354C7 6.10504 7 6.57003 7 7.5V18C7 19.3807 5.88071 20.5 4.5 20.5H16C18.8284 20.5 20.2426 20.5 21.1213 19.6213C22 18.7426 22 17.3284 22 14.5V9.5C22 6.67157 22 5.25736 21.1213 4.37868C20.2426 3.5 18.8284 3.5 16 3.5Z',
  tab: 'M7 7.5H6C4.11438 7.5 3.17157 7.5 2.58579 8.08579C2 8.67157 2 9.61438 2 11.5V18C2 19.3807 3.11929 20.5 4.5 20.5C5.88071 20.5 7 19.3807 7 18V7.5Z',
  bookL: 'M7.99978 3.5H6.60021C4.43183 3.5 3.34764 3.5 2.67399 4.17362C2.00034 4.84724 2.00029 5.93144 2.00021 8.09982L2 13.3998C1.99992 15.5684 1.99987 16.6526 2.67353 17.3263C3.34719 18 4.43146 18 6.6 18H8.95042C10.4329 18 11.7092 19.0464 11.9999 20.5V5.5C11.0556 4.24097 9.99989 3.5 7.99978 3.5Z',
  bookR: 'M16.0001 3.5H17.3997C19.5681 3.5 20.6523 3.5 21.3259 4.17362C21.9996 4.84724 21.9996 5.93144 21.9997 8.09982L21.9999 13.3998C22 15.5684 22 16.6526 21.3264 17.3263C20.6527 18 19.5684 18 17.3999 18H15.0495C13.567 18 12.2907 19.0464 12 20.5V5.5C12.9443 4.24097 14 3.5 16.0001 3.5Z',
  star: 'M13.7276 3.44418L15.4874 6.99288C15.7274 7.48687 16.3673 7.9607 16.9073 8.05143L20.0969 8.58575C22.1367 8.92853 22.6167 10.4206 21.1468 11.8925L18.6671 14.3927C18.2471 14.8161 18.0172 15.6327 18.1471 16.2175L18.8571 19.3125C19.417 21.7623 18.1271 22.71 15.9774 21.4296L12.9877 19.6452C12.4478 19.3226 11.5579 19.3226 11.0079 19.6452L8.01827 21.4296C5.8785 22.71 4.57865 21.7522 5.13859 19.3125L5.84851 16.2175C5.97849 15.6327 5.74852 14.8161 5.32856 14.3927L2.84884 11.8925C1.389 10.4206 1.85895 8.92853 3.89872 8.58575L7.08837 8.05143C7.61831 7.9607 8.25824 7.48687 8.49821 6.99288L10.258 3.44418C11.2179 1.51861 12.7777 1.51861 13.7276 3.44418Z',
  flash: 'M5.22576 11.3294L12.224 2.34651C12.7713 1.64397 13.7972 2.08124 13.7972 3.01707V9.96994C13.7972 10.5305 14.1995 10.985 14.6958 10.985H18.0996C18.8729 10.985 19.2851 12.0149 18.7742 12.6706L11.776 21.6535C11.2287 22.356 10.2028 21.9188 10.2028 20.9829V14.0301C10.2028 13.4695 9.80048 13.015 9.3042 13.015H5.90035C5.12711 13.015 4.71494 11.9851 5.22576 11.3294Z',
  wa: 'M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 13.3789 2.27907 14.6926 2.78382 15.8877C3.06278 16.5481 3.20226 16.8784 3.21953 17.128C3.2368 17.3776 3.16334 17.6521 3.01642 18.2012L2 22L5.79877 20.9836C6.34788 20.8367 6.62244 20.7632 6.87202 20.7805C7.12161 20.7977 7.45185 20.9372 8.11235 21.2162C9.30745 21.7209 10.6211 22 12 22Z',
  waHand: 'M8.58815 12.3773L9.45909 11.2956C9.82616 10.8397 10.2799 10.4153 10.3155 9.80826C10.3244 9.65494 10.2166 8.96657 10.0008 7.58986C9.91601 7.04881 9.41086 7 8.97332 7C8.40314 7 8.11805 7 7.83495 7.12931C7.47714 7.29275 7.10979 7.75231 7.02917 8.13733C6.96539 8.44196 7.01279 8.65187 7.10759 9.07169C7.51023 10.8548 8.45481 12.6158 9.91948 14.0805C11.3842 15.5452 13.1452 16.4898 14.9283 16.8924C15.3481 16.9872 15.558 17.0346 15.8627 16.9708C16.2477 16.8902 16.7072 16.5229 16.8707 16.165C17 15.8819 17 15.5969 17 15.0267C17 14.5891 16.9512 14.084 16.4101 13.9992C15.0334 13.7834 14.3451 13.6756 14.1917 13.6845C13.5847 13.7201 13.1603 14.1738 12.7044 14.5409L11.6227 15.4118',
} as const

const RECIPES = {
  home: (u: string): Recipe => {
    const a = shape(u, P.home, ['#6AAEFF', '#0055CC'])
    const door = 'M9.5 21.5V17.6C9.5 16.2 10.62 15 12 15C13.38 15 14.5 16.2 14.5 17.6V21.5Z'
    const b = shape(u, door, ['#FFE38A', '#F6AE2D'], { gloss: 0.4, edge: 'rgba(120,60,0,.18)' })
    return { defs: a.defs + b.defs, art: a.s + b.s, sticker: [{ d: P.home }] }
  },
  listings: (u: string): Recipe => {
    const an = shape(u, P.annex, ['#BFE7E4', '#79BDBF'])
    const tw = shape(u, P.tower, ['#80CACB', '#367F8C'])
    const dr = shape(u, P.bdoor, ['#2E4F78', '#18304F'], { gloss: 0.2 })
    return { defs: an.defs + tw.defs + dr.defs,
      art: an.s + tw.s + dr.s + line('M8 9L11 9M8 13L11 13', '#fff', 1.7) + line('M2.2 22L21.8 22', '#18304F', 1.8),
      sticker: [{ d: P.tower }, { d: P.annex }, { d: 'M2.2 22L21.8 22', w: 1.8, fill: false }] }
  },
  location: (u: string): Recipe => {
    const a = shape(u, P.pin, ['#FF928A', '#E2414B'])
    const dot = circ(12, 11, 3.6)
    return { defs: a.defs,
      art: a.s + `<path d="${circ(12, 11.35, 3.6)}" fill="rgba(120,10,20,.22)"/><path d="${dot}" fill="#fff"/>`,
      sticker: [{ d: P.pin }] }
  },
  map: (u: string): Recipe => {
    const l = shape(u, P.mapL, ['#F7A8FF', '#D46CF0'])
    const m = shape(u, P.mapM, ['#2F5596', '#1A2F61'], { gloss: 0.25 })
    const r = shape(u, P.mapR, ['#6DB4FF', '#2F7BEA'])
    return { defs: l.defs + m.defs + r.defs, art: l.s + m.s + r.s, sticker: [{ d: P.map }] }
  },
  verified: (u: string): Recipe => {
    const a = shape(u, P.shield, ['#62E3AE', '#0E9F6E'])
    return { defs: a.defs, art: a.s + line('M8.4 12.1L10.9 14.5L15.6 9.4', '#fff', 2.1), sticker: [{ d: P.shield }] }
  },
  clients: (u: string): Recipe => {
    const lb = 'M1.8 18C2 15.2 4.2 12.8 7 12.8C8.6 12.8 9.9 13.5 10.7 14.6L9 18Z'
    const rb = 'M22.2 18C22 15.2 19.8 12.8 17 12.8C15.4 12.8 14.1 13.5 13.3 14.6L15 18Z'
    const lh = circ(8.24, 6.75, 3.1), rh = circ(15.76, 6.75, 3.1)
    const cb = 'M5.5 20.5C5.73 17.6 8.18 15.17 11.19 15.03C11.44 15.02 11.71 15.01 12 15L12.81 15.05C15.84 15.25 18.27 17.57 18.5 20.5Z'
    const ch = circ(12, 9.25, 3.4)
    const g1 = ['#D4C8FF', '#9A86F7'], g2 = ['#8E6BFF', '#4F2FD8']
    const parts = [shape(u, lb, g1), shape(u, rb, g1), shape(u, lh, g1), shape(u, rh, g1), shape(u, cb, g2), shape(u, ch, g2)]
    return { defs: parts.map(p => p.defs).join(''), art: parts.map(p => p.s).join(''),
      sticker: [lb, rb, lh, rh, cb, ch].map(d => ({ d })) }
  },
  call: (u: string): Recipe => {
    const a = shape(u, P.phone, ['#6AAEFF', '#0055CC'])
    return { defs: a.defs, art: a.s, sticker: [{ d: P.phone }] }
  },
  whatsapp: (u: string): Recipe => {
    const a = shape(u, P.wa, ['#6BEB8F', '#13A84A'], { grain: 0.3 })
    return { defs: a.defs, art: a.s + line(P.waHand, '#fff', 1.75), sticker: [{ d: P.wa }] }
  },
  mail: (u: string): Recipe => {
    const a = shape(u, P.env, ['#FFB57E', '#F2615A'])
    return { defs: a.defs, art: a.s + line('M2.6 6.4L8.91302 9.91697C11.4616 11.361 12.5384 11.361 15.087 9.91697L21.4 6.4', '#fff', 1.8),
      sticker: [{ d: P.env }] }
  },
  calendar: (u: string): Recipe => {
    const k = u + 'cal'
    const defs = lg(k + 'w', ['#FFFFFF', '#E9ECF2']) + lg(k + 'r', ['#FF8076', '#E3434C']) +
      `<clipPath id="${k}c"><path d="${P.cal}"/></clipPath>` + lg(k + 'h', [[0, '#fff', 0.55], [1, '#fff', 0]], 0, 0, 0, 1)
    const art = `<path d="${P.cal}" fill="url(#${k}w)"/>` +
      `<g clip-path="url(#${k}c)"><rect x="2" y="3" width="20" height="7.2" fill="url(#${k}r)"/><rect x="2" y="3" width="20" height="4" fill="url(#${k}h)"/>` +
      `<path d="${P.cal}" fill="none" stroke="rgba(10,20,40,.12)" stroke-width="1"/></g>` +
      line('M16 2.3V6M8 2.3V6', '#3A3F4B', 1.9) +
      line('M10 18.5002L9.99999 13.8474C9.99999 13.6557 9.86325 13.5002 9.69458 13.5002H9M14 18.4983L15.4855 13.8923C15.4951 13.8626 15.5 13.8315 15.5 13.8002C15.5 13.6346 15.3657 13.5002 15.2 13.5002L13 13.5', '#2A2E37', 1.75)
    return { defs, art, sticker: [{ d: P.cal }, { d: 'M16 2.3V6M8 2.3V6', w: 1.9, fill: false }] }
  },
  search: (u: string): Recipe => {
    const k = u + 's'
    const lens = circ(11, 11, 8)
    const defs = lg(k + 'g', ['#F0FAFF', '#A6D6FF']) + lg(k + 'r', ['#3C64B0', '#16285A']) + lg(k + 'hd', ['#2A4785', '#0F1E45'])
    const art = `<path d="${lens}" fill="url(#${k}g)"/>` +
      `<path d="${lens}" fill="none" stroke="url(#${k}r)" stroke-width="2.6"/>` +
      line('M17.4 17.4L20.8 20.8', `url(#${k}hd)`, 3.4) +
      line('M7 10C7.5 8.3 8.8 7.1 10.5 6.7', '#fff', 1.3, 'opacity=".95"')
    return { defs, art, sticker: [{ d: lens, w: 2.6 }, { d: 'M17.4 17.4L20.8 20.8', w: 3.4, fill: false }] }
  },
  documents: (u: string): Recipe => {
    const a = shape(u, P.file, ['#72AEFF', '#2D6CE2'])
    const f = shape(u, P.fold, ['#E4F0FF', '#A8C8FA'], { gloss: 0, edge: 'rgba(20,50,120,.15)' })
    return { defs: a.defs + f.defs, art: a.s + f.s + line('M8 7L16 7M8 11L12 11', '#fff', 1.8), sticker: [{ d: P.file }] }
  },
  done: (u: string): Recipe => {
    const k = u + 'ok'
    const disc = circ(12, 12, 10)
    const defs = lg(k + 'w', ['#FFFFFF', '#EEF1F6']) + lg(k + 'b', ['#7AA7FF', '#3466E6'], 0, 0, 1, 1)
    const art = `<path d="${disc}" fill="url(#${k}w)" stroke="rgba(10,20,40,.06)" stroke-width=".6"/>` +
      `<circle cx="12" cy="12" r="6.8" fill="none" stroke="url(#${k}b)" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="33 10" transform="rotate(-58 12 12)"/>` +
      line('M8.2 12.4C8.2 12.4 9.7 13.3 10.5 14.6C10.5 14.6 12.9 9.6 16.2 7.8', '#FFC23D', 2.5)
    return { defs, art, sticker: [{ d: disc }] }
  },
  key: (u: string): Recipe => {
    const a = shape(u, P.key, ['#FFDC7E', '#EE9F12'], { edge: 'rgba(120,60,0,.2)' })
    return { defs: a.defs,
      art: a.s + `<path d="${circ(16.6, 7.6, 1.7)}" fill="rgba(120,60,0,.25)"/><path d="${circ(16.6, 7.3, 1.6)}" fill="#fff"/>`,
      sticker: [{ d: P.key }] }
  },
  wallet: (u: string): Recipe => {
    const t = shape(u, P.walletTop, ['#FFD685', '#F2A11A'], { gloss: 0.3 })
    const b = shape(u, P.wallet, ['#46D6BE', '#0B8A7A'])
    return { defs: t.defs + b.defs,
      art: t.s + b.s + `<path d="${P.pocket}" fill="#fff" opacity=".92"/><circle cx="19" cy="14" r=".85" fill="#0B8A7A"/>`,
      sticker: [{ d: P.walletTop }, { d: P.wallet }] }
  },
  analytics: (u: string): Recipe => {
    const a = shape(u, P.squircle, ['#FFA77A', '#F0533C'], { grain: 0.25 })
    const g = 'translate(12 12) scale(.66) translate(-12 -12)'
    return { defs: a.defs,
      art: a.s + `<g transform="${g}">` +
        `<path d="M8 17C11.53 17 18.91 15.53 18.7 6.43V21H8Z" fill="#fff" opacity=".22"/>` +
        line('M21 21H10C6.70017 21 5.05025 21 4.02513 19.9749C3 18.9497 3 17.2998 3 14V3', '#fff', 2.5) +
        line('M7.99707 16.999C11.5286 16.999 18.9122 15.5348 18.6979 6.43269M16.4886 8.04302L18.3721 6.14612C18.5656 5.95127 18.8798 5.94981 19.0751 6.14286L20.9971 8.04302', '#fff', 2.5) +
        `</g>`,
      sticker: [{ d: P.squircle }] }
  },
  insights: (u: string): Recipe => {
    const p = shape(u, P.paper, ['#FFFFFF', '#E8EBF1'], { gloss: 0, edge: 'rgba(10,20,40,.1)' })
    const t = shape(u, P.tab, ['#6AAEFF', '#0055CC'])
    return { defs: p.defs + t.defs,
      art: p.s + t.s + line('M10.5 8H18.5', '#2B303A', 1.9) + line('M10.5 12H13M16 12H18.5M10.5 16H13M16 16H18.5', '#A4ABB8', 1.6),
      sticker: [{ d: P.paper }, { d: P.tab }] }
  },
  guides: (u: string): Recipe => {
    const l = shape(u, P.bookL, ['#FFB45E', '#F07A1A'])
    const r = shape(u, P.bookR, ['#FFCD84', '#F59B36'])
    return { defs: l.defs + r.defs,
      art: l.s + r.s + line('M5 8H9M5 11.5H8.5M15 8H19M15.5 11.5H19', '#fff', 1.4, 'opacity=".85"'),
      sticker: [{ d: P.bookL }, { d: P.bookR }] }
  },
  featured: (u: string): Recipe => {
    const a = shape(u, P.star, ['#FFE786', '#F5A900'], { gloss: 0.7, edge: 'rgba(120,70,0,.2)' })
    return { defs: a.defs, art: a.s, sticker: [{ d: P.star }] }
  },
  flash: (u: string): Recipe => {
    const a = shape(u, P.flash, ['#7C5CFF', '#FF5FA2'], { grain: 0.5, dir: [0.2, 0, 0.8, 1] })
    return { defs: a.defs, art: a.s, sticker: [{ d: P.flash }] }
  },
  instagram: (u: string): Recipe => {
    const a = shape(u, P.ig, [[0, '#FFD776'], [0.35, '#FA7E1E'], [0.7, '#D62976'], [1, '#7B3FD0']], { grain: 0.3, dir: [0, 1, 1, 0] })
    return { defs: a.defs,
      art: a.s + `<path d="${circ(12, 12, 4)}" fill="none" stroke="#fff" stroke-width="1.9"/><circle cx="17.2" cy="6.8" r="1.15" fill="#fff"/>`,
      sticker: [{ d: P.ig }] }
  },
}

export type StickerName = keyof typeof RECIPES

function render(name: StickerName, u: string) {
  n = 0
  const { defs, art, sticker } = (RECIPES[name] as (u: string) => Recipe)(u)
  const rim = (stroke: string, extra: number) => sticker.map(s =>
    `<path d="${s.d}" fill="${s.fill === false ? 'none' : stroke}" stroke="${stroke}" stroke-width="${(s.w ?? 0) + SW + extra}" stroke-linejoin="round" stroke-linecap="round"/>`).join('')
  const grain = `<filter id="${u}grain" x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse">` +
    `<feTurbulence type="fractalNoise" baseFrequency="2.6" numOctaves="2" seed="7" stitchTiles="stitch"/>` +
    `<feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.6 -0.55"/></filter>`
  return `<defs>${grain}${defs}</defs><g>${rim('rgba(20,28,45,.09)', 0.55)}</g><g>${rim('#fff', 0)}</g>${art}`
}

// Markup is built once per icon with a placeholder prefix, then stamped with a per-instance id.
// Ids must be unique: if the first copy of a shared id sits inside a display:none parent,
// browsers fail to resolve its gradients and every other copy renders blank.
const PREFIX = '__st__'
const cache = new Map<StickerName, string>()

export default function StickerIcon({
  name,
  size = 48,
  className = '',
  label,
}: {
  name: StickerName
  size?: number
  className?: string
  /** Accessible name; omit when the icon is decorative. */
  label?: string
}) {
  const uid = 'st' + useId().replace(/[^a-zA-Z0-9_-]/g, '')
  let template = cache.get(name)
  if (!template) {
    template = render(name, PREFIX)
    cache.set(name, template)
  }
  const html = template.replaceAll(PREFIX, uid)
  return (
    <svg
      viewBox="-6 -6 36 36"
      width={size}
      height={size}
      className={`sticker-icon shrink-0 overflow-visible ${className}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
