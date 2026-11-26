
import type { Profile, Publication } from '@/types';

/** Seed data for the demo account (demo mode only). */

export const sampleProfile: Profile = {
  id: '1',
  name: 'Aryan Singh',
  email: 'aryan@example.com',
  affiliation: 'University of Science & Technology',
  position: 'Associate Professor',
  department: 'Computer Science',
  bio: 'Researcher working on applied machine learning, NLP and AI for education.',
  researchInterests: ['Machine Learning', 'NLP', 'AI in Education'],
};

export const samplePublications: Publication[] = [
  {
    id: '1',
    title: 'Machine Learning Approaches for Predictive Analytics in Crops Disease',
    authors: ['Aryan Singh', 'Robert Johnson', 'Maria Garcia'],
    journal: 'Journal of Educational Predictive Analytics',
    year: 2024,
    doi: '10.1234/jedm.2024.09.001',
    abstract: 'This study explores various machine learning algorithms to predict Crope Disease and retention in higher education institutions.',
    citations: 12,
    type: 'journal',
    tags: ['machine learning', 'education', 'predictive analytics']
  },
  {
    id: '2',
    title: ' CBT (Cognitive Behavioural Therapy) chatbot for mental health',
    authors: ['Aryan Singh', 'Kartik Mitra'],
    conference: 'CBT (Cognitive Behavioural Therapy) chatbot',
    year: 2024,
    doi: '10.5678/iccc.2024.011.015',
    abstract: 'CBT (Cognitive Behavioural Therapy) chatbot designed to assist users in managing mental stress and anxiety.',
    citations: 8,
    type: 'conference',
    tags: ['Machine learning', 'Chatbot', 'education']
  },
  {
    id: '3',
    title: 'Advances in Natural Language Processing for Scientific Literature Analysis',
    authors: ['Aryan Singh', 'Michael Brown', 'Sophia Wang'],
    journal: 'Computational Linguistics Journal',
    year: 2023,
    doi: '10.9101/clj.2023.03.005',
    abstract: 'This paper reviews recent advances in NLP techniques specifically tailored for analyzing scientific literature across disciplines.',
    citations: 15,
    type: 'journal',
    tags: ['NLP', 'scientific literature', 'text mining']
  },
  {
    id: '4',
    title: 'Ethical Considerations in AI-Driven Educational Systems',
    authors: ['Aryan Singh', 'Elena Rodriguez'],
    book: 'Handbook of Artificial Intelligence in Education',
    year: 2021,
    doi: '10.1112/aie.2021.04.007',
    abstract: 'This chapter discusses ethical implications and considerations when deploying AI systems in educational contexts.',
    citations: 22,
    type: 'chapter',
    tags: ['AI ethics', 'education', 'policy']
  },
  {
    id: '5',
    title: 'Quantum Computing: Implications for Cryptography and Data Security',
    authors: ['Aryan Singh', 'Alex Chen', 'William Taylor'],
    journal: 'Journal of Quantum Information Science',
    year: 2022,
    doi: '10.3141/jqis.2022.05.012',
    abstract: 'We analyze how advances in quantum computing will impact current cryptographic methods and data security protocols.',
    citations: 18,
    type: 'journal',
    tags: ['quantum computing', 'cryptography', 'security']
  },
  {
    id: '6',
    title: 'Blockchain Technology for Academic Credential Verification',
    authors: ['Aryan Singh', 'Thomas Wilson'],
    conference: 'IEEE Blockchain Conference',
    year: 2021,
    doi: '10.7272/ieee-bc.2021.06.009',
    abstract: 'This paper proposes a blockchain-based system for verifying academic credentials and reducing certificate fraud.',
    citations: 10,
    type: 'conference',
    tags: ['blockchain', 'education', 'security']
  },
  {
    id: '7',
    title: 'The Future of Higher Education: A Computational Perspective',
    authors: ['Aryan Singh'],
    book: 'Computational Approaches to Educational Innovation',
    year: 2020,
    abstract: 'This book explores how computational methods are reshaping higher education systems globally.',
    citations: 45,
    type: 'book',
    tags: ['education', 'innovation', 'technology']
  }
];
