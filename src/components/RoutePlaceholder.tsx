import type { AppRoute } from '../types';

type RoutePlaceholderProps = {
  route: AppRoute;
  onNavigate: (route: AppRoute) => void;
};

const copy: Record<
  Exclude<AppRoute, 'home'>,
  { stage: string; title: string; body: string; bullets: string[] }
> = {
  daily: {
    stage: 'Day 3',
    title: 'Daily Check-In is next.',
    body: 'This route is reserved for the lightweight daily form that will feed experiments, streaks, and emotional signals back into Home.',
    bullets: [
      'mood, energy, clarity, and self-trust',
      'hours building and hours job-searching',
      'exercise and meaningful action',
    ],
  },
  career: {
    stage: 'Day 4',
    title: 'Career Log comes after the daily layer.',
    body: 'This route will capture applications, interviews, networking conversations, and role-fit notes so the search feels intentional instead of vague.',
    bullets: [
      'applications and interviews',
      'networking conversations',
      'aligned vs misaligned notes',
    ],
  },
  weekly: {
    stage: 'Day 5',
    title: 'Weekly Review is where the product becomes reflective.',
    body: 'This page will turn raw data into next-week intent by pairing energy patterns with honest prompts about avoidance and fit.',
    bullets: [
      'what gave energy',
      'what got avoided',
      'next week focus and runway note',
    ],
  },
  money: {
    stage: 'Day 6',
    title: 'Money gets its own route once the Home dashboard is stable.',
    body: 'The dedicated money screen will hold baseline assumptions, new snapshots, and edits without crowding the main dashboard.',
    bullets: [
      'latest snapshot',
      'edit target spend and threshold',
      'add future cash updates',
    ],
  },
};

export function RoutePlaceholder({ route, onNavigate }: RoutePlaceholderProps) {
  if (route === 'home') {
    return null;
  }

  const details = copy[route];

  return (
    <section className="placeholder-page feature-card">
      <p className="section-kicker">{details.stage}</p>
      <h2>{details.title}</h2>
      <p className="body-copy">{details.body}</p>
      <ul className="status-list">
        {details.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
      <div className="placeholder-actions">
        <button className="primary-button" type="button" onClick={() => onNavigate('home')}>
          Back to Home
        </button>
      </div>
    </section>
  );
}
