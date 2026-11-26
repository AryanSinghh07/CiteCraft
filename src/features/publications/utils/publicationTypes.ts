import type { Publication, PublicationType } from '@/types';

/** Everything the app needs to know about each kind of work, in one place. */
export interface PublicationTypeMeta {
  label: string;
  plural: string;
  short: string;
  /** what the venue field means for this type */
  venueLabel: string;
  /** BibTeX entry type used on export */
  bibtex: string;
  /** shown first for student accounts */
  student: boolean;
}

export const PUBLICATION_TYPES: Record<PublicationType, PublicationTypeMeta> = {
  journal: { label: 'Journal article', plural: 'Journal articles', short: 'Journal', venueLabel: 'Journal', bibtex: 'article', student: false },
  conference: { label: 'Conference paper', plural: 'Conference papers', short: 'Conference', venueLabel: 'Conference', bibtex: 'inproceedings', student: false },
  book: { label: 'Book', plural: 'Books', short: 'Book', venueLabel: 'Publisher', bibtex: 'book', student: false },
  chapter: { label: 'Book chapter', plural: 'Book chapters', short: 'Chapter', venueLabel: 'Book title', bibtex: 'incollection', student: false },
  thesis: { label: 'Thesis / dissertation', plural: 'Theses', short: 'Thesis', venueLabel: 'University', bibtex: 'phdthesis', student: true },
  project: { label: 'Project', plural: 'Projects', short: 'Project', venueLabel: 'Course or organisation', bibtex: 'misc', student: true },
  report: { label: 'Report', plural: 'Reports', short: 'Report', venueLabel: 'Institution', bibtex: 'techreport', student: true },
  preprint: { label: 'Preprint', plural: 'Preprints', short: 'Preprint', venueLabel: 'Repository (e.g. arXiv)', bibtex: 'misc', student: true },
  poster: { label: 'Poster / presentation', plural: 'Posters & presentations', short: 'Poster', venueLabel: 'Event', bibtex: 'misc', student: true },
  other: { label: 'Other', plural: 'Other work', short: 'Other', venueLabel: 'Venue', bibtex: 'misc', student: false },
};

export const PUBLICATION_TYPE_ORDER = Object.keys(PUBLICATION_TYPES) as PublicationType[];

/** Types that store their venue in the generic `venue` field. */
export const GENERIC_VENUE_TYPES: PublicationType[] = ['thesis', 'report', 'preprint', 'project', 'poster', 'other'];

/** The journal / conference / book / institution a work appeared in. */
export const venueOf = (p: Pick<Publication, 'journal' | 'conference' | 'book' | 'venue'>) =>
  p.journal || p.conference || p.book || p.venue || '';

/** Type options, with student-friendly types first for student accounts. */
export const typeOptions = (forStudent: boolean) =>
  forStudent
    ? [...PUBLICATION_TYPE_ORDER.filter(t => PUBLICATION_TYPES[t].student), ...PUBLICATION_TYPE_ORDER.filter(t => !PUBLICATION_TYPES[t].student)]
    : PUBLICATION_TYPE_ORDER;
