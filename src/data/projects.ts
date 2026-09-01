export interface Project {
  slug: string;
  index: string;
  title: string;
  year: string;
  /** One line, shown in the work list. No adjectives. */
  summary: string;
  /** The problem, in plain language. */
  problem: string;
  /** What was actually built and why it was built that way. */
  approach: string[];
  /** Hard numbers only. Omitted entirely rather than padded. */
  outcomes?: string[];
  stack: string[];
  role: string;
  status?: string;
  links: { label: string; href: string }[];
  /** Accent hue used for this project's case-study page. */
  hue: string;
}

export const projects: Project[] = [
  {
    slug: 'recurtrack',
    index: '01',
    title: 'RecurTrack',
    year: '2026',
    summary:
      'A recurring-payments manager for Indian households, designed so it never touches money.',
    problem:
      'Indian households run on recurring payments that no app handles well — subscriptions, costs split with family over UPI, and fixed monthly payments to people: house help, a driver, the newspaper, tuition. Existing tools either ignore the person-to-person half entirely or try to become a payment processor to solve it.',
    approach: [
      'Built a constraint into the architecture rather than the roadmap: RecurTrack never holds, receives, or moves money. Every payment flows directly between two people’s own UPI apps. The app calculates, reminds, and generates a pre-filled request — nothing more.',
      'That constraint is load-bearing. It keeps the product outside the RBI Payment Aggregator framework, which would otherwise impose licensing and capital requirements no independent project can meet. Anything requiring the backend to touch a bank account or hold a balance is off the table by design.',
      'React Native with Expo Router, where the file tree is the route tree. Domain logic — money rounding, billing-cycle maths, UPI deep-link construction — is isolated from UI and covered by tests, because rounding errors in shared costs are the kind of bug users never forgive.',
      'A Python service handles the scheduling and reminder side, kept deliberately thin so the phone stays the source of truth.',
    ],
    outcomes: [
      'Shipped to App Store review',
      'Domain test suite over money, cycles and UPI links',
      'Marketing and legal pages served free from GitHub Pages',
    ],
    stack: ['TypeScript', 'React Native', 'Expo', 'Python', 'SQLite', 'UPI deep links'],
    role: 'Sole engineer — architecture, product, release',
    status: 'In App Store review · source private',
    links: [{ label: 'recurtrack.mayankpal.co.in', href: 'https://recurtrack.mayankpal.co.in' }],
    hue: '#C6502D',
  },
  {
    slug: 'chatnest',
    index: '02',
    title: 'ChatNest',
    year: '2024',
    summary:
      'Real-time team chat built around temporary rooms rather than permanent groups.',
    problem:
      'Traditional chat apps assume groups are permanent. Project work is not — a room needed for three weeks becomes clutter for three years. ChatNest inverts the default: rooms are temporary unless you keep them.',
    approach: [
      'MERN stack with Socket.io handling the real-time layer — message delivery, presence, and membership changes all pushed rather than polled.',
      'JWT authentication guarding both the REST surface and the socket handshake, so an authenticated websocket cannot be opened with an unauthenticated token.',
      'Live presence indicators and dynamic member lists coordinated through React Context, so connection state has one owner instead of being duplicated across components.',
      'Interface built with Tailwind and DaisyUI, responsive from the start rather than retrofitted.',
    ],
    outcomes: ['Supports 500+ concurrent users', '30% increase in user engagement'],
    stack: ['React', 'Node.js', 'Express', 'MongoDB', 'Socket.io', 'JWT', 'Tailwind'],
    role: 'Sole engineer',
    links: [
      { label: 'Live', href: 'https://chat-app-tjsd.onrender.com/login' },
      { label: 'Source', href: 'https://github.com/mayankpall/chatappdeploy' },
    ],
    hue: '#3D6B8F',
  },
  {
    slug: 'training-ledger',
    index: '03',
    title: 'Training Ledger',
    year: '2026',
    summary:
      'An offline-first training log with no server, no account, and no network calls.',
    problem:
      'A training log is only useful if it opens instantly at the gym, where signal is bad and nobody wants to authenticate between sets. Every requirement pointed the same direction: remove the server.',
    approach: [
      'Rebuilt from a prototype that depended on a hosted storage API into a fully static site persisting to localStorage, so the app works completely offline once loaded.',
      'Made the trade-off explicit rather than hiding it: data lives only in the browser that wrote it, so export and backup are first-class features instead of an afterthought.',
      'Zero dependencies and zero build step — it deploys to GitHub Pages as plain files and costs nothing to run.',
    ],
    stack: ['JavaScript', 'localStorage', 'GitHub Pages'],
    role: 'Sole engineer',
    links: [{ label: 'Source', href: 'https://github.com/mayankpall/workout-log' }],
    hue: '#4A7C59',
  },
  {
    slug: 'newstap-typing',
    index: '04',
    title: 'NewsTap Typing',
    year: '2024',
    summary:
      'Typing practice against live news headlines instead of canned sample text.',
    problem:
      'Typing trainers drill you on text you would never actually type. Pulling live headlines makes the practice material real, and incidentally keeps you current.',
    approach: [
      'Integrated NewsAPI to source live headlines as practice passages, with handling for the empty and rate-limited cases so a failed fetch degrades instead of blanking the screen.',
      'Instrumented the full metric set — words per minute, accuracy, and per-character error counts — computed client side and surfaced as feedback rather than a bare score.',
      'Kept it dependency-free HTML, CSS and JavaScript so it loads instantly and runs anywhere.',
    ],
    stack: ['JavaScript', 'NewsAPI', 'HTML', 'CSS'],
    role: 'Sole engineer',
    links: [
      { label: 'Live', href: 'https://mayankpall.github.io/NewsTap-Typing/' },
      { label: 'Source', href: 'https://github.com/mayankpall/NewsTap-Typing' },
    ],
    hue: '#8A6D3B',
  },
];
