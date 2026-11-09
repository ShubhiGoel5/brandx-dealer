import Image from 'next/image';
import CarArt from './CarArt.jsx';

/**
 * Car picture: the model's photo when there is one, otherwise the generated illustration.
 * Photos sit in a fixed-ratio box (no layout shift) and are resized/compressed by next/image.
 * `fit` is 'cover' for scene photos and 'contain' for cut-outs on a white background.
 */
export default function CarImage({ model, colour, alt, priority = false, sizes = '(max-width: 960px) 100vw, 640px', ratio = '4 / 3' }) {
  if (!model.photo) return <CarArt body={model.body} colour={colour ?? model.colours?.[0]?.hex} label={alt} />;
  return (
    <div className={`photo ${model.photo_fit === 'contain' ? 'cutout' : ''}`} style={{ aspectRatio: ratio }}>
      <Image src={model.photo} alt={alt} fill sizes={sizes} priority={priority} style={{ objectFit: model.photo_fit === 'contain' ? 'contain' : 'cover' }} />
    </div>
  );
}
