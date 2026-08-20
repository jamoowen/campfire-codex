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
      <h2 id="about-title">A recipe index. No consent circus.</h2>
      <p>
        Find something to cook without being followed around the internet by a
        saucepan you glanced at once. No account, no adverts, no pop-up asking
        for a life story.
      </p>
      <div className="about-grid">
        <section>
          <h3>No sign-up quest</h3>
          <p>
            Save recipes, mark your victories and hand out stars. It stays on
            this device. No inbox ritual required.
          </p>
        </section>
        <section>
          <h3>No advert ambush</h3>
          <p>
            No autoplaying videos, affiliate maze or banner ad parked between
            you and dinner.
          </p>
        </section>
        <section>
          <h3>No tracking</h3>
          <p>
            No cookie-consent theatre because there is no tracking scheme to
            consent to. A rare administrative victory.
          </p>
        </section>
        <section>
          <h3>The recipes stay theirs</h3>
          <p>
            Ingredients are here to help you search. The full recipe lives with
            its author, where it belongs.
          </p>
        </section>
      </div>
      <div className="about-security">
        <ShieldIcon />
        <span>
          Dinner is difficult enough. Finding it should not require a privacy
          policy, a password or a minor act of faith.
        </span>
      </div>
    </Modal>
  );
}
