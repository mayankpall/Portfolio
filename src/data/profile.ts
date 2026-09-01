export const profile = {
  name: 'Mayank Pal',
  initials: 'MP',
  role: 'Full-stack engineer',
  // The one line that has to do the work. Concrete, not adjectival.
  positioning:
    'I build products end to end — React and React Native on the front, Node and Python behind it, shipped to real users.',
  location: 'India',
  status: {
    available: true,
    label: 'Open to full-time roles — 2026',
  },
  email: 'mayankpal9654@gmail.com',
  phone: '+91 70825 19168',
  resume: '/Mayank_pal_Resume.pdf',

  education: {
    institution: 'SRM University',
    place: 'Kattankulathur, Tamil Nadu',
    degree: 'B.Tech, Computer Science',
    cgpa: '8.77',
    from: 'June 2021',
    to: 'May 2025',
  },

  links: {
    github: 'https://github.com/mayankpall',
    linkedin: 'https://www.linkedin.com/in/mayankpall/',
    twitter: 'https://x.com/mayankkpall',
    leetcode: 'https://leetcode.com/mayankpall',
    codechef: 'https://www.codechef.com/users/mayankpall',
  },

  // Grouped for the typographic index. Ordered by depth, not alphabetically.
  stack: [
    {
      label: 'Languages',
      items: ['TypeScript', 'JavaScript', 'Python', 'C++', 'Java', 'SQL', 'C'],
    },
    {
      label: 'Frontend',
      items: ['React', 'React Native', 'Expo', 'Tailwind CSS', 'HTML', 'CSS'],
    },
    {
      label: 'Backend',
      items: ['Node.js', 'Express', 'Spring Boot', 'REST APIs', 'JWT', 'Socket.io'],
    },
    {
      label: 'Data',
      items: ['MongoDB', 'MySQL', 'SQLite'],
    },
    {
      label: 'Practice',
      items: ['Git', 'GitHub Actions', 'AWS', 'Unit & contract testing', 'Linux'],
    },
  ],

  meta: {
    title: 'Mayank Pal — Full-stack engineer',
    description:
      'Full-stack engineer. React, React Native, Node and Python. Building RecurTrack, a recurring-payments app for Indian households. CodeChef global rank 35.',
  },
} as const;
