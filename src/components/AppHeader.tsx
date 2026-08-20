import { BookmarkIcon, FlameIcon, InfoIcon, SearchIcon } from '../icons';
import { Brand } from './Brand';

export type ViewMode = 'explore' | 'saved' | 'cooked';

interface AppHeaderProps {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onAbout: () => void;
  savedCount: number;
  cookedCount: number;
}

export function AppHeader({
  view,
  onViewChange,
  onAbout,
  savedCount,
  cookedCount,
}: AppHeaderProps) {
  return (
    <header className="topbar">
      <button
        className="brand-button"
        type="button"
        onClick={() => onViewChange('explore')}
      >
        <Brand compact />
      </button>
      <nav className="topnav" aria-label="Primary navigation">
        <button
          type="button"
          className={
            view === 'explore' ? 'topnav__item is-active' : 'topnav__item'
          }
          onClick={() => onViewChange('explore')}
        >
          <SearchIcon />
          <span>Explore</span>
        </button>
        <button
          type="button"
          className={
            view === 'saved' ? 'topnav__item is-active' : 'topnav__item'
          }
          onClick={() => onViewChange('saved')}
        >
          <BookmarkIcon filled={view === 'saved'} />
          <span>Saved</span>
          {savedCount > 0 ? <b>{savedCount}</b> : null}
        </button>
        <button
          type="button"
          className={
            view === 'cooked' ? 'topnav__item is-active' : 'topnav__item'
          }
          onClick={() => onViewChange('cooked')}
        >
          <FlameIcon filled={view === 'cooked'} />
          <span>Cooked</span>
          {cookedCount > 0 ? <b>{cookedCount}</b> : null}
        </button>
        <button type="button" className="topnav__item" onClick={onAbout}>
          <InfoIcon />
          <span>About</span>
        </button>
      </nav>
    </header>
  );
}
