/**
 * _dev gallery section for screenshot frames. Uses ScreenPlaceholder until
 * the capture script (F4) uploads real screenshots; pass `shots` to show
 * real images instead (for example <CmsImage> elements keyed by frame).
 */
import type { ReactNode } from 'react';
import type { Frame } from '../../lib/cms/contract/cms-contract';
import styles from '../diagrams/gallery/gallery.module.css';
import { ScreenPlaceholder } from './ScreenPlaceholder';
import { Screenshot } from './Screenshot';

type Shots = Partial<Record<Exclude<Frame, 'none'> | 'none', ReactNode>>;

export function FramesGallery({ shots = {} }: { shots?: Shots }) {
  return (
    <section id="frames" aria-labelledby="dev-frames">
      <h2 id="dev-frames" className={styles.h2}>
        Screenshot frames
      </h2>
      <div className={styles.item}>
        <p className={styles.itemTitle}>browser + 3 callouts</p>
        <Screenshot
          frame="browser"
          url="app.nafaa.pk/pos"
          callouts={[
            { x: 18, y: 30, label: 'Search or scan a product' },
            { x: 62, y: 46, label: 'Cart with quantity and Discount' },
            { x: 84, y: 82, label: 'Pay and print the receipt' },
          ]}
          caption="Placeholder screen. Real screenshots come from the capture script."
        >
          {shots.browser ?? <ScreenPlaceholder shape="desktop" label="Browser screenshot" />}
        </Screenshot>
      </div>
      <div className={styles.item}>
        <p className={styles.itemTitle}>desktop</p>
        <Screenshot frame="desktop" title="Nafaa POS">
          {shots.desktop ?? <ScreenPlaceholder shape="desktop" label="Windows app screenshot" />}
        </Screenshot>
      </div>
      <div className={`${styles.item} ${styles.grid}`}>
        <div>
          <p className={styles.itemTitle}>phone + 2 callouts</p>
          <Screenshot
            frame="phone"
            callouts={[
              { x: 50, y: 20, label: 'Customer balance' },
              { x: 70, y: 88, label: 'Send a WhatsApp reminder' },
            ]}
          >
            {shots.phone ?? <ScreenPlaceholder shape="phone" label="Phone screenshot" />}
          </Screenshot>
        </div>
        <div>
          <p className={styles.itemTitle}>receipt</p>
          <Screenshot frame="receipt" caption="80 mm thermal receipt frame.">
            {shots.receipt ?? <ScreenPlaceholder shape="receipt" label="Receipt" />}
          </Screenshot>
        </div>
      </div>
      <div className={`${styles.item} ${styles.grid}`}>
        <div>
          <p className={styles.itemTitle}>tablet</p>
          <Screenshot frame="tablet">{shots.tablet ?? <ScreenPlaceholder shape="tablet" label="Tablet screenshot" />}</Screenshot>
        </div>
        <div>
          <p className={styles.itemTitle}>none</p>
          <Screenshot frame="none">{shots.none ?? <ScreenPlaceholder shape="desktop" label="Unframed screenshot" />}</Screenshot>
        </div>
      </div>
    </section>
  );
}
