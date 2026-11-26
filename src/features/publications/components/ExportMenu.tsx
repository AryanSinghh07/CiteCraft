import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import type { Publication } from '@/types';
import { Download, FileSpreadsheet, FileText, Braces, Printer, ChevronDown } from 'lucide-react';
import { CITATION_STYLES, type CitationStyle } from '../utils/citations';
import { exportBibliography, exportBibtex, exportCsv } from '../utils/exporters';

/** Download the whole library as CSV, BibTeX or a formatted reference list, or open the printable CV. */
const ExportMenu = ({ publications }: { publications: Publication[] }) => {
  const { toast } = useToast();
  const empty = publications.length === 0;

  const run = (label: string, action: () => void) => {
    action();
    toast({ title: `${label} downloaded`, description: `${publications.length} publications exported.` });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={empty}>
          <Download className="mr-2 h-4 w-4" />
          Export
          <ChevronDown className="ml-1 h-4 w-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Data</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => run('CSV', () => exportCsv(publications))}>
          <FileSpreadsheet className="mr-2 h-4 w-4" /> CSV (Excel, Sheets)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run('BibTeX', () => exportBibtex(publications))}>
          <Braces className="mr-2 h-4 w-4" /> BibTeX (.bib)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Reference list</DropdownMenuLabel>
        {(Object.keys(CITATION_STYLES) as CitationStyle[]).map(style => (
          <DropdownMenuItem
            key={style}
            onSelect={() => run(`${CITATION_STYLES[style]} references`, () => exportBibliography(publications, style))}
          >
            <FileText className="mr-2 h-4 w-4" /> {CITATION_STYLES[style]}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/cv">
            <Printer className="mr-2 h-4 w-4" /> Printable CV / PDF
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportMenu;
