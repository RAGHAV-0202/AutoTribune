import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, ArrowLeft, Newspaper, Share } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Sidebar } from "@/components/Sidebar";

interface Article {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  published_at: string;
  slug: string;
}

export default function Article() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!slug) {
        console.log('No article slug provided');
        navigate('/');
        return;
      }

      console.log('Fetching article with slug:', slug);

      try {
        const { data, error } = await supabase
          .from('articles')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();

        if (error) {
          console.error('Error fetching article:', error);
          toast({
            title: "Error",
            description: "Failed to load article",
            variant: "destructive",
          });
          return;
        }

        if (!data) {
          toast({
            title: "Not Found",
            description: "Article not found",
            variant: "destructive",
          });
          navigate('/');
          return;
        }

        setArticle(data);
        
        // Fetch related articles
        const { data: related } = await supabase
          .from('articles')
          .select('*')
          .neq('slug', slug)
          .order('published_at', { ascending: false })
          .limit(10);
        
        setRelatedArticles(related || []);
      } catch (error) {
        console.error('Error:', error);
        toast({
          title: "Error",
          description: "Failed to load article",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [slug, navigate]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-muted rounded mb-6"></div>
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <nav className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-12 text-sm">
            <div className="flex items-center space-x-6">
              <span>WORLD</span>
              <span>PROFIT</span>
              <span>BQ</span>
              <span>MOVIES</span>
              <span>CRICKET</span>
              <span>FOOD</span>
              <span>LIFESTYLE</span>
              <span>HEALTH</span>
              <span>TECH</span>
              <span>GAMES</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate('/')}
            >
              <Newspaper className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">AutoTribune</h1>
            </div>
            
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Left Sidebar - Related News */}
          <div className="w-80 flex-shrink-0">
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-lg p-4">
                <h2 className="font-bold text-lg mb-4">Related News</h2>
                <div className="space-y-4">
                  {relatedArticles.slice(0, 5).map((relatedArticle, index) => (
                    <div
                      key={relatedArticle.id}
                      onClick={() => navigate(`/article/${relatedArticle.slug}`)}
                      className="cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors"
                    >
                      <h3 className="font-medium text-sm leading-tight hover:text-primary transition-colors mb-1">
                        {relatedArticle.title.length > 60 ? relatedArticle.title.substring(0, 60) + '...' : relatedArticle.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(relatedArticle.published_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Article Content */}
          <div className="flex-1">
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{formatDate(article.published_at)}</span>
                  </div>
                  <Button variant="outline" size="sm">
                    <Share className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
                
                <h1 className="text-4xl font-bold mb-6 text-foreground leading-tight">
                  {article.title}
                </h1>
                
                {article.image_url && (
                  <div className="aspect-video w-full overflow-hidden rounded-lg mb-6">
                    <img 
                      src={article.image_url} 
                      alt={article.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div className="prose prose-lg max-w-none">
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap text-lg">
                    {article.content}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="w-80 flex-shrink-0">
            <Sidebar 
              articles={relatedArticles.slice(5)} 
              onArticleClick={(articleSlug) => navigate(`/article/${articleSlug}`)}
            />
          </div>
        </div>
      </main>
    </div>
  );
}