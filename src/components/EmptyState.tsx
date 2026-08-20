import type { ViewMode } from "./AppHeader";
import { BookmarkIcon, FlameIcon, SearchIcon } from "../icons";

export function EmptyState({ view, filtered }: { view: ViewMode; filtered: boolean }) {
  if (view === "saved") {
    return (
      <div className="empty-state">
        <BookmarkIcon />
        <h3>Your provisions bag is empty.</h3>
        <p>Save a recipe. Future you is famously unreliable.</p>
      </div>
    );
  }
  if (view === "cooked") {
    return (
      <div className="empty-state">
        <FlameIcon />
        <h3>No culinary victories recorded.</h3>
        <p>Cook something, then claim the credit before anyone asks questions.</p>
      </div>
    );
  }
  return (
    <div className="empty-state">
      <SearchIcon />
      <h3>{filtered ? "The dungeon contains no such beast." : "Nothing in the pantry."}</h3>
      <p>{filtered ? "Remove a filter or use fewer adjectives." : "Upload the private catalogue and try again."}</p>
    </div>
  );
}
