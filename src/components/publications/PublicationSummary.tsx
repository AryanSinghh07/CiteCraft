
import { useState } from 'react';
import { Publication, PublicationSummary as Summary } from '@/utils/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, Download, Printer } from 'lucide-react';
import { generatePublicationSummary } from '@/utils/publicationData';

interface PublicationSummaryProps {
  publications: Publication[];
}

const PublicationSummary = ({ publications }: PublicationSummaryProps) => {
  const [summary] = useState<Summary>(generatePublicationSummary(publications));
  const [activeTab, setActiveTab] = useState('overview');

  const COLORS = ['#4285F4', '#34A853', '#FBBC05', '#EA4335', '#8AB4F8'];

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const publicationText = publications.map(pub => {
      let citation = `${pub.authors.join(', ')}. (${pub.year}). ${pub.title}.`;
      if (pub.journal) citation += ` ${pub.journal}.`;
      if (pub.conference) citation += ` ${pub.conference}.`;
      if (pub.doi) citation += ` DOI: ${pub.doi}`;
      return citation;
    }).join('\n\n');

    const summaryText = `
Publication Summary
==================

Total Publications: ${summary.totalPublications}
Journal Articles: ${summary.journalArticles}
Conference Proceedings: ${summary.conferenceProceedings}
Books: ${summary.books}
Book Chapters: ${summary.bookChapters}
Other Publications: ${summary.other}
Total Citations: ${summary.citationCount}

Publication History by Year:
${Object.entries(summary.publicationsByYear)
  .sort(([yearA], [yearB]) => Number(yearA) - Number(yearB))
  .map(([year, count]) => `- ${year}: ${count} publications`)
  .join('\n')
}

Publications
===========

${publicationText}
`;

    const blob = new Blob([summaryText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'publication_summary.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Prepare chart data
  const yearData = Object.entries(summary.publicationsByYear)
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => Number(a.year) - Number(b.year));

  const typeData = [
    { name: 'Journal Articles', value: summary.journalArticles },
    { name: 'Conference Papers', value: summary.conferenceProceedings },
    { name: 'Books', value: summary.books },
    { name: 'Book Chapters', value: summary.bookChapters },
    { name: 'Other', value: summary.other }
  ].filter(item => item.value > 0);

  const journalData = Object.entries(summary.topJournals)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const conferenceData = Object.entries(summary.topConferences)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const coAuthorData = Object.entries(summary.coAuthors)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Publication Summary</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer size={16} className="mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download size={16} className="mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle>Publication Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Publications</p>
              <p className="text-2xl font-bold">{summary.totalPublications}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Journal Articles</p>
              <p className="text-2xl font-bold">{summary.journalArticles}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Conference Papers</p>
              <p className="text-2xl font-bold">{summary.conferenceProceedings}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Books</p>
              <p className="text-2xl font-bold">{summary.books}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Book Chapters</p>
              <p className="text-2xl font-bold">{summary.bookChapters}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Citations</p>
              <p className="text-2xl font-bold">{summary.citationCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="venues">Venues</TabsTrigger>
          <TabsTrigger value="collaborators">Collaborators</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="animate-fade-in">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle>Publication Distribution</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} publications`, 'Count']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="timeline" className="animate-fade-in">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle>Publication Timeline</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yearData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value} publications`, 'Count']} />
                    <Bar dataKey="count" name="Publications" fill="#4285F4" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="venues" className="animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle>Top Journals</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {journalData.length > 0 ? (
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={journalData}
                        layout="vertical"
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value) => [`${value} publications`, 'Count']} />
                        <Bar dataKey="count" name="Publications" fill="#34A853" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center">
                    <p className="text-muted-foreground">No journal data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle>Top Conferences</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {conferenceData.length > 0 ? (
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={conferenceData}
                        layout="vertical"
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value) => [`${value} publications`, 'Count']} />
                        <Bar dataKey="count" name="Publications" fill="#FBBC05" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center">
                    <p className="text-muted-foreground">No conference data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="collaborators" className="animate-fade-in">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle>Top Co-Authors</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {coAuthorData.length > 0 ? (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={coAuthorData}
                      layout="vertical"
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value) => [`${value} publications`, 'Count']} />
                      <Bar dataKey="count" name="Collaborations" fill="#EA4335" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  <p className="text-muted-foreground">No co-author data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <FileText size={20} />
            <span>Publication List</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {publications.map((pub, index) => (
              <div key={pub.id} className="space-y-2">
                <p className="text-base font-medium">{pub.title}</p>
                <p className="text-sm text-muted-foreground">
                  {pub.authors.join(', ')} ({pub.year})
                </p>
                <p className="text-sm text-muted-foreground">
                  {pub.journal || pub.conference || 'No venue information'}
                  {pub.doi && `, DOI: ${pub.doi}`}
                </p>
                {index < publications.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PublicationSummary;
