/**
 * _dev gallery section for diagrams: every bespoke kind with default labels,
 * plus data-driven samples, an ink band, a static diagram and Roman Urdu
 * labels. Any dev page can render <DiagramGallery /> as is.
 */
import { Diagram } from '../Diagram';
import styles from './gallery.module.css';
import { DIAGRAM_SAMPLES } from './samples';

export function DiagramGallery() {
  return (
    <section aria-labelledby="dev-diagrams">
      <h2 id="dev-diagrams" className={styles.h2}>
        Diagrams
      </h2>
      {DIAGRAM_SAMPLES.map((sample) =>
        sample.tone === 'ink' ? (
          <div key={sample.id} id={sample.id} className={styles.item}>
            {/* theme-ink is the Section theme class from globals.css; the diagram adapts on its own. */}
            <div className={`theme-ink ${styles.inkBand}`}>
              <p className={styles.itemTitle}>{sample.title}</p>
              <Diagram spec={sample.spec} caption={sample.caption} />
            </div>
          </div>
        ) : (
          <div key={sample.id} id={sample.id} className={styles.item}>
            <p className={styles.itemTitle}>{sample.title}</p>
            <Diagram spec={sample.spec} caption={sample.caption} />
          </div>
        ),
      )}
    </section>
  );
}
