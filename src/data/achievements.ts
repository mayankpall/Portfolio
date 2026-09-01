export interface Achievement {
  value: string;
  unit?: string;
  label: string;
  detail: string;
  href?: string;
}

export const achievements: Achievement[] = [
  {
    value: '35',
    unit: 'th',
    label: 'CodeChef Starters 119',
    detail: 'Global rank, out of 24,000+ participants',
    href: 'https://www.codechef.com/users/mayankpall',
  },
  {
    value: '103',
    unit: 'rd',
    label: 'CodeChef Starters 123',
    detail: 'Global rank',
    href: 'https://www.codechef.com/users/mayankpall',
  },
  {
    value: '510',
    unit: 'th',
    label: 'CodeKaze 2024',
    detail: 'Out of 50,000+ nationally — Coding Ninjas',
  },
  {
    value: 'OCI',
    label: 'Oracle Cloud Infrastructure',
    detail: '2024 Foundations Associate',
    href: 'https://catalog-education.oracle.com/pls/certview/sharebadge?id=A023B38918F89151ACAA57574E83AC26807849AC73E8A6744625546E4EB509C2',
  },
];
