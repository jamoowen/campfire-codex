import { CloseIcon, ShieldIcon } from '../icons';
import { Brand } from './Brand';
import { Modal } from './Modal';

export function AboutDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="about-title"
      className="about-dialog"
    >
      <button
        className="modal-close"
        type="button"
        onClick={onClose}
        aria-label="Close about panel"
      >
        <CloseIcon />
      </button>
      <Brand />
      <h2 id="about-title">
        A small recipe index with an unnecessarily dramatic fireplace.
      </h2>
      <p>
        The recipe catalogue lives in a private Cloudflare R2 bucket. Search
        results expose only the metadata needed for this interface. Full methods
        remain on each author or publisher's canonical page.
      </p>
      <div className="about-grid">
        <section>
          <h3>No account</h3>
          <p>
            Saved recipes, cooked history and ratings stay in this browser's
            localStorage.
          </p>
        </section>
        <section>
          <h3>No public data dump</h3>
          <p>
            The source JSON is ignored by Git and uploaded directly to private
            R2.
          </p>
        </section>
        <section>
          <h3>Bot-hostile by design</h3>
          <p>
            Strict robots rules, no-index headers, same-origin API checks and
            Worker rate limits.
          </p>
        </section>
        <section>
          <h3>No illusions</h3>
          <p>
            Anything a human browser can see can eventually be scraped. The goal
            is deterrence, not magic.
          </p>
        </section>
      </div>
      <div className="about-security">
        <ShieldIcon />
        <span>
          For maximum protection, enable Bot Fight Mode and block Search, Agent
          and Training crawlers in Cloudflare AI Crawl Control.
        </span>
      </div>
    </Modal>
  );
}
