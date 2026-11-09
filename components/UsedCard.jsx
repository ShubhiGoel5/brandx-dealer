import Link from 'next/link';
import CarImage from './CarImage.jsx';
import { inr, km } from '@/lib/format.js';

const COLOUR_HEX = { 'Pearl White': '#e9e7e1', 'Lunar Silver': '#b9bdc2', 'Graphite Grey': '#4b4f55', 'Obsidian Black': '#17181a', 'Ember Red': '#9b2226', 'Deep Ocean': '#243b6b', 'Forest Green': '#2f5d50' };
export const colourHex = (name) => COLOUR_HEX[name] ?? '#b9bdc2';

export function UsedCard({ car, t }) {
  const reserved = car.status === 'booked';
  return (
    <Link href={`/used/${car.slug}`} className="card" style={reserved ? { opacity: .9 } : undefined}>
      <div className="art"><CarImage model={{ body: car.body, photo: car.model_photo, photo_fit: car.model_photo_fit }} colour={colourHex(car.colour)} alt={`${car.year} ${car.model}`} sizes="(max-width: 700px) 100vw, 320px" /></div>
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
