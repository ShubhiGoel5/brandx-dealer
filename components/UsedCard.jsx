import Link from 'next/link';
import CarArt from './CarArt.jsx';
import { inr, km } from '@/lib/format.js';

const COLOUR_HEX = { 'Pearl White': '#e9e7e1', 'Lunar Silver': '#b9bdc2', 'Graphite Grey': '#4b4f55', 'Obsidian Black': '#17181a', 'Ember Red': '#9b2226', 'Deep Ocean': '#243b6b', 'Forest Green': '#2f5d50' };
export const colourHex = (name) => COLOUR_HEX[name] ?? '#b9bdc2';

export function UsedCard({ car, t }) {
  const reserved = car.status === 'booked';
  return (
    <Link href={`/used/${car.slug}`} className="card" style={reserved ? { opacity: .9 } : undefined}>
      <div className="art"><CarArt body={car.body} colour={colourHex(car.colour)} label={`${car.year} ${car.model}`} /></div>
      <div className="body">
        <div className="spread" style={{ alignItems: 'flex-start' }}>
          <h3>{car.year} {car.model} {car.variant}</h3>
          {reserved && <span className="badge warn">{t('reserved')}</span>}
        </div>
        <div className="facts"><span>{km(car.km)}</span><span>{car.fuel}</span><span>{car.transmission}</span></div>
        <div className="price">{inr(car.price)}</div>
      </div>
    </Link>
  );
}
